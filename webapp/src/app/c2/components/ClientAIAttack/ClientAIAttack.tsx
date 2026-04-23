'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { CenterClientInfo } from '../../types/center'
import styles from './ClientAIAttack.module.css'

type AttackPreset = {
  id: string
  title: string
  description: string
  prompt: string
}

type AgentFeature = {
  title: string
  description: string
}

const AGENT_FEATURES: AgentFeature[] = [
  { title: '多 Agent 协作', description: '支持不同能力代理分工执行。' },
  { title: '智能工具选择', description: '由 Agent 自动选择工具和参数，减少手工编排。' },
  { title: '攻击链发现', description: '根据目标上下文自动迭代攻击路径。' },
  { title: '漏洞情报联动', description: '可围绕 CVE 与资产信息生成验证与利用步骤。' },
  { title: '结果可解释', description: '实时显示阶段、思考、工具输出和总结。' },
  { title: '会话可控', description: '支持人工中止，适配实战中的安全边界控制。' },
]

const ATTACK_PRESETS: AttackPreset[] = [
  {
    id: 'attack-chain',
    title: 'Attack Chain Discovery',
    description: '自动梳理可行攻击链并给出下一步执行建议。',
    prompt: 'Analyze this client and propose a prioritized attack chain with concrete tool actions and risk notes.',
  },
  {
    id: 'cve-intel',
    title: 'CVE Intelligence',
    description: '结合主机信息进行漏洞枚举、利用前置条件和验证步骤输出。',
    prompt: 'Use CVE intelligence on this client host and return exploitable findings with verification commands.',
  },
  {
    id: 'bug-bounty',
    title: 'Bug Bounty Agent',
    description: '以赏金视角给出高价值目标点、验证路径与证据清单。',
    prompt: 'Act as a bug bounty agent and identify high-value vulnerabilities and PoC steps for this target.',
  },
  {
    id: 'ctf-solver',
    title: 'CTF Solver Agent',
    description: '生成 CTF/演练场景下的分阶段解题与提权策略。',
    prompt: 'Act as a CTF solver: propose exploitation steps, privilege escalation ideas, and fallback plans.',
  },
]

export type ClientAIAttackProps = {
  client: CenterClientInfo
}

type SseEventType = 'thinking' | 'tool_call' | 'tool_result' | 'result' | 'error' | 'done'

type SseThinkingEvent = { type: 'thinking'; node: string; content: string }
type SseToolCallEvent = { type: 'tool_call'; node: string; tool: string; args: Record<string, unknown> }
type SseToolResultEvent = { type: 'tool_result'; node: string; content: string }
type SseResultEvent = { type: 'result'; content: string }
type SseErrorEvent = { type: 'error'; content: string }
type SseDoneEvent = { type: 'done' }

type SseEvent =
  | SseThinkingEvent
  | SseToolCallEvent
  | SseToolResultEvent
  | SseResultEvent
  | SseErrorEvent
  | SseDoneEvent

const AGENT_API_BASE = '/api/icenter/agent'

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

/**
 * createSessionId: 为每个 Client 生成稳定的 AI 攻击会话标识，避免多终端冲突。
 */
function createSessionId(clientId?: string) {
  const seed = clientId || 'unknown-client'
  return `c2-ai-attack-${seed}-${Date.now()}`
}

/**
 * ClientAIAttack: 在 C2 Client 视图中接入 HexStrike 风格 MCP Agent 攻击能力入口。
 */
export function ClientAIAttack({ client }: ClientAIAttackProps) {
  const [, setSessionId] = useState(() => createSessionId(client.client_id))
  const [prompt, setPrompt] = useState('')
  const [lastResponse, setLastResponse] = useState('')
  const [currentPhase, setCurrentPhase] = useState('idle')
  const [iterationCount, setIterationCount] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const [findingsMarkdown, setFindingsMarkdown] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [activeTab, setActiveTab] = useState<'logs' | 'findings'>('logs')
  const [progressText, setProgressText] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const targetSummary = client.remote_addr || client.hostname || client.client_id || 'unknown target'

  useEffect(() => {
    setSessionId(createSessionId(client.client_id))
    setPrompt('')
    setLastResponse('')
    setCurrentPhase('idle')
    setIterationCount(0)
    setLogs([])
    setFindingsMarkdown('')
    setIsRunning(false)
    setActiveTab('logs')
    setProgressText('')
    abortRef.current?.abort()
    abortRef.current = null
  }, [client.client_id])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      abortRef.current = null
    }
  }, [])

  /**
   * appendLog: 统一维护日志窗口长度，避免超长列表影响渲染性能。
   */
  const appendLog = useCallback((line: string) => {
    setLogs(prev => {
      const next = [...prev, `${new Date().toLocaleTimeString()}  ${line}`]
      if (next.length > 120) return next.slice(next.length - 120)
      return next
    })
  }, [])

  /**
   * handleRunAttack: 提交 AI 攻击任务给 MCP Agent。
   */
  const handleRunAttack = useCallback(async () => {
    const finalPrompt = prompt.trim()
    if (!finalPrompt || isRunning) return

    const wrappedPrompt = [
      `Target Context: ${targetSummary}`,
      `Client ID: ${client.client_id || 'unknown'}`,
      '',
      finalPrompt,
    ].join('\n')

    appendLog('dispatch attack query')
    setIsRunning(true)
    setFindingsMarkdown('')
    setLastResponse('')
    setCurrentPhase('running')
    setIterationCount(0)
    setActiveTab('logs')
    setProgressText('准备中')

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await streamAgentChat({
        message: wrappedPrompt,
        signal: controller.signal,
        onEvent: (evt) => {
          if (evt.type === 'thinking') {
            appendLog(`thinking -> ${evt.node || 'agent'}: ${evt.content.slice(0, 50)}...`)
            setCurrentPhase('thinking')
            setProgressText('思考中')
            setIterationCount(prev => prev + 1)
          } else if (evt.type === 'tool_call') {
            appendLog(`tool start -> ${evt.tool}`)
            setCurrentPhase('tool_call')
            setProgressText(`调用工具：${evt.tool}`)
            setIterationCount(prev => prev + 1)
          } else if (evt.type === 'tool_result') {
            appendLog(`tool complete -> ${evt.node || 'unknown'}`)
            setCurrentPhase('tool_result')
            setProgressText(`工具完成：${evt.node || 'unknown'}`)
            setIterationCount(prev => prev + 1)
          } else if (evt.type === 'result') {
            setLastResponse(evt.content)
            setFindingsMarkdown(evt.content)
            setCurrentPhase('result')
            setProgressText('生成结果中')
            setIterationCount(prev => prev + 1)
          } else if (evt.type === 'error') {
            appendLog(`error -> ${evt.content}`)
            setLastResponse(`Error: ${evt.content}`)
            setFindingsMarkdown(`Error: ${evt.content}`)
            setCurrentPhase('error')
            setProgressText('失败')
          } else if (evt.type === 'done') {
            appendLog('task complete')
            setCurrentPhase('idle')
            setProgressText('')
            setActiveTab('findings')
          }
        }
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      if (!controller.signal.aborted) {
        appendLog(`error -> ${message}`)
        setLastResponse(`Error: ${message}`)
        setFindingsMarkdown(`Error: ${message}`)
        setCurrentPhase('error')
        setProgressText('失败')
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setIsRunning(false)
      if (abortRef.current !== controller) setCurrentPhase('idle')
    }
  }, [appendLog, client.client_id, isRunning, prompt, targetSummary])

  /**
   * handleApplyPreset: 应用预置 Agent 任务模板，便于快速触发常见场景。
   */
  const handleApplyPreset = useCallback((preset: AttackPreset) => {
    setPrompt(preset.prompt)
    appendLog(`preset selected -> ${preset.title}`)
  }, [appendLog])

  /**
   * handleStopAttack: 主动停止当前 Agent 执行。
   */
  const handleStopAttack = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsRunning(false)
    appendLog('stop signal sent')
    setCurrentPhase('idle')
    setProgressText('')
  }, [appendLog])

  const canRun = !isRunning && prompt.trim().length > 0
  const statusText = useMemo(() => {
    if (!isRunning) return '就绪'
    if (!progressText) return '运行中'
    return `运行中 · ${progressText}`
  }, [isRunning, progressText])

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h4 className={styles.title}>AI Attack Agents</h4>
        <div className={`${styles.badge} ${isRunning ? styles.badgeOk : styles.badgeWarn}`}>
          {statusText}
        </div>
      </div>

      <div className={styles.meta}>
        <span>Target: {targetSummary}</span>
        <span>Phase: {currentPhase}</span>
        <span>Iteration: {iterationCount}</span>
      </div>

      <div className={styles.features}>
        {AGENT_FEATURES.map(feature => (
          <div key={feature.title} className={styles.featureCard}>
            <div className={styles.featureTitle}>{feature.title}</div>
            <div className={styles.featureDesc}>{feature.description}</div>
          </div>
        ))}
      </div>

      <div className={styles.presetList}>
        {ATTACK_PRESETS.map(preset => (
          <button
            key={preset.id}
            type="button"
            className={styles.presetBtn}
            onClick={() => handleApplyPreset(preset)}
          >
            <span className={styles.presetTitle}>{preset.title}</span>
            <span className={styles.presetDesc}>{preset.description}</span>
          </button>
        ))}
      </div>

      <div className={styles.editor}>
        <textarea
          className={styles.textarea}
          rows={1}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="输入攻击目标、约束和预期结果，例如：Enumerate attack paths and prioritize by exploitability."
        />
        <div className={styles.actions}>
          <button type="button" className={styles.primaryBtn} onClick={handleRunAttack} disabled={!canRun}>
            启动 Agent
          </button>
          <button type="button" className={styles.secondaryBtn} onClick={handleStopAttack} disabled={!isRunning}>
            停止执行
          </button>
        </div>
      </div>

      <div className={styles.panels}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitle}>输出</div>
            <div className={styles.tabBar}>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'findings' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('findings')}
                aria-pressed={activeTab === 'findings'}
              >
                关键发现
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'logs' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('logs')}
                aria-pressed={activeTab === 'logs'}
              >
                实时日志
              </button>
            </div>
          </div>

          {activeTab === 'logs' ? (
            <pre className={styles.logBox}>{logs.length > 0 ? logs.join('\n') : '暂无日志'}</pre>
          ) : (
            <div className={styles.markdownBox}>
              {findingsMarkdown ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{findingsMarkdown}</ReactMarkdown>
              ) : (
                <div className={styles.emptyState}>暂无关键发现</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.resultPanel}>
        <div className={styles.panelTitle}>Agent 输出</div>
        <pre className={styles.resultText}>{lastResponse || '暂无输出'}</pre>
      </div>
    </div>
  )
}
