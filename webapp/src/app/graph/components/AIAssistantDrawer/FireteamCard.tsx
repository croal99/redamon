/**
 * Fireteam Card
 *
 * Top-level card for a fireteam deployment. Header shows the deployment
 * rationale, live or final status, and aggregate stats. Body is a grid of
 * FireteamMemberCard, one per specialist the parent agent dispatched.
 */

'use client'

import { useState } from 'react'
import {
  Users, ChevronDown, ChevronRight, Loader2, CheckCircle2, XCircle,
  Hourglass, Ban, AlertTriangle,
} from 'lucide-react'
import styles from './FireteamCard.module.css'
import { FireteamMemberCard } from './FireteamMemberCard'
import type { FireteamItem } from './types'

interface FireteamCardProps {
  item: FireteamItem
  missingApiKeys?: Set<string>
  onAddApiKey?: (toolId: string) => void
  onToolConfirmation?: (itemId: string, decision: 'approve' | 'reject') => void
  /** Cancel a single running tool inside one of this fireteam's members. */
  onToolStop?: (itemId: string) => void
}

function headerIcon(status: FireteamItem['status']) {
  switch (status) {
    case 'running':
      return <Loader2 size={14} className={`${styles.icon} ${styles.spinner}`} />
    case 'completed':
      return <CheckCircle2 size={14} className={`${styles.icon} ${styles.iconSuccess}`} />
    case 'timeout':
      return <Hourglass size={14} className={`${styles.icon} ${styles.iconError}`} />
    case 'failed':
      return <XCircle size={14} className={`${styles.icon} ${styles.iconError}`} />
    case 'cancelled':
      return <Ban size={14} className={`${styles.icon} ${styles.iconMuted}`} />
    default:
      return <AlertTriangle size={14} className={`${styles.icon} ${styles.iconWarn}`} />
  }
}

function statusText(status: FireteamItem['status']) {
  switch (status) {
    case 'running':
      return '运行中'
    case 'completed':
      return '已完成'
    case 'timeout':
      return '超时'
    case 'failed':
      return '失败'
    case 'cancelled':
      return '已取消'
    default:
      return '未知'
  }
}

export function FireteamCard({ item, missingApiKeys, onAddApiKey, onToolConfirmation, onToolStop }: FireteamCardProps) {
  const [expanded, setExpanded] = useState(true)
  const counts = item.status_counts ?? {}
  const countStrs: string[] = []
  if (counts.success) countStrs.push(`${counts.success} 成功`)
  if (counts.timeout) countStrs.push(`${counts.timeout} 超时`)
  if (counts.error) countStrs.push(`${counts.error} 失败`)
  if (counts.cancelled) countStrs.push(`${counts.cancelled} 已取消`)
  if (counts.needs_confirmation) countStrs.push(`${counts.needs_confirmation} 待批准`)

  return (
    <div className={`${styles.card} ${styles[`status_${item.status}`] || ''}`}>
      <button type="button" className={styles.header} onClick={() => setExpanded(v => !v)}>
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Users size={14} className={styles.teamIcon} />
        <span className={styles.title}>
          团队协作 · 第 {item.iteration} 步 · {item.members.length} 名专家
        </span>
        {headerIcon(item.status)}
        <span className={styles.statusLabel}>{statusText(item.status)}</span>
        <span className={styles.meta}>
          {countStrs.join(' · ')}
          {item.wall_clock_seconds !== undefined && ` · ${item.wall_clock_seconds.toFixed(1)}s`}
        </span>
      </button>

      {expanded && (
        <div className={styles.body}>
          {item.plan_rationale && (
            <div className={styles.rationale}>{item.plan_rationale}</div>
          )}
          <div className={styles.grid}>
            {item.members.map(m => (
              <FireteamMemberCard
                key={m.member_id}
                member={m}
                missingApiKeys={missingApiKeys}
                onAddApiKey={onAddApiKey}
                onToolConfirmation={onToolConfirmation}
                onToolStop={onToolStop}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
