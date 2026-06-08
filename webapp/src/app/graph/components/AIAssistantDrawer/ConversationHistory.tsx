'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Plus, Trash2, MessageSquare } from 'lucide-react'
import type { Conversation } from '@/hooks/useConversations'
import { PHASE_DISPLAY_NAMES } from '@/hooks/useConversations'
import styles from './ConversationHistory.module.css'

const PHASE_COLORS: Record<string, { color: string; bg: string }> = {
  informational: { color: '#059669', bg: 'rgba(5, 150, 105, 0.1)' },
  exploitation: { color: 'var(--status-warning)', bg: 'rgba(245, 158, 11, 0.1)' },
  post_exploitation: { color: 'var(--status-error)', bg: 'rgba(239, 68, 68, 0.1)' },
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}天前`
  return new Date(dateStr).toLocaleDateString()
}

interface ConversationHistoryProps {
  conversations: Conversation[]
  currentSessionId: string
  onBack: () => void
  onSelect: (conversation: Conversation) => void
  onDelete: (id: string) => void
  onNewChat: () => void
}

export function ConversationHistory({
  conversations,
  currentSessionId,
  onBack,
  onSelect,
  onDelete,
  onNewChat,
}: ConversationHistoryProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-dismiss delete confirmation after 5s
  useEffect(() => {
    if (deleteConfirmId) {
      confirmTimerRef.current = setTimeout(() => setDeleteConfirmId(null), 5000)
      return () => {
        if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
      }
    }
  }, [deleteConfirmId])

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setDeleteConfirmId(id)
  }

  const handleConfirmDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    onDelete(id)
    setDeleteConfirmId(null)
  }

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteConfirmId(null)
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={onBack} title="返回聊天">
          <ArrowLeft size={14} />
        </button>
        <span className={styles.headerTitle}>会话列表</span>
        <button className={styles.newChatButton} onClick={onNewChat}>
          <Plus size={12} />
          新建会话
        </button>
      </div>

      <div className={styles.list}>
        {conversations.length === 0 ? (
          <div className={styles.empty}>
            <MessageSquare size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
            <span>暂无会话</span>
          </div>
        ) : (
          conversations.map((conv) => {
            const phaseStyle = PHASE_COLORS[conv.currentPhase] || PHASE_COLORS.informational
            const isActive = conv.sessionId === currentSessionId

            return (
              <div key={conv.id}>
                <div
                  className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
                  onClick={() => {
                    if (!isActive) onSelect(conv)
                  }}
                >
                  <div className={styles.itemContent}>
                    <div className={styles.itemTitle}>
                      {conv.title || '新会话'}
                    </div>
                    <div className={styles.itemMeta}>
                      <span className={styles.itemTime} title={conv.sessionId}>
                        {conv.sessionId.slice(-8)}
                      </span>
                      <span className={styles.itemTime}>
                        {formatRelativeTime(conv.updatedAt)}
                      </span>
                      <span
                        className={styles.phaseBadge}
                        style={{
                          color: phaseStyle.color,
                          backgroundColor: phaseStyle.bg,
                          borderColor: phaseStyle.color,
                        }}
                      >
                        {PHASE_DISPLAY_NAMES[conv.currentPhase] || conv.currentPhase.replace('_', ' ')}
                      </span>
                      {conv.iterationCount > 0 && (
                        <span className={styles.itemTime}>
                          第{conv.iterationCount}步
                        </span>
                      )}
                      {conv.agentRunning && <span className={styles.runningDot} title="智能体运行中" />}
                    </div>
                  </div>
                  <button
                    className={styles.deleteButton}
                    onClick={(e) => handleDeleteClick(e, conv.id)}
                    title="删除会话"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {deleteConfirmId === conv.id && (
                  <div className={styles.confirmDelete}>
                    <span>删除此会话？</span>
                    <button
                      className={styles.confirmYes}
                      onClick={(e) => handleConfirmDelete(e, conv.id)}
                    >
                      删除
                    </button>
                    <button
                      className={styles.confirmNo}
                      onClick={handleCancelDelete}
                    >
                      取消
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
