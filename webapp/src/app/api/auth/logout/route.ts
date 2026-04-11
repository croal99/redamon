import { NextRequest, NextResponse } from 'next/server'

const AUTH_API_URL = process.env.AUTH_API_URL || process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://localhost:8100'

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
  const forwardedProto = request.headers.get('x-forwarded-proto') || new URL(request.url).protocol.replace(':', '')
  const secure = forwardedProto === 'https'

  try {
    const authRes = await fetch(`${AUTH_API_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'x-forwarded-proto': forwardedProto,
      },
      cache: 'no-store',
      redirect: 'manual',
    })

    const res = NextResponse.json({ ok: true }, { status: authRes.ok ? 200 : authRes.status })
    copySetCookieHeaders(authRes, res)

    res.cookies.set('bluenet_token', '', {
      path: '/',
      httpOnly: true,
      secure,
      sameSite: 'lax',
      expires: new Date(0),
      maxAge: 0,
    })
    res.cookies.set('bluenet_refresh_token', '', {
      path: '/',
      httpOnly: true,
      secure,
      sameSite: 'lax',
      expires: new Date(0),
      maxAge: 0,
    })

    return res
  } catch (error) {
    console.error('Failed to logout via auth-service:', error)

    const res = NextResponse.json({ ok: true }, { status: 200 })
    res.cookies.set('bluenet_token', '', {
      path: '/',
      httpOnly: true,
      secure,
      sameSite: 'lax',
      expires: new Date(0),
      maxAge: 0,
    })
    res.cookies.set('bluenet_refresh_token', '', {
      path: '/',
      httpOnly: true,
      secure,
      sameSite: 'lax',
      expires: new Date(0),
      maxAge: 0,
    })
    return res
  }
}

