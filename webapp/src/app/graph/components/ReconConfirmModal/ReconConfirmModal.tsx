'use client'

import { AlertTriangle, ShieldAlert, Play, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui'
import styles from './ReconConfirmModal.module.css'

interface GraphStats {
  totalNodes: number
  nodesByType: Record<string, number>
}

interface ReconConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  projectName: string
  targetDomain: string
  ipMode?: boolean
  targetIps?: string[]
  stats: GraphStats | null
  isLoading: boolean
}

export function ReconConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  projectName,
  targetDomain,
  ipMode,
  targetIps,
  stats,
  isLoading,
}: ReconConfirmModalProps) {
  const targetDisplay = ipMode && targetIps?.length
    ? targetIps.slice(0, 5).join(', ') + (targetIps.length > 5 ? ` (+${targetIps.length - 5} more)` : '')
    : targetDomain
  const hasExistingData = stats && stats.totalNodes > 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="启动侦察"
      size="default"
    >
      <div className={styles.content}>
        <div className={styles.info}>
          <p className={styles.projectInfo}>
            <strong>项目：</strong> {projectName}
          </p>
          <p className={styles.projectInfo}>
            <strong>目标：</strong> {targetDisplay}
          </p>
        </div>

        {hasExistingData ? (
          <div className={styles.warning}>
            <AlertTriangle size={20} className={styles.warningIcon} />
            <div className={styles.warningContent}>
              <p className={styles.warningTitle}>发现已有数据</p>
              <p className={styles.warningText}>
                此项目在图数据库中有 <strong>{stats.totalNodes}</strong> 个节点。
                启动新的侦察将<strong>删除所有已有数据</strong>，并替换为新的扫描结果。
              </p>
              <div className={styles.stats}>
                {Object.entries(stats.nodesByType).map(([type, count]) => (
                  <span key={type} className={styles.statBadge}>
                    {type}: {count}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.ready}>
            <p>未发现已有数据，可以启动侦察。</p>
            <p className={styles.readyNote}>
              这将扫描 <strong>{targetDisplay}</strong> 并将发现的子域名、端口、服务和漏洞填充到图数据库中。
            </p>
          </div>
        )}

        <div className={styles.actions}>
          <button
            className={styles.cancelButton}
            onClick={onClose}
            disabled={isLoading}
          >
            取消
          </button>
          <button
            className={styles.confirmButton}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className={styles.spinner} />
                <span>启动中...</span>
              </>
            ) : (
              <>
                <Play size={14} />
                <span>{hasExistingData ? '删除并启动' : '启动侦察'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default ReconConfirmModal
