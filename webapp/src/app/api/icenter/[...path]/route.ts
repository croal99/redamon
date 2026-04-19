/**
 * iCenter Rooms API 代理（HTTP）
 *
 * 将 WebApp 的 HTTP 请求转发到外部 iCenter rooms 服务，接口约定参考：
 * - /Volumes/CODE/CTA/03.byg_6.3/icenter/rooms/router/room_router.go
 *
 * 注意事项：
 * - WebSocket Upgrade（例如 GET /roomapi/tunnel）无法通过 Next.js Route Handler 进行代理。
 *   对这些路径，本接口会返回 501，并给出上游 WebSocket 直连地址提示。
 * - 本代理采用 catch-all 路由，避免为每个 rooms 端点创建大量文件，方便与 Go Router 保持一致。
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ICENTER_ROOMS_API_URL =
  process.env.ICENTER_ROOMS_API_URL ||
  process.env.NEXT_PUBLIC_ICENTER_ROOMS_API_URL ||
  'http://localhost:7080'

/**
 * 判断当前请求是否尝试进行 WebSocket Upgrade（此处不支持代理 WebSocket Upgrade）。
 */
function isWebSocketUpgradeRequest(request: NextRequest): boolean {
  const upgrade = request.headers.get('upgrade')
  return typeof upgrade === 'string' && upgrade.toLowerCase() === 'websocket'
}

/**
 * 构造转发到上游的请求头，过滤掉不应转发的 hop-by-hop 头部。
 */
function buildUpstreamHeaders(request: NextRequest): Headers {
  const headers = new Headers()
  request.headers.forEach((value, key) => {
    const k = key.toLowerCase()
    if (k === 'host') return
    if (k === 'connection') return
    if (k === 'content-length') return
    headers.set(key, value)
  })
  return headers
}

/**
 * 构造返回给浏览器的响应头，过滤掉不应透传的 hop-by-hop 头部，并禁用缓存。
 */
function buildDownstreamHeaders(upstreamHeaders: Headers): Headers {
  const headers = new Headers()
  upstreamHeaders.forEach((value, key) => {
    const k = key.toLowerCase()
    if (k === 'connection') return
    if (k === 'transfer-encoding') return
    headers.set(key, value)
  })
  headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  headers.set('Pragma', 'no-cache')
  headers.set('Expires', '0')
  return headers
}

/**
 * 根据 catch-all 路由的 path 段与 query string 拼接出上游 URL。
 */
async function resolveUpstreamUrl(
  request: NextRequest,
  params: Promise<{ path: string[] }>
): Promise<{ pathString: string; upstreamUrl: string }> {
  const { path } = await params
  const pathString = (path || []).join('/')
  const url = new URL(request.url)
  const upstreamUrl = `${ICENTER_ROOMS_API_URL}/${pathString}${url.search}`
  return { pathString, upstreamUrl }
}

/**
 * 将传入请求转发到 iCenter rooms 服务并返回其响应。
 */
async function proxyToIcenter(
  request: NextRequest,
  params: Promise<{ path: string[] }>
): Promise<Response> {
  const { pathString, upstreamUrl } = await resolveUpstreamUrl(request, params)

  if (pathString === 'roomapi/tunnel' && isWebSocketUpgradeRequest(request)) {
    return NextResponse.json(
      {
        error: 'Next.js API 路由不支持 WebSocket 代理',
        suggestion: '请使用浏览器直连上游 WebSocket 地址',
        backend_url: upstreamUrl.replace(/^http/i, (m) => (m.toLowerCase() === 'https' ? 'wss' : 'ws')),
      },
      { status: 501 }
    )
  }

  const method = request.method.toUpperCase()
  const headers = buildUpstreamHeaders(request)
  const hasBody = method !== 'GET' && method !== 'HEAD'

  const upstreamResp = await fetch(upstreamUrl, {
    method,
    headers,
    body: hasBody ? request.body : undefined,
    duplex: hasBody ? 'half' : undefined,
    cache: 'no-store',
  } as RequestInit)

  const downstreamHeaders = buildDownstreamHeaders(upstreamResp.headers)
  return new Response(upstreamResp.body, {
    status: upstreamResp.status,
    headers: downstreamHeaders,
  })
}

/**
 * 处理 GET：转发到 iCenter rooms。
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  try {
    return await proxyToIcenter(request, ctx.params)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '请求转发失败' },
      { status: 502 }
    )
  }
}

/**
 * 处理 POST：转发到 iCenter rooms。
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  try {
    return await proxyToIcenter(request, ctx.params)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '请求转发失败' },
      { status: 502 }
    )
  }
}

/**
 * 处理 PUT：转发到 iCenter rooms。
 */
export async function PUT(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  try {
    return await proxyToIcenter(request, ctx.params)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '请求转发失败' },
      { status: 502 }
    )
  }
}

/**
 * 处理 PATCH：转发到 iCenter rooms。
 */
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  try {
    return await proxyToIcenter(request, ctx.params)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '请求转发失败' },
      { status: 502 }
    )
  }
}

/**
 * 处理 DELETE：转发到 iCenter rooms。
 */
export async function DELETE(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  try {
    return await proxyToIcenter(request, ctx.params)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '请求转发失败' },
      { status: 502 }
    )
  }
}

/**
 * 处理 OPTIONS（CORS 预检）。行为与 Go Router 中的宽松 CORS 头保持一致。
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  })
}
