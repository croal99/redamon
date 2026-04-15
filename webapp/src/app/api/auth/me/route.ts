import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

type BlueNetJwtHeader = {
  alg?: string
  typ?: string
  [key: string]: unknown
}

type BlueNetJwtPayload = {
  sub: string
  username: string
  role: string
  type: 'access' | 'refresh'
  exp: number
  iat?: number
  jti?: string
}

type DecodedJwt = { header: BlueNetJwtHeader; payload: BlueNetJwtPayload }

type BlueUserResponse = {
  authenticated: boolean
  user?: { id: string; username: string; email: string | null; role: string } | null
  exp?: string | null
  jwt?: DecodedJwt
  error?: string
}

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (normalized.length % 4)) % 4
  const padded = normalized + '='.repeat(padLength)
  return Buffer.from(padded, 'base64').toString('utf8')
}

function safeJsonParse(input: string): unknown {
  try {
    return JSON.parse(input) as unknown
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object'
}

function isBlueNetJwtPayload(value: unknown): value is BlueNetJwtPayload {
  if (!isRecord(value)) return false
  if (typeof value.sub !== 'string' || value.sub.length === 0) return false
  if (typeof value.username !== 'string' || value.username.length === 0) return false
  if (typeof value.role !== 'string' || value.role.length === 0) return false
  if (value.type !== 'access' && value.type !== 'refresh') return false
  if (typeof value.exp !== 'number' || !Number.isFinite(value.exp)) return false
  if (value.iat !== undefined && (typeof value.iat !== 'number' || !Number.isFinite(value.iat))) return false
  if (value.jti !== undefined && typeof value.jti !== 'string') return false
  return true
}

function decodeJwt(token: string): DecodedJwt | null {
  const parts = token.split('.')
  if (parts.length < 2) return null

  const headerRaw = safeJsonParse(decodeBase64Url(parts[0]))
  const payloadRaw = safeJsonParse(decodeBase64Url(parts[1]))

  if (!isRecord(headerRaw)) return null
  if (!isBlueNetJwtPayload(payloadRaw)) return null

  return { header: headerRaw as BlueNetJwtHeader, payload: payloadRaw }
}

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('bluenet_token')?.value

  if (!token) {
    return NextResponse.json<BlueUserResponse>({ authenticated: false }, { status: 401 })
  }

  const decoded = decodeJwt(token)
  if (!decoded) {
    return NextResponse.json<BlueUserResponse>({ authenticated: false, error: 'Invalid token format' }, { status: 401 })
  }

  const exp = new Date(decoded.payload.exp * 1000).toISOString()

  return NextResponse.json<BlueUserResponse>(
    {
      authenticated: true,
      user: {
        id: decoded.payload.sub,
        username: decoded.payload.username,
        email: null,
        role: decoded.payload.role,
      },
      exp,
      jwt: decoded,
    },
    { status: 200 }
  )
}
