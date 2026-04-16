'use client'

import React from 'react'
import { Bot, Wifi, WifiOff, Loader2, AlertTriangle, Eye, EyeOff, History, Plus, Download } from 'lucide-react'
import { ConnectionStatus } from '@/lib/websocket-types'
import { Tooltip } from '@/components/ui/Tooltip/Tooltip'
import { ConversationHistory } from './ConversationHistory'
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
  handleDownloadMarkdown: () => void
  chatItems: ChatItem[]
  onClose: () => void
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
      case ConnectionStatus.CONNECTING: return '连接中…'
      case ConnectionStatus.CONNECTED: return '已连接'
      case ConnectionStatus.RECONNECTING: return `重连中…（${reconnectAttempt}/5）`
      case ConnectionStatus.FAILED: return '连接失败'
      case ConnectionStatus.DISCONNECTED: return '已断开'
    }
  }

  return (
    <>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <Bot size={16} />
          </div>
          <div className={styles.headerText}>
            <h2 className={styles.title}>AI 代理</h2>
            <div className={styles.connectionStatus}>
              {getConnectionStatusIcon()}
              <span className={styles.subtitle} style={{ color: getConnectionStatusColor() }}>
                {getConnectionStatusText()}
              </span>
              <span className={styles.sessionCode} title={sessionId}>
                会话：{sessionId.slice(-8)}
              </span>
              {!requireToolConfirmation && (
                <Tooltip content="已关闭工具确认。危险工具将无需人工批准直接执行。">
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
              title={isOtherChainsHidden ? '在图中显示全部会话' : '在图中仅显示当前会话'}
              aria-label={isOtherChainsHidden ? '在图中显示全部会话' : '在图中仅显示当前会话'}
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
            aria-label="新建会话"
          >
            <Plus size={14} />
          </button>
          <button
            className={styles.iconButton}
            onClick={handleDownloadMarkdown}
            title="下载聊天记录（Markdown）"
            aria-label="下载聊天记录（Markdown）"
            disabled={chatItems.length === 0}
          >
            <Download size={14} />
          </button>
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
