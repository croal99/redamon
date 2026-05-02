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

export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get('uid') || '0'
  const files = getStore(uid).map(f => ({
    id: f.id,
    file_name: f.file_name,
    file_type: f.file_type,
    indexed_at: f.indexed_at,
    chunk_count: f.chunk_count,
    size_bytes: f.size_bytes,
    entities_count: f.entities_count,
    summary: f.summary,
  }))

  return NextResponse.json({ code: 200, files })
}
