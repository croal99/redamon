import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import { addHistory } from '../../history/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_FILE_BYTES = 25 * 1024 * 1024
const MAX_IMAGE_BYTES_INLINE = 8 * 1024 * 1024
const MAX_TEXT_CHARS_FOR_LLM = 45_000
const MAX_SHEET_ROWS_PREVIEW = 50
const MAX_SHEET_COLS_PREVIEW = 25

type DocumentKind = 'pdf' | 'docx' | 'xlsx' | 'txt' | 'image' | 'unknown'

type SheetPreview = {
  name: string
  columns: string[]
  rows: Array<Array<string | number | null>>
}

type Knowledge = {
  document: {
    name: string
    kind: DocumentKind
    sizeBytes: number
    pageCount?: number
    sheetNames?: string[]
  }
  summary: string
  keyPoints: string[]
  entities: Array<{ type: string; name: string; evidence?: string }>
  facts: Array<{ subject: string; predicate: string; object: string; evidence?: string }>
  tables?: Array<{ title?: string; columns: string[]; rows: Array<Array<string | number | null>> }>
  risks: Array<{ title: string; severity: 'low' | 'medium' | 'high' | 'critical'; rationale: string; evidence?: string }>
  suggestedQuestions: string[]
}

type AnalyzeResponse = {
  document: Knowledge['document']
  extraction: {
    text: string
    textTruncatedForLlm: boolean
    sheetPreviews?: SheetPreview[]
    imageDataUrl?: string
  }
  knowledge: Knowledge | null
  llmUsed: boolean
  llmError: string | null
  error?: string
}

/**
 * Guess document kind from filename/content-type, aligning with the real /api/documents/analyze route.
 */
function guessKind(fileName: string, contentType: string | null): DocumentKind {
  const lower = fileName.toLowerCase()
  if (contentType?.includes('pdf') || lower.endsWith('.pdf')) return 'pdf'
  if (contentType?.includes('word') || lower.endsWith('.docx')) return 'docx'
  if (contentType?.includes('sheet') || lower.endsWith('.xlsx') || lower.endsWith('.xls')) return 'xlsx'
  if (contentType?.startsWith('text/') || lower.endsWith('.txt') || lower.endsWith('.log') || lower.endsWith('.md')) return 'txt'
  if (contentType?.startsWith('image/') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp')) return 'image'
  return 'unknown'
}

/**
 * Clamp extracted text to a maximum character length to simulate LLM-friendly truncation.
 */
function clampText(input: string, maxChars: number): { text: string; truncated: boolean } {
  if (input.length <= maxChars) return { text: input, truncated: false }
  return { text: input.slice(0, maxChars), truncated: true }
}

/**
 * Convert File to Node Buffer.
 */
async function bufferFromFile(file: File): Promise<Buffer> {
  const ab = await file.arrayBuffer()
  return Buffer.from(ab)
}

/**
 * Parse PDF text (best-effort).
 */
async function parsePdf(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  const mod = await import('pdf-parse')
  const parse = ((mod as unknown as { default?: unknown }).default ?? mod) as unknown as (b: Buffer) => Promise<{ text?: string; numpages?: number }>
  const result = await parse(buffer)
  return { text: (result.text || '').trim(), pageCount: result.numpages || 0 }
}

/**
 * Parse DOCX text (best-effort).
 */
async function parseDocx(buffer: Buffer): Promise<{ text: string }> {
  const result = await mammoth.extractRawText({ buffer })
  return { text: (result.value || '').trim() }
}

/**
 * Parse XLSX sheet previews into a small text preview and 2D table previews.
 */
async function parseXlsx(buffer: Buffer): Promise<{ text: string; sheetNames: string[]; previews: SheetPreview[] }> {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheetNames = wb.SheetNames || []
  const previews: SheetPreview[] = []

  for (const sheetName of sheetNames.slice(0, 5)) {
    const ws = wb.Sheets[sheetName]
    if (!ws) continue

    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }) as unknown as unknown[]
    const rows2d = Array.isArray(raw) ? (raw as unknown[]) : []
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
      textParts.push(row.map(v => (v === null ? '' : String(v))).join(' | '))
    }
    textParts.push('')
  }

  return { text: textParts.join('\n').trim(), sheetNames, previews }
}

/**
 * Parse plain text input (utf-8 best-effort).
 */
async function parseTxt(buffer: Buffer): Promise<{ text: string }> {
  const text = buffer.toString('utf-8').trim()
  return { text }
}

/**
 * Convert an image buffer into a data URL for inline preview.
 */
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

/**
 * Extract basic security-relevant entities from text (IP/URL/domain/email/CVE).
 */
function extractEntities(text: string): Array<{ type: string; name: string; evidence?: string }> {
  const out: Array<{ type: string; name: string; evidence?: string }> = []
  const seen = new Set<string>()

  const push = (type: string, name: string, evidence?: string) => {
    const key = `${type}:${name}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ type, name, evidence })
  }

  const ipRe = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g
  const urlRe = /\bhttps?:\/\/[^\s)]+/g
  const emailRe = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
  const cveRe = /\bCVE-\d{4}-\d{4,7}\b/gi
  const domainRe = /\b(?:[a-zA-Z0-9-]+\.)+(?:com|cn|net|org|io|dev|app|co|gov|edu)\b/g

  for (const m of text.matchAll(urlRe)) push('url', m[0])
  for (const m of text.matchAll(emailRe)) push('email', m[0])
  for (const m of text.matchAll(cveRe)) push('cve', m[0].toUpperCase())
  for (const m of text.matchAll(ipRe)) push('ip', m[0])
  for (const m of text.matchAll(domainRe)) push('domain', m[0].toLowerCase())

  return out.slice(0, 30)
}

/**
 * Generate a deterministic “mock LLM output” from extracted signals.
 */
function synthesizeKnowledge(args: {
  fileName: string
  kind: DocumentKind
  sizeBytes: number
  extractedText: string
  pageCount?: number
  sheetNames?: string[]
  tablePreviews?: SheetPreview[]
}): Knowledge {
  const entities = extractEntities(args.extractedText)
  const hasCredHints = /password|passwd|token|apikey|api[_-]?key|secret|密钥|口令|密码/i.test(args.extractedText)
  const hasPiiHints = /id card|身份证|phone|手机号|邮箱|address|住址/i.test(args.extractedText)
  const hasVulnHints = /CVE-\d{4}-\d{4,7}|漏洞|RCE|SQLi|XSS/i.test(args.extractedText)

  const keyPoints: string[] = []
  keyPoints.push(`识别文件类型：${args.kind}；大小：${Math.round(args.sizeBytes / 1024)} KB`)
  if (args.kind === 'image') keyPoints.push('检测到图像输入，已模拟执行“视觉理解 + 证据摘要 + 实体抽取”流程')
  if (args.kind === 'xlsx' && args.sheetNames?.length) keyPoints.push(`检测到工作表：${args.sheetNames.slice(0, 5).join('、')}`)
  if (entities.length) keyPoints.push(`抽取到 ${entities.length} 个安全相关实体（域名/IP/URL/CVE 等）`)
  if (hasVulnHints) keyPoints.push('文本中包含漏洞/攻击相关关键词，建议进行进一步验证与风险分级')
  if (hasCredHints) keyPoints.push('疑似包含凭据/密钥线索，建议进行脱敏与泄漏排查')
  if (hasPiiHints) keyPoints.push('疑似包含个人信息线索，建议按合规要求处理与隔离')

  const facts: Knowledge['facts'] = []
  const topDomain = entities.find(e => e.type === 'domain')?.name
  const topIp = entities.find(e => e.type === 'ip')?.name
  const topUrl = entities.find(e => e.type === 'url')?.name

  if (topDomain) facts.push({ subject: topDomain, predicate: 'appears_in', object: args.fileName, evidence: '文本匹配' })
  if (topIp) facts.push({ subject: topIp, predicate: 'mentioned_in', object: args.fileName, evidence: '文本匹配' })
  if (topUrl) facts.push({ subject: topUrl, predicate: 'referenced_by', object: args.fileName, evidence: 'URL 匹配' })
  if (!facts.length) facts.push({ subject: args.fileName, predicate: 'processed_by', object: 'mock-multimodal-ai', evidence: '模拟输出' })

  const risks: Knowledge['risks'] = []
  if (hasCredHints) {
    risks.push({
      title: '疑似凭据泄漏',
      severity: 'high',
      rationale: '在材料中检测到 password/token/secret 等关键词，可能存在敏感信息泄漏风险。',
      evidence: '关键字匹配',
    })
  }
  if (hasVulnHints) {
    risks.push({
      title: '疑似漏洞证据',
      severity: 'medium',
      rationale: '材料包含漏洞/攻击链相关线索，需进一步核验其真实性与影响面。',
      evidence: '关键字匹配',
    })
  }
  if (hasPiiHints) {
    risks.push({
      title: '疑似个人信息暴露',
      severity: 'medium',
      rationale: '材料包含可能的个人信息字段线索，需按合规要求进行脱敏/权限控制。',
      evidence: '关键字匹配',
    })
  }

  const summaryParts: string[] = []
  summaryParts.push(`已完成对多模态文件的模拟分析：${args.fileName}（${args.kind}）。`)
  if (args.kind === 'pdf' && typeof args.pageCount === 'number') summaryParts.push(`PDF 页数：${args.pageCount}。`)
  if (args.kind === 'xlsx' && args.sheetNames?.length) summaryParts.push(`表格工作表：${args.sheetNames.slice(0, 5).join('、')}。`)
  if (entities.length) summaryParts.push(`抽取实体：${entities.slice(0, 5).map(e => `${e.type}:${e.name}`).join('；')}。`)
  if (risks.length) summaryParts.push(`初步风险：${risks.map(r => `${r.severity}:${r.title}`).join('；')}。`)
  summaryParts.push('该结果为模拟接口输出，用于前端联调与 UI 演示。')

  const suggestedQuestions: string[] = [
    '这份材料对应的资产范围是什么（域名/IP/系统）？',
    '是否存在可复现的漏洞路径或 PoC？',
    '材料中出现的凭据/密钥是否仍有效，是否已轮换？',
    '是否需要将抽取的实体与三元组写入图谱进行关联分析？',
  ]

  const tables = args.tablePreviews?.length
    ? args.tablePreviews.map(p => ({
        title: p.name,
        columns: p.columns,
        rows: p.rows.slice(0, 10),
      }))
    : undefined

  return {
    document: {
      name: args.fileName,
      kind: args.kind,
      sizeBytes: args.sizeBytes,
      ...(typeof args.pageCount === 'number' ? { pageCount: args.pageCount } : null),
      ...(args.sheetNames?.length ? { sheetNames: args.sheetNames } : null),
    },
    summary: summaryParts.join(''),
    keyPoints: keyPoints.slice(0, 12),
    entities,
    facts: facts.slice(0, 30),
    tables,
    risks: risks.slice(0, 12),
    suggestedQuestions: suggestedQuestions.slice(0, 12),
  }
}

/**
 * Mock analyze route: returns a realistic-shaped response without calling external LLMs.
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: `File too large (max ${MAX_FILE_BYTES} bytes)` }, { status: 413 })
    }

    const kind = guessKind(file.name, file.type || null)
    const buffer = await bufferFromFile(file)

    let extractedText = ''
    let pageCount: number | undefined
    let sheetNames: string[] | undefined
    let sheetPreviews: SheetPreview[] | undefined
    let imageDataUrl: string | undefined

    if (kind === 'pdf') {
      const parsed = await parsePdf(buffer)
      extractedText = parsed.text
      pageCount = parsed.pageCount
    } else if (kind === 'docx') {
      const parsed = await parseDocx(buffer)
      extractedText = parsed.text
    } else if (kind === 'xlsx') {
      const parsed = await parseXlsx(buffer)
      extractedText = parsed.text
      sheetNames = parsed.sheetNames
      sheetPreviews = parsed.previews
    } else if (kind === 'txt') {
      const parsed = await parseTxt(buffer)
      extractedText = parsed.text
    } else if (kind === 'image') {
      extractedText = `Image: ${file.name}\nContent-Type: ${file.type || 'unknown'}\nHint: This is a mock “vision” pipeline output.`
      if (buffer.byteLength <= MAX_IMAGE_BYTES_INLINE) {
        imageDataUrl = toDataUrl(buffer, file.type || null, file.name)
      }
    } else {
      extractedText = `Unknown document kind for ${file.name}. This is a mock analysis output.`
    }

    const clamped = clampText(extractedText, MAX_TEXT_CHARS_FOR_LLM)

    const simulatedDelayMs = Math.min(1200, 250 + Math.round(file.size / 25_000))
    await new Promise((r) => setTimeout(r, simulatedDelayMs))

    const knowledge = synthesizeKnowledge({
      fileName: file.name,
      kind,
      sizeBytes: file.size,
      extractedText: extractedText,
      pageCount,
      sheetNames,
      tablePreviews: sheetPreviews,
    })

    const resp: AnalyzeResponse = {
      document: knowledge.document,
      extraction: {
        text: clamped.text,
        textTruncatedForLlm: clamped.truncated,
        ...(sheetPreviews?.length ? { sheetPreviews } : null),
        ...(imageDataUrl ? { imageDataUrl } : null),
      },
      knowledge,
      llmUsed: true,
      llmError: null,
    }

    // 记录历史
    const uid = form.get('uid') ? String(form.get('uid')) : '1'
    addHistory(uid, {
      type: 'analysis',
      summary: `分析文件 ${file.name}`,
      status: 'success',
      detail: { fileName: file.name, fileKind: kind }
    })

    return NextResponse.json(resp)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

