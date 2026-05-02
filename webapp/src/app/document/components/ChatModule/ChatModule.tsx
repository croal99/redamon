'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '@/components/ui'
import styles from './ChatModule.module.css'

const DEFAULT_UID = '1'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export function ChatModule() {
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement | null>(null)

  const [question, setQuestion] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'assistant:welcome',
      role: 'assistant',
      content: '你好，我可以基于你的私有知识库进行问答。请先在「📚 知识库」上传文档。',
    },
  ])
  const [sources, setSources] = useState<string[]>([])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const canSend = useMemo(() => question.trim().length > 0 && !sending, [question, sending])

  const send = useCallback(async () => {
    const q = question.trim()
    if (!q || sending) return

    setSending(true)
    setSources([])
    setMessages(prev => [
      ...prev,
      { id: `user:${Date.now()}`, role: 'user', content: q },
    ])
    setQuestion('')

    try {
      const res = await fetch('/api/knowledge-base/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: DEFAULT_UID, question: q }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || data?.code !== 200) {
        const msg = data?.msg || `HTTP ${res.status}`
        throw new Error(msg)
      }

      setMessages(prev => [
        ...prev,
        { id: `assistant:${Date.now()}`, role: 'assistant', content: String(data?.answer || '') },
      ])
      setSources(Array.isArray(data?.sources) ? data.sources.map((s: unknown) => String(s)) : [])
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      toast.error(`对话失败：${msg}`)
      setMessages(prev => [
        ...prev,
        { id: `assistant:error:${Date.now()}`, role: 'assistant', content: `对话失败：${msg}` },
      ])
    } finally {
      setSending(false)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [question, sending, toast])

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.title}>💬 AI对话</div>
        <div className={styles.subtitle}>基于私有知识库内容进行问答（模拟后端检索 + 生成）</div>
      </div>

      <div className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">对话面板</div>
            <div className="cardSubtitle">当前接入 /api/knowledge-base/chat（mock），并返回参考来源</div>
          </div>
        </div>
        <div className="cardBody">
          <div className={styles.chatArea}>
            {messages.map(m => (
              <div key={m.id} className={m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant}>
                {m.content}
              </div>
            ))}
          </div>

          {sources.length > 0 && (
            <div className={styles.sources}>
              <div className={styles.sourcesLabel}>参考来源</div>
              <div className={styles.tags}>
                {sources.map(s => (
                  <span key={s} className={styles.tag}>{s}</span>
                ))}
              </div>
            </div>
          )}

          <div className={styles.inputRow}>
            <input
              ref={inputRef}
              className={styles.input}
              placeholder="输入问题…"
              spellCheck={false}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send()
                }
              }}
              disabled={sending}
            />
            <button className="primaryButton" onClick={() => void send()} disabled={!canSend}>
              {sending ? '发送中…' : '发送'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
