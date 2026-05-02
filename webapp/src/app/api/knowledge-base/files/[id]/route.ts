import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const KB_KEY_PREFIX = '__REDAMON_KB__'

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

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const uid = req.nextUrl.searchParams.get('uid') || '0'
  const store = getStore(uid)
  const found = store.find(f => f.id === id)
  if (!found) {
    return NextResponse.json({ code: 404, msg: '未找到该条目' }, { status: 404 })
  }
  return NextResponse.json({ code: 200, file: found })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const uid = req.nextUrl.searchParams.get('uid') || '0'
  const store = getStore(uid)
  const idx = store.findIndex(f => f.id === id)
  if (idx < 0) {
    return NextResponse.json({ code: 404, msg: '未找到该条目' }, { status: 404 })
  }
  store.splice(idx, 1)
  return NextResponse.json({ code: 200, msg: '删除成功' })
}
