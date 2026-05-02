import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const KB_KEY_PREFIX = '__REDAMON_KB__'
const DEFAULT_UID = '1'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ code: 400, msg: '请求体解析失败' }, { status: 400 })
    
    const uid = body.uid ? String(body.uid) : DEFAULT_UID
    const kbKey = `${KB_KEY_PREFIX}:${uid}`
    const g = globalThis as unknown as Record<string, unknown>
    const kb = g[kbKey] as any[] || []
    
    // 从知识库提取实体和关系 (模拟)
    const nodes: any[] = []
    const links: any[] = []
    const entityMap = new Map<string, string>() // id -> label
    
    if (kb.length === 0) {
      return NextResponse.json({ 
        code: 200, 
        data: { nodes: [], links: [] }, 
        msg: '知识库为空，无法构建图谱' 
      })
    }
    
    // 模拟构建过程
    kb.forEach((file, i) => {
      const fileNodeId = `f_${i}`
      nodes.push({ id: fileNodeId, label: file.file_name, type: 'Document' })
      entityMap.set(fileNodeId, file.file_name)
      
      // 添加关键词作为实体
      if (file.keywords && Array.isArray(file.keywords)) {
        file.keywords.slice(0, 3).forEach((kw: string, j: number) => {
          const kwNodeId = `k_${kw}_${i}_${j}`
          if (!entityMap.has(kwNodeId)) {
            nodes.push({ id: kwNodeId, label: kw, type: 'Keyword' })
            entityMap.set(kwNodeId, kw)
          }
          links.push({ source: fileNodeId, target: kwNodeId, relation: 'CONTAINS' })
        })
      }
    })
    
    // 模拟延迟
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    return NextResponse.json({ 
      code: 200, 
      data: { nodes, links }, 
      msg: `成功构建知识图谱，包含 ${nodes.length} 个节点和 ${links.length} 条关系` 
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ code: 500, msg: `构建图谱失败: ${msg}` }, { status: 500 })
  }
}
