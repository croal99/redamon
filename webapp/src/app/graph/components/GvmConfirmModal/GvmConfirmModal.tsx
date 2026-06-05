'use client'

import { AlertTriangle, ShieldAlert, Play, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui'
import styles from './GvmConfirmModal.module.css'

interface GvmStats {
  totalGvmNodes: number
  nodesByType: Record<string, number>
}

interface GvmConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  projectName: string
  targetDomain: string
  stats: GvmStats | null
  isLoading: boolean
  error?: string | null
}

export function GvmConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  projectName,
  targetDomain,
  stats,
  isLoading,
  error,
}: GvmConfirmModalProps) {
  const hasExistingData = stats && stats.totalGvmNodes > 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="启动 GVM 漏洞扫描"
      size="default"
    >
      <div className={styles.content}>
        <div className={styles.info}>
          <p className={styles.projectInfo}>
            <strong>项目：</strong> {projectName}
          </p>
          <p className={styles.projectInfo}>
            <strong>目标：</strong> {targetDomain}
          </p>
        </div>

        {hasExistingData ? (
          <div className={styles.warning}>
            <AlertTriangle size={20} className={styles.warningIcon} />
            <div className={styles.warningContent}>
              <p className={styles.warningTitle}>发现已有 GVM 数据</p>
              <p className={styles.warningText}>
                此项目有 <strong>{stats.totalGvmNodes}</strong> 个 GVM 相关节点。
                启动新的漏洞扫描将<strong>删除已有的 GVM 数据</strong>，并替换为新的扫描结果。侦察数据不受影响。
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
            <p>未发现已有 GVM 数据，可以启动漏洞扫描。</p>
            <p className={styles.readyNote}>
              这将使用 GVM/OpenVAS 扫描 <strong>{targetDomain}</strong>，并将检测到的技术、漏洞和 CVE 填充到图中。
            </p>
          </div>
        )}

        {error && (
          <div className={styles.errorBanner}>
            <AlertTriangle size={14} />
            <span>{error}</span>
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
                <span>{hasExistingData ? '删除并扫描' : '启动扫描'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default GvmConfirmModal
