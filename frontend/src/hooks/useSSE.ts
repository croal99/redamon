import { useEffect, useRef } from "react"

export const useSSE = (url: string | null, handlers: Record<string, (data: unknown) => void>) => {
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!url) return
    const es = new EventSource(url)
    esRef.current = es
    Object.entries(handlers).forEach(([event, handler]) => {
      es.addEventListener(event, (e: MessageEvent) => {
        handler(JSON.parse(e.data))
      })
    })
    es.onerror = () => es.close()
    return () => es.close()
  }, [url])

  return { close: () => esRef.current?.close() }
}
