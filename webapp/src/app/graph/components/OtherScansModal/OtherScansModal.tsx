'use client'

import { Play, Pause, Square, Terminal, Download, Loader2, Github, Search, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { Modal } from '@/components/ui'
import type { GithubHuntStatus, TrufflehogStatus } from '@/lib/recon-types'
import styles from './OtherScansModal.module.css'

interface OtherScansModalProps {
  isOpen: boolean
  onClose: () => void
  hasReconData: boolean
  hasGithubToken: boolean
  // GitHub Hunt
  onStartGithubHunt?: () => void
  onPauseGithubHunt?: () => void
  onResumeGithubHunt?: () => void
  onStopGithubHunt?: () => void
  onDownloadGithubHuntJSON?: () => void
  onToggleGithubHuntLogs?: () => void
  githubHuntStatus?: GithubHuntStatus
  hasGithubHuntData?: boolean
  isGithubHuntLogsOpen?: boolean
  // TruffleHog
  onStartTrufflehog?: () => void
  onPauseTrufflehog?: () => void
  onResumeTrufflehog?: () => void
  onStopTrufflehog?: () => void
  onDownloadTrufflehogJSON?: () => void
  onToggleTrufflehogLogs?: () => void
  trufflehogStatus?: TrufflehogStatus
  hasTrufflehogData?: boolean
  isTrufflehogLogsOpen?: boolean
}

function StatusBadge({ status }: { status: string }) {
  const styleMap: Record<string, string> = {
    idle: styles.statusIdle,
    starting: styles.statusRunning,
    running: styles.statusRunning,
    paused: styles.statusPaused,
    stopping: styles.statusRunning,
    completed: styles.statusCompleted,
    error: styles.statusError,
  }
  return (
    <span className={`${styles.statusBadge} ${styleMap[status] || styles.statusIdle}`}>
      {status}
    </span>
  )
}

export function OtherScansModal({
  isOpen,
  onClose,
  hasReconData,
  hasGithubToken,
  // GitHub Hunt
  onStartGithubHunt,
  onPauseGithubHunt,
  onResumeGithubHunt,
  onStopGithubHunt,
  onDownloadGithubHuntJSON,
  onToggleGithubHuntLogs,
  githubHuntStatus = 'idle',
  hasGithubHuntData = false,
  isGithubHuntLogsOpen = false,
  // TruffleHog
  onStartTrufflehog,
  onPauseTrufflehog,
  onResumeTrufflehog,
  onStopTrufflehog,
  onDownloadTrufflehogJSON,
  onToggleTrufflehogLogs,
  trufflehogStatus = 'idle',
  hasTrufflehogData = false,
  isTrufflehogLogsOpen = false,
}: OtherScansModalProps) {
  // GitHub Hunt derived state
  const isGHBusy = githubHuntStatus === 'running' || githubHuntStatus === 'starting'
  const isGHStopping = githubHuntStatus === 'stopping'
  const isGHRunning = isGHBusy || isGHStopping
  const isGHPaused = githubHuntStatus === 'paused'
  const isGHActive = isGHRunning || isGHPaused

  // TruffleHog derived state
  const isTHBusy = trufflehogStatus === 'running' || trufflehogStatus === 'starting'
  const isTHStopping = trufflehogStatus === 'stopping'
  const isTHRunning = isTHBusy || isTHStopping
  const isTHPaused = trufflehogStatus === 'paused'
  const isTHActive = isTHRunning || isTHPaused

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="其他扫描"
      size="large"
    >
      <div className={styles.content}>
        {/* GitHub Secret Hunt Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Github size={18} className={styles.cardIcon} />
            <h3 className={styles.cardTitle}>GitHub 密钥搜索</h3>
            <StatusBadge status={githubHuntStatus} />
          </div>
          <p className={styles.cardDescription}>
            搜索 GitHub 仓库中与目标域相关的暴露密钥、API 密钥和凭证。
          </p>
          {!hasGithubToken && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '6px',
            }}>
              <AlertTriangle size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                需要 GitHub 访问令牌。{' '}
                <Link href="/settings" style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>
                  全局设置
                </Link>
              </span>
            </div>
          )}
          <div className={styles.cardActions}>
            {isGHPaused ? (
              <button
                className={styles.resumeButton}
                onClick={onResumeGithubHunt}
                disabled={!hasGithubToken}
                title={!hasGithubToken ? '需要 GitHub 令牌' : '恢复 GitHub 密钥搜索'}
              >
                <Play size={12} />
                <span>恢复</span>
              </button>
            ) : (
              <button
                className={styles.startButton}
                onClick={onStartGithubHunt}
                disabled={!hasGithubToken || isGHRunning || (!hasReconData && !isGHPaused)}
                title={!hasGithubToken ? '需要 GitHub 令牌' : !hasReconData ? '请先运行侦察' : isGHRunning ? '进行中...' : '启动 GitHub 密钥搜索'}
              >
                {isGHRunning ? (
                  <Loader2 size={12} className={styles.spinner} />
                ) : (
                  <Play size={12} />
                )}
                <span>{isGHBusy ? '运行中...' : isGHStopping ? '停止中...' : '启动'}</span>
              </button>
            )}

            {isGHBusy && (
              <button
                className={styles.pauseButton}
                onClick={onPauseGithubHunt}
                title="暂停"
              >
                <Pause size={12} />
                <span>暂停</span>
              </button>
            )}

            {isGHActive && (
              <button
                className={styles.stopButton}
                onClick={onStopGithubHunt}
                disabled={isGHStopping}
                title="停止"
              >
                <Square size={12} />
                <span>停止</span>
              </button>
            )}

            <button
              className={`${styles.logsButton} ${isGithubHuntLogsOpen ? styles.logsButtonActive : ''}`}
              onClick={onToggleGithubHuntLogs}
              disabled={!isGHActive}
              title="查看日志"
            >
              <Terminal size={12} />
              <span>日志</span>
            </button>

            <button
              className={styles.downloadButton}
              onClick={onDownloadGithubHuntJSON}
              disabled={!hasGithubHuntData || isGHActive}
              title={hasGithubHuntData ? '下载 JSON' : '暂无数据'}
            >
              <Download size={12} />
              <span>下载</span>
            </button>
          </div>
        </div>

        {/* TruffleHog Scanner Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Search size={18} className={styles.cardIcon} />
            <h3 className={styles.cardTitle}>TruffleHog 扫描器</h3>
            <StatusBadge status={trufflehogStatus} />
          </div>
          <p className={styles.cardDescription}>
            使用 700+ 检测器进行深度密钥扫描，并可选地针对实时 API 进行验证。
          </p>
          {!hasGithubToken && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '6px',
            }}>
              <AlertTriangle size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                需要 GitHub 访问令牌。{' '}
                <Link href="/settings" style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>
                  全局设置
                </Link>
              </span>
            </div>
          )}
          <div className={styles.cardActions}>
            {isTHPaused ? (
              <button
                className={styles.resumeButton}
                onClick={onResumeTrufflehog}
                disabled={!hasGithubToken}
                title={!hasGithubToken ? '需要 GitHub 令牌' : '恢复 TruffleHog'}
              >
                <Play size={12} />
                <span>恢复</span>
              </button>
            ) : (
              <button
                className={styles.startButton}
                onClick={onStartTrufflehog}
                disabled={!hasGithubToken || isTHRunning || (!hasReconData && !isTHPaused)}
                title={!hasGithubToken ? '需要 GitHub 令牌' : !hasReconData ? '请先运行侦察' : isTHRunning ? '进行中...' : '启动 TruffleHog'}
              >
                {isTHRunning ? (
                  <Loader2 size={12} className={styles.spinner} />
                ) : (
                  <Play size={12} />
                )}
                <span>{isTHBusy ? '运行中...' : isTHStopping ? '停止中...' : '启动'}</span>
              </button>
            )}

            {isTHBusy && (
              <button
                className={styles.pauseButton}
                onClick={onPauseTrufflehog}
                title="暂停"
              >
                <Pause size={12} />
                <span>暂停</span>
              </button>
            )}

            {isTHActive && (
              <button
                className={styles.stopButton}
                onClick={onStopTrufflehog}
                disabled={isTHStopping}
                title="停止"
              >
                <Square size={12} />
                <span>停止</span>
              </button>
            )}

            <button
              className={`${styles.logsButton} ${isTrufflehogLogsOpen ? styles.logsButtonActive : ''}`}
              onClick={onToggleTrufflehogLogs}
              disabled={!isTHActive}
              title="查看日志"
            >
              <Terminal size={12} />
              <span>日志</span>
            </button>

            <button
              className={styles.downloadButton}
              onClick={onDownloadTrufflehogJSON}
              disabled={!hasTrufflehogData || isTHActive}
              title={hasTrufflehogData ? '下载 JSON' : '暂无数据'}
            >
              <Download size={12} />
              <span>下载</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default OtherScansModal
