import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ICENTER_AGENT_API_URL = 'http://localhost:8088'

type StreamChatRequestBody = {
  message?: unknown
}

/**
 * POST: 代理 iCenter Agent API 的 SSE Chat Stream 到前端，避免浏览器侧直连后端造成 CORS 与网络暴露问题。
 */
export async function POST(request: NextRequest) {
  let body: StreamChatRequestBody | null = null
  try {
    body = (await request.json()) as StreamChatRequestBody
  } catch {
    body = null
  }

  const message = typeof body?.message === 'string' ? body.message : ''
  if (!message.trim()) {
    return new Response(JSON.stringify({ error: 'Missing message' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const upstream = await fetch(`${ICENTER_AGENT_API_URL}/agent/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ message }),
    signal: request.signal,
  })

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => '')
    return new Response(
      JSON.stringify({ error: text || `Upstream HTTP ${upstream.status}` }),
      { status: upstream.status, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

