'use client'

import React, { useMemo } from 'react'
import { Bot, Wifi, WifiOff, Loader2, AlertTriangle, Eye, EyeOff, History, Plus, Download, FolderOpen } from 'lucide-react'
import { ConnectionStatus } from '@/lib/websocket-types'
import { Tooltip } from '@/components/ui/Tooltip/Tooltip'
import { ConversationHistory } from './ConversationHistory'
import { formatTokenCount } from '@/lib/formatTokens'
import type { Conversation } from '@/hooks/useConversations'
import type { ChatItem } from './types'
import styles from './AIAssistantDrawer.module.css'

interface DrawerHeaderProps {
  status: ConnectionStatus
  reconnectAttempt: number
  sessionId: string
  requireToolConfirmation: boolean
  hasOtherChains: boolean
  isOtherChainsHidden: boolean
  onToggleOtherChains?: () => void
  showHistory: boolean
  setShowHistory: (v: boolean) => void
  handleNewChat: () => void
  handleDownloadMarkdown: () => void | Promise<void>
  chatItems: ChatItem[]
  onClose: () => void
  onOpenFileSystem?: () => void
  conversations: Conversation[]
  handleSelectConversation: (conv: Conversation) => void
  handleDeleteConversation: (id: string) => void
  handleHistoryNewChat: () => void
}

export function DrawerHeader({
  status,
  reconnectAttempt,
  sessionId,
  requireToolConfirmation,
  hasOtherChains,
  isOtherChainsHidden,
  onToggleOtherChains,
  showHistory,
  setShowHistory,
  handleNewChat,
  handleDownloadMarkdown,
  chatItems,
  onClose,
  onOpenFileSystem,
  conversations,
  handleSelectConversation,
  handleDeleteConversation,
  handleHistoryNewChat,
}: DrawerHeaderProps) {
  const getConnectionStatusColor = () =>
    status === ConnectionStatus.CONNECTED ? '#10b981' : '#ef4444'

  const getConnectionStatusIcon = () => {
    const color = getConnectionStatusColor()
    if (status === ConnectionStatus.CONNECTED) {
      return <Wifi size={12} className={styles.connectionIcon} style={{ color }} />
    } else if (status === ConnectionStatus.RECONNECTING) {
      return <Loader2 size={12} className={`${styles.connectionIcon} ${styles.spinner}`} style={{ color }} />
    } else {
      return <WifiOff size={12} className={styles.connectionIcon} style={{ color }} />
    }
  }

  const getConnectionStatusText = () => {
    switch (status) {
      case ConnectionStatus.CONNECTING: return '连接中...'
      case ConnectionStatus.CONNECTED: return '已连接'
      case ConnectionStatus.RECONNECTING: return `重新连接中... (${reconnectAttempt}/5)`
      case ConnectionStatus.FAILED: return '连接失败'
      case ConnectionStatus.DISCONNECTED: return '已断开连接'
    }
  }

  // Sum LLM tokens across every root think + every fireteam member. Root
  // ThinkingItems carry per-turn deltas; fireteam members track cumulative
  // totals on the panel. Summing both gives the session-wide total.
  const { totalInput, totalOutput } = useMemo(() => {
    let inTot = 0
    let outTot = 0
    for (const item of chatItems) {
      if (!('type' in item)) continue
      if (item.type === 'thinking') {
        inTot += item.input_tokens ?? 0
        outTot += item.output_tokens ?? 0
      } else if (item.type === 'fireteam') {
        for (const m of item.members) {
          inTot += m.input_tokens_used ?? 0
          outTot += m.output_tokens_used ?? 0
        }
      }
    }
    return { totalInput: inTot, totalOutput: outTot }
  }, [chatItems])
  const hasTokenTotal = totalInput > 0 || totalOutput > 0

  return (
    <>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <Bot size={16} />
          </div>
          <div className={styles.headerText}>
            <h2 className={styles.title}>AI 助手</h2>
            <div className={styles.connectionStatus}>
              {getConnectionStatusIcon()}
              <span className={styles.subtitle} style={{ color: getConnectionStatusColor() }}>
                {getConnectionStatusText()}
              </span>
              <span className={styles.sessionCode} title={sessionId}>
                会话: {sessionId.slice(-8)}
              </span>
              {hasTokenTotal && (
                <Tooltip content={`会话 LLM 用量 · 输入 ${totalInput.toLocaleString()} · 输出 ${totalOutput.toLocaleString()}`}>
                  <span className={styles.tokenTotal}>
                    输入 {formatTokenCount(totalInput)} · 输出 {formatTokenCount(totalOutput)}
                  </span>
                </Tooltip>
              )}
              {!requireToolConfirmation && (
                <Tooltip content="已关闭工具确认。危险工具将无需手动批准直接执行。">
                  <div className={styles.dangerBadge}>
                    <AlertTriangle size={12} />
                    <span>自动执行</span>
                  </div>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          {hasOtherChains && onToggleOtherChains && (
            <button
              className={`${styles.iconButton} ${isOtherChainsHidden ? styles.iconButtonActive : ''}`}
              onClick={onToggleOtherChains}
              title={isOtherChainsHidden ? '在图中显示所有会话' : '在图中仅显示此会话'}
              aria-label={isOtherChainsHidden ? '在图中显示所有会话' : '在图中仅显示此会话'}
            >
              {isOtherChainsHidden ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          )}
          <button
            className={styles.iconButton}
            onClick={() => setShowHistory(!showHistory)}
            title="会话历史"
            aria-label="会话历史"
          >
            <History size={14} />
          </button>
          <button
            className={styles.iconButton}
            onClick={handleNewChat}
            title="新建会话"
            aria-label="开始新会话"
          >
            <Plus size={14} />
          </button>
          <button
            className={styles.iconButton}
            onClick={handleDownloadMarkdown}
            title="下载 Markdown 聊天记录"
            aria-label="下载 Markdown 聊天记录"
            disabled={chatItems.length === 0}
          >
            <Download size={14} />
          </button>
          {onOpenFileSystem && (
            <button
              className={styles.iconButton}
              onClick={onOpenFileSystem}
              title="打开工作区（文件 + 任务）"
              aria-label="打开工作区"
            >
              <FolderOpen size={14} />
            </button>
          )}
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="关闭助手"
          >
            &times;
          </button>
        </div>
      </div>

      {showHistory && (
        <ConversationHistory
          conversations={conversations}
          currentSessionId={sessionId}
          onBack={() => setShowHistory(false)}
          onSelect={handleSelectConversation}
          onDelete={handleDeleteConversation}
          onNewChat={handleHistoryNewChat}
        />
      )}
    </>
  )
}
