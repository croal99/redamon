import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PROFILE_KEY_PREFIX = '__REDAMON_PROFILE__'
const DEFAULT_UID = '1'

type UserProfile = {
  uid: string
  assets: string
  riskThreshold: string
  backgroundInfo: string
  updatedAt: string
}

function getProfile(uid: string): UserProfile {
  const key = `${PROFILE_KEY_PREFIX}:${uid}`
  const g = globalThis as unknown as Record<string, unknown>
  const existing = g[key]
  if (existing) return existing as UserProfile
  
  const defaultProfile: UserProfile = {
    uid,
    assets: '',
    riskThreshold: '',
    backgroundInfo: '',
    updatedAt: new Date().toISOString()
  }
  g[key] = defaultProfile
  return defaultProfile
}

function saveProfile(uid: string, profile: Partial<UserProfile>): UserProfile {
  const key = `${PROFILE_KEY_PREFIX}:${uid}`
  const g = globalThis as unknown as Record<string, unknown>
  const current = getProfile(uid)
  
  const updated: UserProfile = {
    ...current,
    ...profile,
    uid,
    updatedAt: new Date().toISOString()
  }
  
  g[key] = updated
  return updated
}

/**
 * 获取用户画像
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const uid = searchParams.get('uid') || DEFAULT_UID
    
    const profile = getProfile(uid)
    return NextResponse.json({ code: 200, data: profile })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ code: 500, msg: `获取画像失败: ${msg}` }, { status: 500 })
  }
}

/**
 * 更新用户画像
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ code: 400, msg: '请求体解析失败' }, { status: 400 })
    }
    
    const uid = body.uid ? String(body.uid) : DEFAULT_UID
    
    const updated = saveProfile(uid, {
      assets: body.assets,
      riskThreshold: body.riskThreshold,
      backgroundInfo: body.backgroundInfo
    })
    
    return NextResponse.json({ code: 200, data: updated, msg: '保存成功' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ code: 500, msg: `保存画像失败: ${msg}` }, { status: 500 })
  }
}
