'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { CenterClientInfo } from '../../types/center'
import { readSseStream } from '../../lib'
import styles from './ClientAIAttack.module.css'
import { useTerminal, type TerminalCommandMessage } from "../../hooks";

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

type ToolStartEvent = { name: string; args?: Record<string, unknown> }
type ToolCallEvent = {
  name: string
  tool_call_id: string
  args?: Record<string, unknown>
  requires_approval?: boolean
}
type FinalEvent = { content: string }
type ErrorEvent = { message: string }
type InfoEvent = { session_id: string; model?: string }

type LegacySseEventType = 'thinking' | 'tool_call' | 'tool_result' | 'result' | 'error' | 'done'

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object'
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
  const [sessionId, setSessionId] = useState<string | null>(null)
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

  const apiBase = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '')
    return base || 'http://localhost:8000'
  }, [])

  const postToolFeedback = useCallback(
    async (toolCallId: string, output: string, error?: string) => {
      await fetch(`${apiBase}/agent/chat/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool_call_id: toolCallId, output, error: error ?? null }),
      });
    },
    [apiBase],
  );

  useEffect(() => {
    setSessionId(null)
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

  const onCommand = useCallback(
    (command: TerminalCommandMessage) => {
      console.log("terminal command:", command);
      appendLog(`info -> ${command.session_id || 'unknown'}`);
      postToolFeedback(command.session_id, command.result);
    },
    [postToolFeedback],
  );

  const { status, content, initTerminal: connect, disconnect, sendCommandMessage } = useTerminal({ clientId: client?.client_id || '', onCommand });

  /**
   * handleRunAttack: 提交 AI 攻击任务给 MCP Agent。
   */
  const handleRunAttack = useCallback(async () => {
    const finalPrompt = prompt.trim()
    if (!finalPrompt || isRunning) return

    const wrappedPrompt = [
      `Target Context: ${targetSummary}`,
      `Client ID: ${client.client_id || 'unknown'}`,
      `Session Hint: ${createSessionId(client.client_id)}`,
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
      const resp = await fetch(`${apiBase}/agent/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ message: "使用HexStrike扫描192.168.31.1/24网络", session_id: sessionId }),
        signal: controller.signal,
      })

      if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(text || `Agent API 请求失败：HTTP ${resp.status}`)
      }

      let completed = false
      for await (const msg of readSseStream(resp)) {
        if (controller.signal.aborted) break

        if (msg.event === 'info') {
          const info = msg.data as InfoEvent
          if (info?.session_id) setSessionId(info.session_id)
          appendLog(`info -> session_id=${info?.session_id || 'unknown'}`)
          setIterationCount(prev => prev + 1)
          continue
        }

        if (msg.event === 'tool_start') {
          const ev = msg.data as ToolStartEvent
          appendLog(`tool start -> ${ev?.name || 'unknown'}`)
          setCurrentPhase('tool_call')
          setProgressText(`调用工具：${ev?.name || 'unknown'}`)
          setIterationCount(prev => prev + 1)
          continue
        }

        if (msg.event === 'tool_call') {
          const ev = msg.data as ToolCallEvent
          appendLog(`tool call -> ${ev?.name || 'unknown'}`)
          setCurrentPhase('tool_call')
          setProgressText(`调用工具：${ev?.name || 'unknown'}`)
          setIterationCount(prev => prev + 1)
          continue
        }

        if (msg.event === 'final') {
          const ev = msg.data as FinalEvent
          setLastResponse(ev?.content || '')
          setFindingsMarkdown(ev?.content || '')
          setCurrentPhase('result')
          setProgressText('生成结果中')
          setIterationCount(prev => prev + 1)
          continue
        }

        if (msg.event === 'error') {
          const ev = msg.data as ErrorEvent
          const err = ev?.message || 'Unknown error'
          appendLog(`error -> ${err}`)
          setLastResponse(`Error: ${err}`)
          setFindingsMarkdown(`Error: ${err}`)
          setCurrentPhase('error')
          setProgressText('失败')
          continue
        }

        if (msg.event === 'message' && isRecord(msg.data) && typeof msg.data.type === 'string') {
          const type = msg.data.type as LegacySseEventType
          if (type === 'thinking' && typeof msg.data.node === 'string' && typeof msg.data.content === 'string') {
            appendLog(`thinking -> ${msg.data.node}: ${msg.data.content.slice(0, 50)}...`)
            setCurrentPhase('thinking')
            setProgressText('思考中')
            setIterationCount(prev => prev + 1)
          } else if (type === 'tool_call' && typeof msg.data.tool === 'string') {
            appendLog(`tool call -> ${msg.data.tool}`)
            setCurrentPhase('tool_call')
            setProgressText(`调用工具：${msg.data.tool}`)
            setIterationCount(prev => prev + 1)
          } else if (type === 'tool_result' && typeof msg.data.content === 'string') {
            appendLog(`tool result -> ${typeof msg.data.node === 'string' ? msg.data.node : 'unknown'}`)
            setCurrentPhase('tool_result')
            setProgressText(`工具完成：${typeof msg.data.node === 'string' ? msg.data.node : 'unknown'}`)
            setIterationCount(prev => prev + 1)
          } else if (type === 'result' && typeof msg.data.content === 'string') {
            setLastResponse(msg.data.content)
            setFindingsMarkdown(msg.data.content)
            setCurrentPhase('result')
            setProgressText('生成结果中')
            setIterationCount(prev => prev + 1)
          } else if (type === 'error' && typeof msg.data.content === 'string') {
            appendLog(`error -> ${msg.data.content}`)
            setLastResponse(`Error: ${msg.data.content}`)
            setFindingsMarkdown(`Error: ${msg.data.content}`)
            setCurrentPhase('error')
            setProgressText('失败')
          } else if (type === 'done') {
            appendLog('task complete')
            setCurrentPhase('idle')
            setProgressText('')
            setActiveTab('findings')
            completed = true
          }
        }
      }

      if (!controller.signal.aborted && !completed) {
        appendLog('task complete')
        setCurrentPhase('idle')
        setProgressText('')
        setActiveTab('findings')
      }
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
    }
  }, [appendLog, apiBase, client.client_id, isRunning, prompt, sessionId, targetSummary])

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
