import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

type AuthUser = {
  id: string
  username: string
  email?: string | null
}

type AuthTokenResponse = {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: AuthUser
}

type WebappLoginResponse = AuthTokenResponse & {
  webapp_user_id: string
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function getFallbackEmail(user: AuthUser) {
  return normalizeEmail(`${user.username}+${user.id}@auth.local`)
}

function copySetCookieHeaders(from: Response, to: NextResponse) {
  const anyHeaders = from.headers as unknown as { getSetCookie?: () => string[] }
  const setCookies = anyHeaders.getSetCookie?.() ?? []
  if (setCookies.length > 0) {
    for (const cookie of setCookies) {
      to.headers.append('set-cookie', cookie)
    }
    return
  }

  const single = from.headers.get('set-cookie')
  if (single) to.headers.append('set-cookie', single)
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { username?: unknown; password?: unknown }
      | null

    const username = typeof body?.username === 'string' ? body.username.trim() : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!username || !password) {
      return NextResponse.json({ error: '用户名和密码不能为空' }, { status: 400 })
    }

    const authUrl = new URL('/api/auth/login', request.url)
    const authRes = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      cache: 'no-store',
      redirect: 'manual',
    })

    const raw = await authRes.text()
    if (!authRes.ok) {
      let message = '认证失败'
      try {
        const data = JSON.parse(raw) as { detail?: string; message?: string }
        message = data?.detail || data?.message || message
      } catch {}

      const res = NextResponse.json({ error: message }, { status: authRes.status })
      copySetCookieHeaders(authRes, res)
      return res
    }

    const payload = JSON.parse(raw) as AuthTokenResponse
    if (!payload?.user?.id || !payload?.user?.username) {
      return NextResponse.json({ error: '认证服务返回数据不完整' }, { status: 502 })
    }

    const authUser = payload.user
    const preferredEmail = authUser.email ? normalizeEmail(authUser.email) : null
    const fallbackEmail = getFallbackEmail(authUser)

    const existing =
      (preferredEmail ? await prisma.user.findUnique({ where: { email: preferredEmail } }) : null) ??
      (await prisma.user.findUnique({ where: { email: fallbackEmail } }))

    let webappUserId: string

    if (existing) {
      webappUserId = existing.id
      if (preferredEmail && existing.email !== preferredEmail) {
        const emailTaken = await prisma.user.findUnique({ where: { email: preferredEmail } })
        if (!emailTaken) {
          await prisma.user.update({
            where: { id: existing.id },
            data: { name: authUser.username, email: preferredEmail },
          })
        } else {
          await prisma.user.update({
            where: { id: existing.id },
            data: { name: authUser.username },
          })
        }
      } else {
        await prisma.user.update({
          where: { id: existing.id },
          data: { name: authUser.username },
        })
      }
    } else {
      const created = await prisma.user.create({
        data: {
          name: authUser.username,
          email: preferredEmail ?? fallbackEmail,
        },
      })
      webappUserId = created.id
    }

    const responsePayload: WebappLoginResponse = {
      ...payload,
      webapp_user_id: webappUserId,
    }

    const res = NextResponse.json(responsePayload, { status: 200 })
    copySetCookieHeaders(authRes, res)
    return res
  } catch (error) {
    console.error('Failed to login via auth-service:', error)
    return NextResponse.json({ error: '登录失败' }, { status: 500 })
  }
}
