import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import { addHistory } from '../../history/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const KB_KEY_PREFIX = '__REDAMON_KB__'
const MAX_FILE_BYTES = 25 * 1024 * 1024
const MAX_TEXT_CHARS_STORED = 50_000
const MAX_SHEET_ROWS_PREVIEW = 50
const MAX_SHEET_COLS_PREVIEW = 25

type DocumentKind = 'pdf' | 'docx' | 'xlsx' | 'txt' | 'image' | 'unknown'

type KnowledgeBaseEntry = {
  id: string
  file_name: string
  file_type: string
  size_bytes: number
  indexed_at: string
  chunk_count: number
  entities_count: number
  summary: string
  content_preview: string
  keywords: string[]
  entities: string[]
}

/**
 * Generate ISO timestamp for indexing.
 */
function nowIso() {
  return new Date().toISOString()
}

/**
 * Get per-user knowledge-base store from server memory.
 */
function getStore(uid: string): KnowledgeBaseEntry[] {
  const key = `${KB_KEY_PREFIX}:${uid}`
  const g = globalThis as unknown as Record<string, unknown>
  const existing = g[key]
  if (Array.isArray(existing)) return existing as KnowledgeBaseEntry[]
  g[key] = []
  return g[key] as KnowledgeBaseEntry[]
}

/**
 * Guess file kind from filename/content-type.
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
 * Convert File to Node Buffer.
 */
async function bufferFromFile(file: File): Promise<Buffer> {
  const ab = await file.arrayBuffer()
  return Buffer.from(ab)
}

/**
 * Parse PDF to text (best-effort).
 */
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

/**
 * Extract keyword list similar to backend.py (simple token freq with stopwords).
 */
function extractKeywords(text: string, topN: number = 10): string[] {
  const tokens = (text.match(/[\u4e00-\u9fa5a-zA-Z0-9]{2,}/g) || []).filter(Boolean)
  const stop = new Set([
    '的', '是', '在', '和', '了', '有', '我', '你', '他', '她', '它',
    '这', '那', '个', '与', '或', '但', '为', '于', '上', '下', '中',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'to',
  ])

  const freq = new Map<string, number>()
  for (const t of tokens) {
    const w = t.trim()
    if (!w || w.length < 2) continue
    if (stop.has(w)) continue
    freq.set(w, (freq.get(w) || 0) + 1)
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([w]) => w)
}

/**
 * Extract entities similar to backend.py plus security-relevant patterns (domain/ip/url/cve).
 */
function extractEntities(text: string): string[] {
  const patterns: RegExp[] = [
    /[\u4e00-\u9fa5]{2,8}(?:公司|集团|医院|学校|银行|政府)/g,
    /[\u4e00-\u9fa5]{2,6}(?:先生|女士|老师|医生|经理|总裁)/g,
    /[\u4e00-\u9fa5]+市|[\u4e00-\u9fa5]+省|[\u4e00-\u9fa5]+区/g,
    /\bhttps?:\/\/[^\s)]+/g,
    /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g,
    /\bCVE-\d{4}-\d{4,7}\b/gi,
    /\b(?:[a-zA-Z0-9-]+\.)+(?:com|cn|net|org|io|dev|app|co|gov|edu)\b/g,
  ]

  const set = new Set<string>()
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      const v = String(m[0]).trim()
      if (v) set.add(re === patterns[5] ? v.toUpperCase() : v)
    }
  }
  return Array.from(set).slice(0, 50)
}

/**
 * Generate a short preview summary from extracted text.
 */
function generateSummary(text: string, maxLength: number = 200): string {
  const trimmed = text.trim()
  if (!trimmed) return '（无可解析文本）'
  if (trimmed.length <= maxLength) return trimmed
  return `${trimmed.slice(0, maxLength)}...`
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file')
    const uid = String(form.get('uid') || '0')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ code: 400, msg: '缺少文件' }, { status: 400 })
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ code: 413, msg: '文件过大' }, { status: 413 })
    }

    const kind = guessKind(file.name, file.type || null)
    const buffer = await bufferFromFile(file)

    let extractedText = ''
    if (kind === 'pdf') {
      const parsed = await parsePdf(buffer)
      extractedText = parsed.text
    } else if (kind === 'docx') {
      const parsed = await parseDocx(buffer)
      extractedText = parsed.text
    } else if (kind === 'xlsx') {
      const parsed = await parseXlsx(buffer)
      extractedText = parsed.text
    } else if (kind === 'txt') {
      const parsed = await parseTxt(buffer)
      extractedText = parsed.text
    } else if (kind === 'image') {
      extractedText = `Image: ${file.name}\nHint: stored as a multimodal placeholder for retrieval.`
    } else {
      extractedText = `Unknown document kind: ${file.name}`
    }

    const suffix = (() => {
      const idx = file.name.lastIndexOf('.')
      return idx >= 0 ? file.name.slice(idx) : ''
    })()
    const contentStored = extractedText.slice(0, MAX_TEXT_CHARS_STORED)
    const chunkCount = Math.max(1, Math.floor(extractedText.length / 200) + 1)
    const entities = extractEntities(extractedText)
    const keywords = extractKeywords(extractedText, 10)
    const entitiesCount = entities.length

    const entry: KnowledgeBaseEntry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      file_name: file.name,
      file_type: suffix || kind,
      size_bytes: file.size,
      indexed_at: nowIso(),
      chunk_count: chunkCount,
      entities_count: entitiesCount,
      summary: generateSummary(extractedText, 240),
      content_preview: contentStored,
      keywords,
      entities,
    }

    const store = getStore(uid)
    store.unshift(entry)

    // 记录历史
    addHistory(uid, {
      type: 'upload',
      summary: `上传文档到知识库: ${file.name}`,
      status: 'success',
      detail: { size: file.size, type: file.type }
    })

    return NextResponse.json({
      code: 200,
      msg: '上传成功',
      chunk_count: chunkCount,
      entities: entitiesCount,
      file: entry,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ code: 500, msg: `上传失败: ${msg}` }, { status: 500 })
  }
}
