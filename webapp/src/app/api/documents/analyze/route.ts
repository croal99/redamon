import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import { z } from 'zod'
import { extractJson } from '@/lib/recon-preset-schema'
import { addHistory } from '../../history/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_FILE_BYTES = 25 * 1024 * 1024
const MAX_IMAGE_BYTES_INLINE = 8 * 1024 * 1024
const MAX_TEXT_CHARS_FOR_LLM = 45_000
const MAX_SHEET_ROWS_PREVIEW = 50
const MAX_SHEET_COLS_PREVIEW = 25

type DocumentKind = 'pdf' | 'docx' | 'xlsx' | 'txt' | 'image' | 'unknown'

const KnowledgeSchema = z.object({
  document: z.object({
    name: z.string(),
    kind: z.enum(['pdf', 'docx', 'xlsx', 'txt', 'image', 'unknown']),
    sizeBytes: z.number().int().nonnegative(),
    pageCount: z.number().int().nonnegative().optional(),
    sheetNames: z.array(z.string()).optional(),
  }),
  summary: z.string(),
  keyPoints: z.array(z.string()).default([]),
  entities: z.array(z.object({
    type: z.string(),
    name: z.string(),
    evidence: z.string().optional(),
  })).default([]),
  facts: z.array(z.object({
    subject: z.string(),
    predicate: z.string(),
    object: z.string(),
    evidence: z.string().optional(),
  })).default([]),
  tables: z.array(z.object({
    title: z.string().optional(),
    columns: z.array(z.string()),
    rows: z.array(z.array(z.union([z.string(), z.number(), z.null()]))),
  })).optional(),
  risks: z.array(z.object({
    title: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    rationale: z.string(),
    evidence: z.string().optional(),
  })).default([]),
  suggestedQuestions: z.array(z.string()).default([]),
})

function guessKind(fileName: string, contentType: string | null): DocumentKind {
  const lower = fileName.toLowerCase()
  if (contentType?.includes('pdf') || lower.endsWith('.pdf')) return 'pdf'
  if (contentType?.includes('word') || lower.endsWith('.docx')) return 'docx'
  if (contentType?.includes('sheet') || lower.endsWith('.xlsx') || lower.endsWith('.xls')) return 'xlsx'
  if (contentType?.startsWith('text/') || lower.endsWith('.txt') || lower.endsWith('.log') || lower.endsWith('.md')) return 'txt'
  if (contentType?.startsWith('image/') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp')) return 'image'
  return 'unknown'
}

function clampText(input: string, maxChars: number): { text: string; truncated: boolean } {
  if (input.length <= maxChars) return { text: input, truncated: false }
  return { text: input.slice(0, maxChars), truncated: true }
}

async function bufferFromFile(file: File): Promise<Buffer> {
  const ab = await file.arrayBuffer()
  return Buffer.from(ab)
}

async function parsePdf(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  const mod = await import('pdf-parse')
  const parse = ((mod as unknown as { default?: unknown }).default ?? mod) as unknown as (b: Buffer) => Promise<{ text?: string; numpages?: number }>
  const result = await parse(buffer)
  return { text: (result.text || '').trim(), pageCount: result.numpages || 0 }
}

async function parseDocx(buffer: Buffer): Promise<{ text: string }> {
  const result = await mammoth.extractRawText({ buffer })
  return { text: (result.value || '').trim() }
}

type SheetPreview = {
  name: string
  columns: string[]
  rows: Array<Array<string | number | null>>
}

async function parseXlsx(buffer: Buffer): Promise<{ text: string; sheetNames: string[]; previews: SheetPreview[] }> {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheetNames = wb.SheetNames || []
  const previews: SheetPreview[] = []

  for (const sheetName of sheetNames.slice(0, 5)) {
    const ws = wb.Sheets[sheetName]
    if (!ws) continue

    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }) as unknown as unknown[]
    const rows2d = Array.isArray(raw) ? raw as unknown[] : []
    const limitedRows = rows2d.slice(0, MAX_SHEET_ROWS_PREVIEW)

    const normalized: Array<Array<string | number | null>> = limitedRows.map((r) => {
      if (!Array.isArray(r)) return []
      return r.slice(0, MAX_SHEET_COLS_PREVIEW).map((cell) => {
        if (cell === undefined || cell === null) return null
        if (typeof cell === 'number') return cell
        if (typeof cell === 'string') return cell
        return String(cell)
      })
    })

    const headerRow = normalized[0] || []
    const columns = headerRow.map((c, idx) => {
      const v = typeof c === 'string' ? c.trim() : c === null ? '' : String(c)
      return v || `col_${idx + 1}`
    })

    previews.push({
      name: sheetName,
      columns,
      rows: normalized.slice(1),
    })
  }

  const textParts: string[] = []
  for (const p of previews) {
    textParts.push(`Sheet: ${p.name}`)
    textParts.push(`Columns: ${p.columns.join(' | ')}`)
    for (const row of p.rows.slice(0, 10)) {
      textParts.push(row.map(v => v === null ? '' : String(v)).join(' | '))
    }
    textParts.push('')
  }

  return { text: textParts.join('\n').trim(), sheetNames, previews }
}

async function parseTxt(buffer: Buffer): Promise<{ text: string }> {
  const text = buffer.toString('utf-8').trim()
  return { text }
}

function toDataUrl(buffer: Buffer, contentType: string | null, fileName: string): string {
  const ct = contentType && contentType.startsWith('image/') ? contentType : (() => {
    const lower = fileName.toLowerCase()
    if (lower.endsWith('.png')) return 'image/png'
    if (lower.endsWith('.webp')) return 'image/webp'
    return 'image/jpeg'
  })()
  const b64 = buffer.toString('base64')
  return `data:${ct};base64,${b64}`
}

function resolveProviderType(model: string): { providerType: string; modelId: string } {
  if (model.startsWith('custom/')) return { providerType: 'openai_compatible', modelId: model.slice('custom/'.length) }
  if (model.startsWith('openrouter/')) return { providerType: 'openrouter', modelId: model.slice('openrouter/'.length) }
  if (model.startsWith('bedrock/')) return { providerType: 'bedrock', modelId: model.slice('bedrock/'.length) }
  if (model.startsWith('claude-')) return { providerType: 'anthropic', modelId: model }
  return { providerType: 'openai', modelId: model }
}

async function callOpenAICompatibleChat(args: {
  baseUrl: string
  apiKey: string
  modelId: string
  messages: unknown[]
  extraHeaders?: Record<string, string>
  timeoutSeconds?: number
}): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), (args.timeoutSeconds || 120) * 1000)

  try {
    const res = await fetch(`${args.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${args.apiKey}`,
        ...args.extraHeaders,
      },
      body: JSON.stringify({
        model: args.modelId,
        messages: args.messages,
        temperature: 0.2,
        max_tokens: 4096,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown error')
      throw new Error(`LLM API returned ${res.status}: ${errText}`)
    }

    const data = await res.json()
    return data?.choices?.[0]?.message?.content ?? ''
  } finally {
    clearTimeout(timer)
  }
}

async function callAnthropic(args: {
  apiKey: string
  modelId: string
  systemPrompt: string
  userPrompt: string
  timeoutSeconds?: number
}): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), (args.timeoutSeconds || 120) * 1000)

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': args.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: args.modelId,
        system: args.systemPrompt,
        messages: [{ role: 'user', content: args.userPrompt }],
        max_tokens: 4096,
        temperature: 0.2,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown error')
      throw new Error(`Anthropic API returned ${res.status}: ${errText}`)
    }

    const data = await res.json()
    const textBlock = data.content?.find((b: { type: string }) => b.type === 'text')
    return textBlock?.text ?? ''
  } finally {
    clearTimeout(timer)
  }
}

const SYSTEM_PROMPT = `You are an expert analyst for unstructured documents.

You will be given a document (text and/or a preview of tables, and possibly an image).

TASK:
- Extract structured knowledge to support downstream analysis.
- Output ONLY a single raw JSON object that strictly matches the requested schema.
- Do not wrap in markdown fences. Do not add any commentary.

SCHEMA (top-level keys):
- document: { name, kind, sizeBytes, pageCount?, sheetNames? }
- summary: string
- keyPoints: string[]
- entities: { type, name, evidence? }[]
- facts: { subject, predicate, object, evidence? }[]
- tables?: { title?, columns, rows }[]
- risks: { title, severity: low|medium|high|critical, rationale, evidence? }[]
- suggestedQuestions: string[]`

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const file = form.get('file')
    const userId = typeof form.get('userId') === 'string' ? String(form.get('userId')) : null
    const model = typeof form.get('model') === 'string' ? String(form.get('model')) : null
    const projectName = typeof form.get('projectName') === 'string' ? String(form.get('projectName')) : null
    const targetDomain = typeof form.get('targetDomain') === 'string' ? String(form.get('targetDomain')) : null

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 })
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: `file too large (max ${MAX_FILE_BYTES} bytes)` }, { status: 413 })
    }

    const buffer = await bufferFromFile(file)
    const kind = guessKind(file.name, file.type || null)

    if (kind === 'image' && file.size > MAX_IMAGE_BYTES_INLINE) {
      return NextResponse.json(
        { error: `image too large for inline vision analysis (max ${MAX_IMAGE_BYTES_INLINE} bytes)` },
        { status: 413 },
      )
    }

    let extractedText = ''
    let pageCount: number | undefined
    let sheetNames: string[] | undefined
    let sheetPreviews: SheetPreview[] | undefined
    let imageDataUrl: string | undefined

    if (kind === 'pdf') {
      const pdf = await parsePdf(buffer)
      extractedText = pdf.text
      pageCount = pdf.pageCount
    } else if (kind === 'docx') {
      const docx = await parseDocx(buffer)
      extractedText = docx.text
    } else if (kind === 'xlsx') {
      const xlsx = await parseXlsx(buffer)
      extractedText = xlsx.text
      sheetNames = xlsx.sheetNames
      sheetPreviews = xlsx.previews
    } else if (kind === 'txt') {
      const txt = await parseTxt(buffer)
      extractedText = txt.text
    } else if (kind === 'image') {
      imageDataUrl = toDataUrl(buffer, file.type || null, file.name)
    }

    const { text: llmText, truncated } = clampText(extractedText, MAX_TEXT_CHARS_FOR_LLM)

    const baseDocument = {
      name: file.name,
      kind,
      sizeBytes: file.size,
      ...(pageCount !== undefined ? { pageCount } : {}),
      ...(sheetNames ? { sheetNames } : {}),
    }

    let knowledge: unknown | null = null
    let llmUsed = false
    let llmError: string | null = null

    if (userId && model) {
      const { providerType, modelId } = resolveProviderType(model)
      if (providerType !== 'bedrock') {
        try {
          const providers = await prisma.userLlmProvider.findMany({ where: { userId } })
          const provider = providers.find((p) => p.providerType === providerType)
          if (provider) {
            if (providerType === 'anthropic' && kind === 'image') {
              throw new Error('Anthropic image inputs are not supported here. Choose an OpenAI-compatible vision model.')
            }

            const contextLines: string[] = []
            if (projectName) contextLines.push(`Project: ${projectName}`)
            if (targetDomain) contextLines.push(`Target: ${targetDomain}`)
            if (truncated) contextLines.push(`Note: extracted text was truncated to ${MAX_TEXT_CHARS_FOR_LLM} characters.`)

            const tablesPreview = sheetPreviews
              ? sheetPreviews.map(p => ({
                title: `Sheet: ${p.name}`,
                columns: p.columns,
                rows: p.rows.slice(0, 20),
              }))
              : undefined

            const userPrompt = [
              contextLines.length ? `CONTEXT\n${contextLines.join('\n')}\n` : '',
              `DOCUMENT\nname: ${file.name}\nkind: ${kind}\n`,
              llmText ? `TEXT\n${llmText}\n` : '',
              tablesPreview ? `TABLES_PREVIEW\n${JSON.stringify(tablesPreview)}\n` : '',
              `Return JSON that matches the schema exactly.`,
            ].filter(Boolean).join('\n')

            let rawResponse = ''
            if (providerType === 'anthropic') {
              rawResponse = await callAnthropic({
                apiKey: provider.apiKey,
                modelId,
                systemPrompt: SYSTEM_PROMPT,
                userPrompt,
                timeoutSeconds: provider.timeout,
              })
            } else {
              let baseUrl = provider.baseUrl || 'https://api.openai.com/v1'
              if (providerType === 'openrouter' && !provider.baseUrl) baseUrl = 'https://openrouter.ai/api/v1'
              baseUrl = baseUrl.replace(/\/+$/, '')
              const extraHeaders = (provider.defaultHeaders && typeof provider.defaultHeaders === 'object')
                ? provider.defaultHeaders as Record<string, string>
                : undefined

              const messages: unknown[] = [
                { role: 'system', content: SYSTEM_PROMPT },
                ...(kind === 'image' && imageDataUrl)
                  ? [{
                    role: 'user',
                    content: [
                      { type: 'text', text: userPrompt },
                      { type: 'image_url', image_url: { url: imageDataUrl } },
                    ],
                  }]
                  : [{ role: 'user', content: userPrompt }],
              ]

              rawResponse = await callOpenAICompatibleChat({
                baseUrl,
                apiKey: provider.apiKey,
                modelId,
                messages,
                extraHeaders,
                timeoutSeconds: provider.timeout,
              })
            }

            if (!rawResponse) {
              throw new Error('LLM returned an empty response')
            }

            const jsonStr = extractJson(rawResponse)
            const parsed = JSON.parse(jsonStr)
            const validated = KnowledgeSchema.safeParse(parsed)
            if (!validated.success) {
              const issues = validated.error.issues.slice(0, 8).map(i => `${i.path.join('.')}: ${i.message}`)
              throw new Error(`Invalid JSON schema: ${issues.join('; ')}`)
            }
            knowledge = validated.data
            llmUsed = true
          }
        } catch (e) {
          llmError = e instanceof Error ? e.message : String(e)
        }
      }
    }

    return NextResponse.json({
      document: baseDocument,
      extraction: {
        text: extractedText ? clampText(extractedText, 120_000).text : '',
        textTruncatedForLlm: truncated,
        sheetPreviews: sheetPreviews || undefined,
        imageDataUrl: imageDataUrl || undefined,
      },
      knowledge,
      llmUsed,
      llmError,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
