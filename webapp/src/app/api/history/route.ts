import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HISTORY_KEY_PREFIX = '__REDAMON_HISTORY__'
const DEFAULT_UID = '1'

export type HistoryEntry = {
  id: string
  time: string
  type: 'chat' | 'analysis' | 'upload'
  summary: string
  status: 'success' | 'failed' | 'pending'
  detail?: any
}

function getHistory(uid: string): HistoryEntry[] {
  const key = `${HISTORY_KEY_PREFIX}:${uid}`
  const g = globalThis as unknown as Record<string, unknown>
  const existing = g[key]
  if (Array.isArray(existing)) return existing as HistoryEntry[]
  
  // 初始化一些模拟历史记录
  const defaultHistory: HistoryEntry[] = [
    {
      id: 'h_1',
      time: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2小时前
      type: 'upload',
      summary: '上传文件《某系统架构说明.pdf》',
      status: 'success'
    },
    {
      id: 'h_2',
      time: new Date(Date.now() - 1000 * 60 * 60 * 1.5).toISOString(), // 1.5小时前
      type: 'analysis',
      summary: '多模态文件分析任务',
      status: 'success',
      detail: { fileCount: 3 }
    },
    {
      id: 'h_3',
      time: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30分钟前
      type: 'chat',
      summary: '对话：当前系统存在哪些风险？',
      status: 'success'
    }
  ]
  g[key] = defaultHistory
  return defaultHistory
}

export function addHistory(uid: string, entry: Omit<HistoryEntry, 'id' | 'time'>): HistoryEntry {
  const key = `${HISTORY_KEY_PREFIX}:${uid}`
  const g = globalThis as unknown as Record<string, unknown>
  const history = getHistory(uid)
  
  const newEntry: HistoryEntry = {
    ...entry,
    id: `h_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    time: new Date().toISOString()
  }
  
  const updated = [newEntry, ...history]
  g[key] = updated
  return newEntry
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const uid = searchParams.get('uid') || DEFAULT_UID
    const history = getHistory(uid)
    
    return NextResponse.json({ code: 200, data: history })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ code: 500, msg: `获取历史失败: ${msg}` }, { status: 500 })
  }
}
