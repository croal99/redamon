import { NextRequest, NextResponse } from 'next/server'
import { addHistory } from '../../history/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const KB_KEY_PREFIX = '__REDAMON_KB__'
const DEFAULT_UID = '1'

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

function getStore(uid: string): KnowledgeBaseEntry[] {
  const key = `${KB_KEY_PREFIX}:${uid}`
  const g = globalThis as unknown as Record<string, unknown>
  const existing = g[key]
  if (Array.isArray(existing)) return existing as KnowledgeBaseEntry[]
  g[key] = []
  return g[key] as KnowledgeBaseEntry[]
}

function tokenize(query: string): string[] {
  const tokens = (query.match(/[\u4e00-\u9fa5a-zA-Z0-9]{2,}/g) || []).map(s => s.trim()).filter(Boolean)
  return Array.from(new Set(tokens)).slice(0, 12)
}

function scoreEntry(entry: KnowledgeBaseEntry, tokens: string[]): number {
  const hay = `${entry.file_name}\n${entry.summary}\n${entry.content_preview}`.toLowerCase()
  let score = 0
  for (const t of tokens) {
    const tt = t.toLowerCase()
    if (!tt) continue
    if (entry.file_name.toLowerCase().includes(tt)) score += 6
    if (entry.summary.toLowerCase().includes(tt)) score += 4
    const idx = hay.indexOf(tt)
    if (idx >= 0) score += 2
  }
  return score
}

function findEvidenceSnippets(text: string, tokens: string[], maxSnippets: number): string[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const scored: Array<{ line: string; score: number }> = []
  const lowerTokens = tokens.map(t => t.toLowerCase())

  for (const line of lines) {
    const low = line.toLowerCase()
    let s = 0
    for (const t of lowerTokens) {
      if (t && low.includes(t)) s += 1
    }
    if (s > 0) scored.push({ line, score: s })
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, maxSnippets).map(x => x.line)
}

function buildAnswer(args: {
  question: string
  tokens: string[]
  picked: KnowledgeBaseEntry[]
}): { answer: string; sources: string[] } {
  const sources = args.picked.map(p => p.file_name)
  const evidenceBlocks: string[] = []

  for (const p of args.picked) {
    const snippets = findEvidenceSnippets(p.content_preview || p.summary || '', args.tokens, 3)
    if (!snippets.length) continue
    const block = [`【${p.file_name}】`, ...snippets.map(s => `- ${s}`)].join('\n')
    evidenceBlocks.push(block)
  }

  const evidence = evidenceBlocks.length ? evidenceBlocks.join('\n\n') : '（未在当前知识库预览文本中命中直接证据，以下为一般性建议/推断）'

  const answer = [
    '【基于知识库的智能问答】',
    '',
    `问题：${args.question}`,
    '',
    '结论：',
    '1) 我已检索当前知识库并优先引用与问题关键词最相关的条目。',
    '2) 若需要更精确结论，建议补充：目标资产范围、时间范围、你关注的输出类型（摘要/要点/三元组/风险）。',
    '',
    '依据（命中片段）：',
    evidence,
    '',
    '下一步建议：',
    '- 若问题涉及漏洞/暴露面：请提供域名/IP/URL 或 CVE 编号，我可以按证据片段输出复现路径与风险分级。',
    '- 若问题涉及敏感信息：建议对命中的 token/password/key 等做脱敏检查，并确认是否需要轮换与权限回收。',
    '- 若需要落图：我可以把实体与关系抽取成三元组用于知识图谱。',
  ].join('\n')

  return { answer, sources }
}

export async function POST(req: NextRequest) {
  try {
    let uid = DEFAULT_UID
    let question = ''

    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => null)
      uid = body?.uid ? String(body.uid) : DEFAULT_UID
      question = body?.question ? String(body.question) : ''
    } else {
      const form = await req.formData()
      uid = String(form.get('uid') || DEFAULT_UID)
      question = String(form.get('question') || '')
    }

    question = question.trim()
    if (!question) {
      return NextResponse.json({ code: 400, msg: '问题不能为空' }, { status: 400 })
    }

    // 记录对话历史
    addHistory(uid, {
      type: 'chat',
      summary: `对话: ${question.slice(0, 20)}${question.length > 20 ? '...' : ''}`,
      status: 'success',
      detail: { question }
    })

    const store = getStore(uid)
    if (!store.length) {
      return NextResponse.json({
        code: 200,
        answer: [
          '【基于知识库的智能问答】',
          '',
          `问题：${question}`,
          '',
          '当前知识库为空：请先在「📚 知识库」上传文件，或在「📁 批量分析」导入材料。',
        ].join('\n'),
        sources: [],
      })
    }

    const tokens = tokenize(question)
    const scored = store
      .map(f => ({ f, score: scoreEntry(f, tokens) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(x => x.f)

    const simulatedDelayMs = Math.min(900, 220 + Math.round(question.length * 8))
    await new Promise((r) => setTimeout(r, simulatedDelayMs))

    const { answer, sources } = buildAnswer({ question, tokens, picked: scored })
    return NextResponse.json({ code: 200, answer, sources })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ code: 500, msg: `对话失败: ${msg}` }, { status: 500 })
  }
}

