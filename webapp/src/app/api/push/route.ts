import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PUSH_KEY_PREFIX = '__REDAMON_PUSH__'
const PROFILE_KEY_PREFIX = '__REDAMON_PROFILE__'
const DEFAULT_UID = '1'

type PushRule = {
  id: string
  title: string
  desc: string
  active: boolean
}

function getRules(uid: string): PushRule[] {
  const key = `${PUSH_KEY_PREFIX}:${uid}`
  const g = globalThis as unknown as Record<string, unknown>
  const existing = g[key]
  if (Array.isArray(existing)) return existing as PushRule[]
  
  const defaultRules: PushRule[] = [
    { id: '1', title: '高危风险（critical）', desc: '当知识抽取识别到 critical 风险时推送', active: true },
    { id: '2', title: '新增敏感暴露', desc: '发现新的个人信息、凭据或未授权接口时推送', active: true },
    { id: '3', title: '图谱核心节点变更', desc: '当核心资产在知识图谱中发生重大关系变更时推送', active: false }
  ]
  g[key] = defaultRules
  return defaultRules
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const uid = searchParams.get('uid') || DEFAULT_UID
    const rules = getRules(uid)
    return NextResponse.json({ code: 200, data: rules })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ code: 500, msg: `获取推送规则失败: ${msg}` }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || !body.rules) {
      return NextResponse.json({ code: 400, msg: '请求体不合法' }, { status: 400 })
    }

    const uid = body.uid ? String(body.uid) : DEFAULT_UID
    const rules = body.rules as PushRule[]

    const key = `${PUSH_KEY_PREFIX}:${uid}`
    const g = globalThis as unknown as Record<string, unknown>
    g[key] = rules

    return NextResponse.json({ code: 200, msg: '推送规则已保存' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ code: 500, msg: `保存规则失败: ${msg}` }, { status: 500 })
  }
}