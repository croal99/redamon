'use client'

import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { Terminal as TerminalIcon, Wifi, WifiOff, RefreshCw, Maximize2, Minimize2 } from 'lucide-react'
import type { Terminal } from '@xterm/xterm'
import type { FitAddon } from '@xterm/addon-fit'
import styles from './ClientTerminal.module.css'
import type { TerminalSizeMessage, CommandMessage, TerminalAuthMessage, CenterClientInfo } from '../../types/center'
import { useBLinkClient } from '../../hooks'
import { AIChat } from '../AIChat'

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

const MAX_RECONNECT_ATTEMPTS = 5
const BASE_RECONNECT_INTERVAL = 2000
const PING_INTERVAL_MS = 30000

function getWsUrl(clientId: string): string {
  const encodedClientId = encodeURIComponent(clientId)
  const blinkWS = process.env.NEXT_PUBLIC_BLINK_WS_URL
  return `${blinkWS}/api/terminal/${encodedClientId}`
}

type ActiveTerminalRun = {
  buffer: string
  maxChars: number
  touch: () => void
  finish: (error?: Error) => void
}

export type ClientTerminalProps = {
  clientId: string
  client?: CenterClientInfo
}

export const ClientTerminal = memo(function ClientTerminal({ clientId, client }: ClientTerminalProps) {
  const termRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const inputDisposablesRef = useRef<Array<{ dispose: () => void }>>([])
  const mountedRef = useRef(true)
  const reconnectAttemptRef = useRef(0)
  const activeRunRef = useRef<ActiveTerminalRun | null>(null)
  const manualCloseRef = useRef(false)
  const authRef = useRef<TerminalAuthMessage | null>(null)

  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showAi, setShowAi] = useState(false)

  const { TerminalDefaultAuthData } = useBLinkClient()

  useEffect(() => {
    authRef.current = TerminalDefaultAuthData
  }, [TerminalDefaultAuthData])

  /**
   * sendResizeMessage: 通知服务端调整终端尺寸（cols/rows）。
   */
  const sendResizeMessage = useCallback((dims: TerminalSizeMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message: CommandMessage<TerminalSizeMessage> = {
        type: 'resize',
        data: dims,
      }
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  /**
   * sendAuthMessage: 发送终端登录认证信息。
   */
  const sendAuthMessage = useCallback((auth: TerminalAuthMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message: CommandMessage<TerminalAuthMessage> = {
        type: 'terminal',
        data: auth,
      }
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  /**
   * sendTextMessage: 向终端通道发送用户输入/命令文本。
   */
  const sendTextMessage = useCallback((text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message: CommandMessage<string> = {
        type: 'text',
        data: text,
      }
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  /**
   * endActiveRun: 结束当前正在采集输出的命令执行（用于断线/错误收尾）。
   */
  const endActiveRun = useCallback((error?: Error) => {
    const active = activeRunRef.current
    if (!active) return
    activeRunRef.current = null
    active.finish(error)
  }, [])

  const connect = useCallback(async () => {
    if (!clientId) return
    if (!termRef.current || !mountedRef.current) return
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return
    }

    setStatus('connecting')
    manualCloseRef.current = false

    let TerminalCtor, FitAddonCtor, WebLinksAddonCtor
    try {
      const [termMod, fitMod, linksMod] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
        import('@xterm/addon-web-links'),
      ])
      TerminalCtor = termMod.Terminal
      FitAddonCtor = fitMod.FitAddon
      WebLinksAddonCtor = linksMod.WebLinksAddon
    } catch {
      setStatus('error')
      return
    }

    if (!mountedRef.current) return

    if (!terminalRef.current) {
      const fitAddon = new FitAddonCtor()
      fitAddonRef.current = fitAddon

      const terminal = new TerminalCtor({
        cursorBlink: true,
        cursorStyle: 'block',
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Menlo', monospace",
        lineHeight: 1.3,
        letterSpacing: 0.5,
        theme: {
          background: '#0a0e14',
          foreground: '#e6e1cf',
          cursor: '#73d0ff',
          cursorAccent: '#0a0e14',
          selectionBackground: '#33415580',
          selectionForeground: '#e6e1cf',
          black: '#1a1e29',
          red: '#ff3333',
          green: '#bae67e',
          yellow: '#ffd580',
          blue: '#73d0ff',
          magenta: '#d4bfff',
          cyan: '#95e6cb',
          white: '#e6e1cf',
          brightBlack: '#4d556a',
          brightRed: '#ff6666',
          brightGreen: '#91d076',
          brightYellow: '#ffe6b3',
          brightBlue: '#5ccfe6',
          brightMagenta: '#c3a6ff',
          brightCyan: '#a6f0db',
          brightWhite: '#fafafa',
        },
        scrollback: 10000,
        allowProposedApi: true,
      })

      terminal.loadAddon(fitAddon)
      terminal.loadAddon(new WebLinksAddonCtor())

      terminal.open(termRef.current)
      fitAddon.fit()

      terminalRef.current = terminal
    } else {
      terminalRef.current.clear()
    }

    const terminal = terminalRef.current!
    const fitAddon = fitAddonRef.current

    terminal.writeln('')
    terminal.writeln('\x1b[1;36m  Connecting to client terminal...\x1b[0m')

    const ws = new WebSocket(getWsUrl(clientId))
    wsRef.current = ws
    // ws.binaryType = 'arraybuffer'

    ws.onopen = () => {
      if (wsRef.current !== ws) {
        ws.close()
        return
      }
      if (!mountedRef.current) {
        ws.close()
        return
      }
      setStatus('connected')
      reconnectAttemptRef.current = 0
      terminal.writeln('\x1b[1;32m\u2713 Connected\x1b[0m\n')

      // 发送登录认证命令
      if (authRef.current) sendAuthMessage(authRef.current)
      // ws.send(JSON.stringify(authCmd))

      if (fitAddon) {
        const dims = fitAddon.proposeDimensions()
        if (dims) {
          sendResizeMessage({cols: dims.cols, rows: dims.rows})
        }
      }

      inputDisposablesRef.current.forEach((d) => d.dispose())
      inputDisposablesRef.current = []

      inputDisposablesRef.current.push(
        terminal.onData((data: string) => {
          if (ws.readyState === WebSocket.OPEN) sendTextMessage(data)
        })
      )

      inputDisposablesRef.current.push(
        terminal.onBinary((data: string) => {
          if (ws.readyState !== WebSocket.OPEN) return
          sendTextMessage(data)
        })
      )

      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, PING_INTERVAL_MS)
    }

    ws.onmessage = async (event) => {
      if (wsRef.current !== ws) return
      // if (event.data instanceof ArrayBuffer) {
      //   terminal.write(new Uint8Array(event.data))
      // } else {
      //   terminal.write(event.data)
      // }
      const raw =
        typeof event.data === 'string'
          ? event.data
          : event.data instanceof Blob
            ? await event.data.text()
            : String(event.data);

      try {
        const parsed = JSON.parse(raw) as unknown
        if (
          typeof parsed === 'object' &&
          parsed !== null &&
          'type' in parsed &&
          (parsed as { type?: unknown }).type === 'text'
        ) {
          const data = (parsed as { data?: unknown }).data
          if (typeof data === 'string') {
            terminal.write(data)
            const active = activeRunRef.current
            if (active) {
              active.buffer = (active.buffer + data).slice(-active.maxChars)
              active.touch()
            }
          }
        }
      } catch {
        terminal.write(raw)
        const active = activeRunRef.current
        if (active) {
          active.buffer = (active.buffer + raw).slice(-active.maxChars)
          active.touch()
        }
      }
    }

    ws.onerror = () => {
      if (wsRef.current !== ws) return
      if (!mountedRef.current) return
      setStatus('error')
      terminal.writeln('\n\x1b[1;31mWebSocket connection failed.\x1b[0m')
      endActiveRun(new Error('WebSocket connection failed'))
    }

    ws.onclose = (event) => {
      if (wsRef.current !== ws) return
      wsRef.current = null
      if (!mountedRef.current) return

      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
        pingIntervalRef.current = null
      }

      setStatus('disconnected')
      const extra = event.reason ? ` (${event.code}: ${event.reason})` : ` (${event.code})`
      terminal.writeln(`\n\x1b[1;31m\u2717 Disconnected\x1b[0m${extra}`)
      endActiveRun(new Error('WebSocket disconnected'))

      if (manualCloseRef.current) return

      const attempt = reconnectAttemptRef.current
      if (attempt < MAX_RECONNECT_ATTEMPTS) {
        const delay = BASE_RECONNECT_INTERVAL * Math.pow(2, attempt)
        terminal.writeln(`\x1b[2;37m  Reconnecting in ${(delay / 1000).toFixed(0)}s (attempt ${attempt + 1}/${MAX_RECONNECT_ATTEMPTS})...\x1b[0m`)
        reconnectAttemptRef.current = attempt + 1
        reconnectTimerRef.current = setTimeout(() => connect(), delay)
      } else {
        terminal.writeln('\x1b[2;37m  Max reconnect attempts reached. Click "Reconnect" to try again.\x1b[0m')
      }
    }
  }, [clientId, endActiveRun, sendAuthMessage, sendResizeMessage, sendTextMessage])

  const disconnect = useCallback(() => {
    manualCloseRef.current = true
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
    if (wsRef.current) {
      const ws = wsRef.current
      wsRef.current = null
      ws.close()
    }
    endActiveRun(new Error('Disconnected'))
    setStatus('disconnected')
  }, [endActiveRun])

  const reconnect = useCallback(() => {
    reconnectAttemptRef.current = 0
    disconnect()
    reconnectTimerRef.current = setTimeout(() => connect(), 200)
  }, [disconnect, connect])

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev)
  }, [])

  const toggleAi = useCallback(() => {
    setShowAi((prev) => !prev)
  }, [])

  useEffect(() => {
    mountedRef.current = true
    reconnectAttemptRef.current = 0
    disconnect()
    connect()
    return () => {
      mountedRef.current = false
    }
  }, [clientId, disconnect, connect])

  /**
   * runTerminalCommand: 通过 WebSocket 下发单条命令，并以“静默窗口”方式采集输出后返回给调用方。
   */
  const runTerminalCommand = useCallback(
    async (command: string, options?: { silenceMs?: number; timeoutMs?: number; maxChars?: number }) => {
      if (!command.trim()) return ''
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        throw new Error('Terminal 未连接')
      }
      if (activeRunRef.current) {
        throw new Error('已有命令在执行中，请等待完成')
      }

      const silenceMs = options?.silenceMs ?? 1200
      const timeoutMs = options?.timeoutMs ?? 15000
      const maxChars = options?.maxChars ?? 64000

      const normalized = command.endsWith('\n') ? command : `${command}\n`

      return await new Promise<string>((resolve, reject) => {
        let silenceTimer: NodeJS.Timeout | null = null
        let timeoutTimer: NodeJS.Timeout | null = null
        let finished = false

        const finish = (error?: Error) => {
          if (finished) return
          finished = true
          if (silenceTimer) clearTimeout(silenceTimer)
          if (timeoutTimer) clearTimeout(timeoutTimer)
          silenceTimer = null
          timeoutTimer = null
          activeRunRef.current = null
          if (error) {
            reject(error)
            return
          }
          resolve(active.buffer)
        }

        const touch = () => {
          if (finished) return
          if (silenceTimer) clearTimeout(silenceTimer)
          silenceTimer = setTimeout(() => finish(), silenceMs)
        }

        const active: ActiveTerminalRun = {
          buffer: '',
          maxChars,
          touch,
          finish,
        }
        activeRunRef.current = active

        timeoutTimer = setTimeout(() => finish(new Error('命令执行超时')), timeoutMs)
        touch()
        sendTextMessage(normalized)
      })
    },
    [sendTextMessage]
  )

  useEffect(() => {
    const handleResize = () => {
      if (!fitAddonRef.current || !terminalRef.current) return
      try {
        fitAddonRef.current.fit()
        const dims = fitAddonRef.current.proposeDimensions()
        if (dims) {
          sendResizeMessage({cols: dims.cols, rows: dims.rows})
        }
      } catch {
        return
      }
    }

    const resizeObserver = new ResizeObserver(handleResize)
    if (termRef.current) resizeObserver.observe(termRef.current)
    window.addEventListener('resize', handleResize)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleResize)
    }
  }, [sendResizeMessage])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!fitAddonRef.current) return
      try {
        fitAddonRef.current.fit()
        const dims = fitAddonRef.current.proposeDimensions()
        if (dims) {
          sendResizeMessage({cols: dims.cols, rows: dims.rows})
        }
      } catch {
        return
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [isFullscreen, sendResizeMessage])

  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
        pingIntervalRef.current = null
      }
      inputDisposablesRef.current.forEach((d) => d.dispose())
      inputDisposablesRef.current = []
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      if (terminalRef.current) {
        terminalRef.current.dispose()
        terminalRef.current = null
      }
    }
  }, [])

  return (
    <div className={`${styles.container} ${isFullscreen ? styles.fullscreen : ''}`}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <TerminalIcon size={14} className={styles.terminalIcon} />
          <span className={styles.title}>Client Terminal</span>
          <span className={styles.subtitle} title={clientId}>
            {clientId}
          </span>
        </div>
        <div className={styles.toolbarRight}>
          <span className={`${styles.statusBadge} ${styles[status]}`} aria-live="polite">
            {status === 'connected' ? <Wifi size={10} /> : <WifiOff size={10} />}
            <span>{status}</span>
          </span>
          <button
            className={styles.toolbarBtn}
            onClick={reconnect}
            title="Reconnect"
            disabled={status === 'connecting' || !clientId}
            aria-label="Reconnect to terminal"
          >
            <RefreshCw size={12} />
          </button>
          <button
            className={styles.toolbarBtn}
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            aria-pressed={isFullscreen}
          >
            {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
          <button
            className={`${styles.toolbarBtn} ${styles.aiBtn} ${showAi ? styles.aiBtnActive : ''}`}
            onClick={toggleAi}
            title="AI"
            aria-label="Toggle AI Chat"
            aria-pressed={showAi}
          >
            AI
          </button>
        </div>
      </div>
      <div className={styles.body}>
        <div ref={termRef} className={styles.terminal} role="application" aria-label="Client terminal" />
        {showAi ? (
          <div className={styles.aiPanel} aria-label="AI Chat panel">
            <div className={styles.aiPanelInner}>
              <AIChat client={client ?? { client_id: clientId }} runTerminalCommand={runTerminalCommand} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
})
