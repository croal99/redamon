'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, Send, Trash2, User, X } from 'lucide-react'
import type { CenterClientInfo } from '../../types/center'
import styles from './AIChat.module.css'

type ChatRole = 'user' | 'assistant' | 'system'

type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  createdAt: number
  streaming?: boolean
  error?: boolean
  toolCalls?: Array<{ tool: string; args: Record<string, unknown> }>
  toolResults?: string[]
  thinking?: string[]
}

type SseEventType = 'thinking' | 'tool_call' | 'tool_result' | 'result' | 'error' | 'done'

type SseThinkingEvent = {
  type: 'thinking'
  node: string
  content: string
}

type SseToolCallEvent = {
  type: 'tool_call'
  node: string
  tool: string
  args: Record<string, unknown>
}

type SseToolResultEvent = {
  type: 'tool_result'
  node: string
  content: string
}

type SseResultEvent = {
  type: 'result'
  content: string
}

type SseErrorEvent = {
  type: 'error'
  content: string
}

type SseDoneEvent = {
  type: 'done'
}

type SseEvent =
  | SseThinkingEvent
  | SseToolCallEvent
  | SseToolResultEvent
  | SseResultEvent
  | SseErrorEvent
  | SseDoneEvent

const AGENT_API_BASE = '/api/icenter/agent'

/**
 * extractTerminalCommands: 从 assistant 文本中提取 ```terminal / ```bash 等代码块里的命令（每行一条）。
 */
function extractTerminalCommands(content: string): string[] {
  if (!content) return []
  const results: string[] = []
  const re = /```(?:terminal|bash|sh|shell|zsh|fish|powershell|pwsh|cmd|console)\s*([\s\S]*?)```/gi
  let match: RegExpExecArray | null = null
  while ((match = re.exec(content)) !== null) {
    const block = match[1] ?? ''
    const nestedFenceRe = /```(?:bash|sh|shell|zsh|fish|powershell|pwsh|cmd|console)?\s*([\s\S]*?)```/gi
    const nestedBlocks: string[] = []
    let nestedMatch: RegExpExecArray | null = null
    while ((nestedMatch = nestedFenceRe.exec(block)) !== null) {
      const inner = (nestedMatch[1] ?? '').trim()
      if (inner) nestedBlocks.push(inner)
    }

    const sourceText = nestedBlocks.length ? nestedBlocks.join('\n') : block
    for (const rawLine of sourceText.split('\n')) {
      const line = rawLine.trim()
      if (!line) continue
      if (line.startsWith('```')) continue
      const normalized = line
        .replace(/^(?:[>*$#]\s*)+/, '')
        .trim()
      if (!normalized) continue
      results.push(normalized)
    }
  }
  return results
}

function extractExecutableCommands(content: string): string[] {
  return extractTerminalCommands(content)
}

/**
 * truncateForAgent: 限制回传给 Agent 的输出长度，避免过长导致响应不稳定。
 */
function truncateForAgent(text: string, maxChars = 8000) {
  if (text.length <= maxChars) return text
  const head = text.slice(0, Math.floor(maxChars * 0.7))
  const tail = text.slice(-Math.floor(maxChars * 0.25))
  return `${head}\n\n...[truncated ${text.length - head.length - tail.length} chars]...\n\n${tail}`
}

/**
 * createSessionId: 为每个 Client 创建会话 ID，便于前端侧做状态隔离与追踪。
 */
function createSessionId(clientId?: string) {
  const seed = clientId || 'unknown-client'
  return `c2-ai-chat-${seed}-${Date.now()}`
}

/**
 * createMessageId: 生成稳定且低冲突概率的消息 ID，用于前端渲染与更新。
 */
function createMessageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/**
 * isRecord: 轻量类型守卫，确保解析后的 payload 是对象。
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object'
}

/**
 * streamAgentChat: 通过 fetch + ReadableStream 消费 Agent API 的 SSE 流（支持 POST）。
 */
async function streamAgentChat(options: {
  message: string
  onEvent: (event: SseEvent) => void
  signal?: AbortSignal
}) {
  const { message, onEvent, signal } = options

  const response = await fetch(`${AGENT_API_BASE}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ message }),
    signal,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `Agent API 请求失败：HTTP ${response.status}`)
  }

  if (!response.body) {
    throw new Error('Agent API 响应体为空')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  while (true) {
    if (signal?.aborted) break
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const jsonStr = trimmed.slice(5).trim()
      if (!jsonStr) continue

      let parsed: unknown = null
      try {
        parsed = JSON.parse(jsonStr) as unknown
      } catch {
        continue
      }

      if (!isRecord(parsed) || typeof parsed.type !== 'string') continue
      const type = parsed.type as SseEventType
      if (type === 'thinking' && typeof parsed.node === 'string' && typeof parsed.content === 'string') {
        onEvent({ type, node: parsed.node, content: parsed.content })
      } else if (type === 'tool_call' && typeof parsed.node === 'string' && typeof parsed.tool === 'string') {
        const args = isRecord(parsed.args) ? parsed.args : {}
        onEvent({ type, node: parsed.node, tool: parsed.tool, args })
      } else if (type === 'tool_result' && typeof parsed.node === 'string' && typeof parsed.content === 'string') {
        onEvent({ type, node: parsed.node, content: parsed.content })
      } else if (type === 'result' && typeof parsed.content === 'string') {
        onEvent({ type, content: parsed.content })
      } else if (type === 'error' && typeof parsed.content === 'string') {
        onEvent({ type, content: parsed.content })
      } else if (type === 'done') {
        onEvent({ type })
        reader.cancel().catch(() => {})
        return
      }
    }
  }
}

export type AIChatProps = {
  client: CenterClientInfo
  runTerminalCommand?: (command: string, options?: { silenceMs?: number; timeoutMs?: number; maxChars?: number }) => Promise<string>
}

/**
 * AIChat: 在 C2 Client 视图中提供与 Agent API SSE 的对话能力（POST + text/event-stream）。
 */
export function AIChat({ client, runTerminalCommand }: AIChatProps) {
  const [sessionId, setSessionId] = useState(() => createSessionId(client.client_id))
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [runningCommand, setRunningCommand] = useState<string | null>(null)
  const [autoRunCommands, setAutoRunCommands] = useState(true)
  const [pendingAgentMessageCount, setPendingAgentMessageCount] = useState(0)

  const abortRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const executedCommandKeysRef = useRef<Set<string>>(new Set())
  const pendingAgentMessagesRef = useRef<string[]>([])

  useEffect(() => {
    setSessionId(createSessionId(client.client_id))
    setMessages([])
    setInput('')
    setError(null)
    abortRef.current?.abort()
    abortRef.current = null
    executedCommandKeysRef.current.clear()
    pendingAgentMessagesRef.current = []
    setPendingAgentMessageCount(0)
  }, [client.client_id])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      abortRef.current = null
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isSending])

  const canSend = useMemo(() => {
    return !isSending && input.trim().length > 0
  }, [input, isSending])

  const handleClear = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsSending(false)
    setError(null)
    setMessages([])
    executedCommandKeysRef.current.clear()
    pendingAgentMessagesRef.current = []
    setPendingAgentMessageCount(0)
  }, [])

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsSending(false)
  }, [])

  const handleNewTask = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsSending(false)
    setError(null)
    setMessages([])
    setInput('')
    setSessionId(createSessionId(client.client_id))
    executedCommandKeysRef.current.clear()
    pendingAgentMessagesRef.current = []
    setPendingAgentMessageCount(0)
  }, [client.client_id])

  const appendSystemMessage = useCallback((content: string) => {
    const message: ChatMessage = {
      id: createMessageId('system'),
      role: 'system',
      content,
      createdAt: Date.now(),
    }
    setMessages(prev => [...prev, message])
  }, [])

  const sendToAgent = useCallback(async (messageText: string) => {
    const trimmed = messageText.trim()
    if (!trimmed || isSending) return

    setError(null)
    setIsSending(true)

    const enriched = client.client_id ? `client_id=${client.client_id}\n${trimmed}` : trimmed

    const userMessage: ChatMessage = {
      id: createMessageId('user'),
      role: 'user',
      content: trimmed,
      createdAt: Date.now(),
    }

    const assistantId = createMessageId('assistant')
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      streaming: true,
      error: false,
      toolCalls: [],
      toolResults: [],
      thinking: [],
    }

    setMessages(prev => [...prev, userMessage, assistantMessage])
    setInput('')

    const controller = new AbortController()
    abortRef.current = controller

    const updateAssistant = (updater: (m: ChatMessage) => ChatMessage) => {
      setMessages(prev => prev.map(m => (m.id === assistantId ? updater(m) : m)))
    }

    try {
      await streamAgentChat({
        message: enriched,
        signal: controller.signal,
        onEvent: (evt) => {
          if (evt.type === 'thinking') {
            updateAssistant(m => ({
              ...m,
              thinking: [...(m.thinking ?? []), evt.content],
            }))
            return
          }

          if (evt.type === 'tool_call') {
            updateAssistant(m => ({
              ...m,
              toolCalls: [...(m.toolCalls ?? []), { tool: evt.tool, args: evt.args }],
            }))
            return
          }

          if (evt.type === 'tool_result') {
            updateAssistant(m => ({
              ...m,
              toolResults: [...(m.toolResults ?? []), evt.content],
            }))
            return
          }

          if (evt.type === 'result') {
            updateAssistant(m => ({ ...m, content: evt.content }))
            return
          }

          if (evt.type === 'error') {
            updateAssistant(m => ({
              ...m,
              content: evt.content,
              error: true,
              streaming: false,
            }))
            return
          }

          if (evt.type === 'done') {
            updateAssistant(m => ({ ...m, streaming: false }))
            setIsSending(false)
          }
        },
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      if (controller.signal.aborted) {
        updateAssistant(m => ({
          ...m,
          content: m.content || '[stopped]',
          streaming: false,
        }))
      } else {
        setError(message)
        updateAssistant(m => ({
          ...m,
          content: `Error: ${message}`,
          error: true,
          streaming: false,
        }))
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setIsSending(false)
    }
  }, [client.client_id, isSending])

  useEffect(() => {
    if (isSending) return
    if (pendingAgentMessageCount <= 0) return
    const next = pendingAgentMessagesRef.current.shift()
    setPendingAgentMessageCount(pendingAgentMessagesRef.current.length)
    if (!next) return
    void sendToAgent(next)
  }, [isSending, pendingAgentMessageCount, sendToAgent])

  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isSending) return
    setInput('')
    await sendToAgent(trimmed)
  }, [input, isSending, sendToAgent])

  const handleExecuteTerminalCommand = useCallback(
    async (command: string) => {
      if (!command.trim()) return
      if (runningCommand) return
      if (!runTerminalCommand) {
        setError('当前终端未接入，无法执行命令')
        return
      }

      setError(null)
      setRunningCommand(command)
      let output = ''
      try {
        appendSystemMessage(`自动执行 terminal 命令：\n${command}`)
        output = await runTerminalCommand(command)
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error'
        output = `Error: ${message}`
      } finally {
        setRunningCommand(null)
      }

      const clientTag = client.client_id ? `client_id=${client.client_id}` : 'client_id=unknown'
      const payload = truncateForAgent(output || '(无输出)')
      const followup = `我已在终端执行命令（${clientTag}）：\n${command}\n\n输出如下：\n${payload}\n\n请基于输出继续分析并给出下一步建议；如果仍需执行命令，请继续用 \`\`\`terminal 代码块输出。`
      if (isSending) {
        pendingAgentMessagesRef.current.push(followup)
        setPendingAgentMessageCount(pendingAgentMessagesRef.current.length)
        appendSystemMessage('命令执行完成，等待当前回复结束后自动回传给 AI 分析。')
        return
      }
      await sendToAgent(followup)
    },
    [appendSystemMessage, client.client_id, isSending, runTerminalCommand, runningCommand, sendToAgent]
  )

  useEffect(() => {
    if (!autoRunCommands) return
    if (!runTerminalCommand) return
    if (runningCommand) return

    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i]
      if (m.role !== 'assistant') continue
      if (m.streaming) continue
      const cmds = extractExecutableCommands(m.content || '')
      if (!cmds.length) continue
      for (const cmd of cmds) {
        const key = `${m.id}:${cmd}`
        if (executedCommandKeysRef.current.has(key)) continue
        executedCommandKeysRef.current.add(key)
        void handleExecuteTerminalCommand(cmd)
        return
      }
    }
  }, [autoRunCommands, handleExecuteTerminalCommand, messages, runTerminalCommand, runningCommand])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        void handleSend()
      }
    },
    [handleSend]
  )

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div className={styles.headerLeft}>
          <span className={styles.statusChip}>AI 在线</span>
          <button
            type="button"
            className={`${styles.autoRunChip} ${autoRunCommands ? styles.autoRunChipOn : styles.autoRunChipOff}`}
            onClick={() => setAutoRunCommands(prev => !prev)}
            disabled={!runTerminalCommand}
            aria-pressed={autoRunCommands}
            title={runTerminalCommand ? '自动执行 AI 提供的 terminal 命令，并将输出回传给 AI 分析' : '终端未接入，无法自动执行命令'}
          >
            自动执行：{autoRunCommands ? '开' : '关'}
          </button>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.secondaryBtn} onClick={handleClear}>
            <Trash2 size={14} />
            清空
          </button>
          <button type="button" className={styles.primaryBtn} onClick={handleNewTask}>
            新建任务
          </button>
        </div>
      </div>

      {error ? <div className={styles.errorBox}>{error}</div> : null}

      <div className={styles.chatArea}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            你好！我是远程维护 AI 助手。你可以询问磁盘、内存、CPU 状态，或执行远程操作。
          </div>
        ) : (
          messages.map(m => (
            <div key={m.id} className={`${styles.msgRow} ${m.role === 'user' ? styles.msgUser : styles.msgAssistant}`}>
              <div className={styles.avatar}>
                {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div className={styles.bubble}>
                {m.role === 'assistant' && (m.toolCalls?.length || m.toolResults?.length || m.thinking?.length) ? (
                  <div className={styles.toolBlock}>
                    {m.toolCalls?.length ? (
                      <details className={styles.toolSection} open>
                        <summary className={styles.toolSummary}>工具调用（{m.toolCalls.length}）</summary>
                        <div className={styles.toolList}>
                          {m.toolCalls.map((tc, idx) => (
                            <details key={`${m.id}-tc-${idx}`} className={styles.toolItem}>
                              <summary className={styles.toolItemSummary}>工具调用：{tc.tool}</summary>
                              <pre className={styles.toolPre}>{JSON.stringify(tc.args, null, 2)}</pre>
                            </details>
                          ))}
                        </div>
                      </details>
                    ) : null}

                    {m.toolResults?.length ? (
                      <details className={styles.toolSection}>
                        <summary className={styles.toolSummary}>工具结果（{m.toolResults.length}）</summary>
                        <div className={styles.toolList}>
                          {m.toolResults.map((r, idx) => (
                            <pre key={`${m.id}-tr-${idx}`} className={styles.toolPre}>{r}</pre>
                          ))}
                        </div>
                      </details>
                    ) : null}

                    {m.thinking?.length ? (
                      <details className={styles.toolSection}>
                        <summary className={styles.toolSummary}>思考（{m.thinking.length}）</summary>
                        <div className={styles.toolList}>
                          {m.thinking.map((t, idx) => (
                            <div key={`${m.id}-th-${idx}`} className={styles.thinkingLine}>{t}</div>
                          ))}
                        </div>
                      </details>
                    ) : null}
                  </div>
                ) : null}

                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {m.content || (m.role === 'assistant' && (m.streaming || isSending) ? '...' : '')}
                </ReactMarkdown>
                {m.role === 'assistant'
                  ? (() => {
                      const cmds = extractExecutableCommands(m.content || '')
                      if (!cmds.length) return null
                      return (
                        <div className={styles.commandBlock}>
                          <div className={styles.commandTitle}>可执行命令</div>
                          {cmds.map((cmd, idx) => {
                            const isThisRunning = runningCommand === cmd
                            return (
                              <div key={`${m.id}-cmd-${idx}`} className={styles.commandRow}>
                                <code className={styles.commandText}>{cmd}</code>
                                <button
                                  type="button"
                                  className={styles.commandBtn}
                                  onClick={() => void handleExecuteTerminalCommand(cmd)}
                                  disabled={!runTerminalCommand || isSending || !!runningCommand}
                                >
                                  {isThisRunning ? '执行中' : '执行'}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()
                  : null}
                {m.streaming ? <span className={styles.streamingCursor} /> : null}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.composer}>
        <textarea
          className={styles.textarea}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息，Enter 发送，Shift+Enter 换行..."
          disabled={isSending}
        />
        <button type="button" className={styles.secondaryBtn} onClick={handleStop} disabled={!isSending}>
          <X size={14} />
          停止
        </button>
        <button type="button" className={styles.primaryBtn} onClick={handleSend} disabled={!canSend}>
          <Send size={14} />
          发送
        </button>
      </div>
    </div>
  )
}
