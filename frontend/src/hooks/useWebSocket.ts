import { useEffect, useRef, useCallback } from "react"

export const useWebSocket = (url: string | null, onMessage: (msg: unknown) => void) => {
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!url) return
    const connect = () => {
      const ws = new WebSocket(url)
      wsRef.current = ws
      ws.onmessage = (e) => {
        const data = JSON.parse(e.data)
        onMessage(data)
      }
      ws.onclose = () => {
        setTimeout(connect, 3000)
      }
      ws.onerror = (e) => console.error("WS error:", e)
    }
    connect()
    return () => wsRef.current?.close()
  }, [url])

  const send = useCallback((msg: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  return { send }
}
