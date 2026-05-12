import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from './neo4j'
import { formatGraphRecords } from './format'
import { getCached, invalidateCache, setCached } from './cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const KB_KEY_PREFIX = '__REDAMON_KB__'
const DEFAULT_UID = '1'
const PROJECT_ID_RE = /^[a-zA-Z0-9_-]+$/
const NODE_ID_RE = /^\d+$/

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId')
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }
  if (!PROJECT_ID_RE.test(projectId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }

  const fresh = request.nextUrl.searchParams.get('fresh') === '1'
  const ifNoneMatch = request.headers.get('if-none-match')

  if (fresh) {
    invalidateCache(projectId)
  } else {
    const cached = getCached(projectId)
    if (cached) {
      const etag = `"${cached.etag}"`
      if (ifNoneMatch && ifNoneMatch === etag) {
        return new NextResponse(null, {
          status: 304,
          headers: { ETag: etag, 'Cache-Control': 'private, no-cache' },
        })
      }
      return NextResponse.json(
        { nodes: cached.data.nodes, links: cached.data.links, projectId },
        { headers: { ETag: etag, 'Cache-Control': 'private, no-cache' } }
      )
    }
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  })
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const session = getSession()
  try {
    const result = await session.run(
      `
      MATCH (n)
      WHERE n.project_id = $pid AND (n.user_id = $uid OR n.user_id IS NULL)
      OPTIONAL MATCH (n)-[r]-(m)
      WITH n, r, m,
           CASE
             WHEN m IS NULL THEN true
             WHEN m.project_id = $pid AND (m.user_id = $uid OR m.user_id IS NULL) THEN true
             ELSE false
           END AS ok
      RETURN n,
             CASE WHEN ok THEN r ELSE null END AS r,
             CASE WHEN ok THEN m ELSE null END AS m
      `,
      { pid: projectId, uid: project.userId }
    )

    const formatted = formatGraphRecords(result.records)
    const etagVal = setCached(projectId, { nodes: formatted.nodes, links: formatted.links })
    const etag = `"${etagVal}"`

    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: { ETag: etag, 'Cache-Control': 'private, no-cache' },
      })
    }

    return NextResponse.json(
      { nodes: formatted.nodes, links: formatted.links, projectId },
      { headers: { ETag: etag, 'Cache-Control': 'private, no-cache' } }
    )
  } catch (error) {
    console.error('Failed to fetch graph data:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch graph data' },
      { status: 500 }
    )
  } finally {
    await session.close()
  }
}

export async function DELETE(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId')
  const nodeId = request.nextUrl.searchParams.get('nodeId')
  if (!projectId || !nodeId) {
    return NextResponse.json({ error: 'projectId and nodeId are required' }, { status: 400 })
  }
  if (!PROJECT_ID_RE.test(projectId) || !NODE_ID_RE.test(nodeId)) {
    return NextResponse.json({ error: 'Invalid projectId or nodeId' }, { status: 400 })
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  })
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const session = getSession()
  try {
    const result = await session.run(
      `
      MATCH (n)
      WHERE id(n) = toInteger($nodeId)
        AND n.project_id = $pid
        AND (n.user_id = $uid OR n.user_id IS NULL)
      WITH n
      DETACH DELETE n
      RETURN 1 AS deleted
      `,
      { nodeId, pid: projectId, uid: project.userId }
    )

    const deleted = result.records.length > 0
    if (!deleted) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 })
    }

    invalidateCache(projectId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to delete node:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete node' },
      { status: 500 }
    )
  } finally {
    await session.close()
  }
}

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
