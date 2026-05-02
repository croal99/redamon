import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HISTORY_KEY_PREFIX = '__REDAMON_HISTORY__'
const KB_KEY_PREFIX = '__REDAMON_KB__'
const DEFAULT_UID = '1'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const uid = searchParams.get('uid') || DEFAULT_UID
    const g = globalThis as unknown as Record<string, unknown>

    // 统计历史任务
    const historyKey = `${HISTORY_KEY_PREFIX}:${uid}`
    const history = (g[historyKey] as any[]) || []
    const pending = history.filter(h => h.status === 'pending').length
    const success = history.filter(h => h.status === 'success').length
    const totalTasks = history.length

    // 统计知识库和素材
    const kbKey = `${KB_KEY_PREFIX}:${uid}`
    const kb = (g[kbKey] as any[]) || []
    const fileCount = kb.length
    const knowledgeItems = kb.reduce((sum, item) => sum + (item.chunk_count || 0), 0)
    const graphNodes = kb.reduce((sum, item) => sum + (item.entities_count || 0), 0)

    return NextResponse.json({
      code: 200,
      data: {
        tasks: {
          pending,
          inProgress: 0,
          completed: success,
          total: totalTasks
        },
        knowledge: {
          files: fileCount,
          items: knowledgeItems,
          nodes: graphNodes
        }
      }
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ code: 500, msg: `获取概览失败: ${msg}` }, { status: 500 })
  }
}
