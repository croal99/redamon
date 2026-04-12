'use client'

import { Bot, Play, Download, Loader2, Terminal, Shield, Github, Target, Zap, MessageSquare, Pause, Square, ShieldAlert } from 'lucide-react'
import { StealthIcon } from '@/components/icons/StealthIcon'
import { Toggle } from '@/components/ui'
import type { ReconStatus, GvmStatus, GithubHuntStatus, TrufflehogStatus, PartialReconStatus } from '@/lib/recon-types'
import { WORKFLOW_TOOLS } from '@/components/projects/ProjectForm/WorkflowView/workflowDefinition'
import styles from './GraphToolbar.module.css'

interface GraphToolbarProps {
  projectId: string
  is3D: boolean
  showLabels: boolean
  onToggle3D: (value: boolean) => void
  onToggleLabels: (value: boolean) => void
  onToggleAI?: () => void
  isAIOpen?: boolean
  // Target info
  targetDomain?: string
  subdomainList?: string[]
  // Recon props
  onStartRecon?: () => void
  onPauseRecon?: () => void
  onResumeRecon?: () => void
  onStopRecon?: () => void
  onDownloadJSON?: () => void
  onToggleLogs?: () => void
  reconStatus?: ReconStatus
  hasReconData?: boolean
  isLogsOpen?: boolean
  // GVM props
  gvmAvailable?: boolean
  onStartGvm?: () => void
  onPauseGvm?: () => void
  onResumeGvm?: () => void
  onStopGvm?: () => void
  onDownloadGvmJSON?: () => void
  onToggleGvmLogs?: () => void
  gvmStatus?: GvmStatus
  hasGvmData?: boolean
  isGvmLogsOpen?: boolean
  // GitHub Hunt props
  onStartGithubHunt?: () => void
  onPauseGithubHunt?: () => void
  onResumeGithubHunt?: () => void
  onStopGithubHunt?: () => void
  onDownloadGithubHuntJSON?: () => void
  onToggleGithubHuntLogs?: () => void
  githubHuntStatus?: GithubHuntStatus
  hasGithubHuntData?: boolean
  isGithubHuntLogsOpen?: boolean
  // TruffleHog props
  onStartTrufflehog?: () => void
  onPauseTrufflehog?: () => void
  onResumeTrufflehog?: () => void
  onStopTrufflehog?: () => void
  onDownloadTrufflehogJSON?: () => void
  onToggleTrufflehogLogs?: () => void
  trufflehogStatus?: TrufflehogStatus
  hasTrufflehogData?: boolean
  isTrufflehogLogsOpen?: boolean
  // Partial Recon props
  partialReconStatus?: PartialReconStatus
  partialReconToolId?: string
  isPartialReconLogsOpen?: boolean
  onStopPartialRecon?: () => void
  onTogglePartialReconLogs?: () => void
  // Other Scans modal
  onToggleOtherScansModal?: () => void
  // Stealth mode
  stealthMode?: boolean
  // RoE
  roeEnabled?: boolean
  // Emergency Pause All
  onEmergencyPauseAll?: () => void
  isAnyPipelineRunning?: boolean
  isEmergencyPausing?: boolean
  // Tunnel status (displayed next to Pause All)
  tunnelStatus?: { ngrok?: { active: boolean; host?: string; port?: number }; chisel?: { active: boolean; host?: string; port?: number; srvPort?: number } }
  // Agent status
  agentActiveCount?: number
  agentConversations?: Array<{
    id: string
    title: string
    currentPhase: string
    iterationCount: number
    agentRunning: boolean
    sessionId: string
  }>
}

export function GraphToolbar({
  projectId,
  is3D,
  showLabels,
  onToggle3D,
  onToggleLabels,
  onToggleAI,
  isAIOpen = false,
  // Target info
  targetDomain,
  subdomainList = [],
  // Recon props
  onStartRecon,
  onPauseRecon,
  onResumeRecon,
  onStopRecon,
  onDownloadJSON,
  onToggleLogs,
  reconStatus = 'idle',
  hasReconData = false,
  isLogsOpen = false,
  // GVM props
  gvmAvailable = true,
  onStartGvm,
  onPauseGvm,
  onResumeGvm,
  onStopGvm,
  onDownloadGvmJSON,
  onToggleGvmLogs,
  gvmStatus = 'idle',
  hasGvmData = false,
  isGvmLogsOpen = false,
  // GitHub Hunt props
  onStartGithubHunt,
  onPauseGithubHunt,
  onResumeGithubHunt,
  onStopGithubHunt,
  onDownloadGithubHuntJSON,
  onToggleGithubHuntLogs,
  githubHuntStatus = 'idle',
  hasGithubHuntData = false,
  isGithubHuntLogsOpen = false,
  // TruffleHog props
  onStartTrufflehog,
  onPauseTrufflehog,
  onResumeTrufflehog,
  onStopTrufflehog,
  onDownloadTrufflehogJSON,
  onToggleTrufflehogLogs,
  trufflehogStatus = 'idle',
  hasTrufflehogData = false,
  isTrufflehogLogsOpen = false,
  // Partial Recon props
  partialReconStatus = 'idle',
  partialReconToolId = '',
  isPartialReconLogsOpen = false,
  onStopPartialRecon,
  onTogglePartialReconLogs,
  // Other Scans modal
  onToggleOtherScansModal,
  // Stealth mode
  stealthMode = false,
  // RoE
  roeEnabled = false,
  // Emergency Pause All
  onEmergencyPauseAll,
  isAnyPipelineRunning = false,
  isEmergencyPausing = false,
  tunnelStatus,
  // Agent status
  agentActiveCount = 0,
  agentConversations = [],
}: GraphToolbarProps) {
  const isReconBusy = reconStatus === 'running' || reconStatus === 'starting'
  const isReconStopping = reconStatus === 'stopping'
  const isReconRunning = isReconBusy || isReconStopping
  const isReconPaused = reconStatus === 'paused'
  const isReconActive = isReconRunning || isReconPaused
  const isGvmBusy = gvmStatus === 'running' || gvmStatus === 'starting'
  const isGvmStopping = gvmStatus === 'stopping'
  const isGvmRunning = isGvmBusy || isGvmStopping
  const isGvmPaused = gvmStatus === 'paused'
  const isGvmActive = isGvmRunning || isGvmPaused
  const isGithubHuntBusy = githubHuntStatus === 'running' || githubHuntStatus === 'starting'
  const isGithubHuntStopping = githubHuntStatus === 'stopping'
  const isGithubHuntRunning = isGithubHuntBusy || isGithubHuntStopping
  const isGithubHuntPaused = githubHuntStatus === 'paused'
  const isGithubHuntActive = isGithubHuntRunning || isGithubHuntPaused
  const isTrufflehogBusy = trufflehogStatus === 'running' || trufflehogStatus === 'starting'
  const isTrufflehogStopping = trufflehogStatus === 'stopping'
  const isTrufflehogRunning = isTrufflehogBusy || isTrufflehogStopping
  const isTrufflehogPaused = trufflehogStatus === 'paused'
  const isTrufflehogActive = isTrufflehogRunning || isTrufflehogPaused
  const isPartialReconBusy = partialReconStatus === 'running' || partialReconStatus === 'starting'
  const isPartialReconStopping = partialReconStatus === 'stopping'
  const isPartialReconRunning = isPartialReconBusy || isPartialReconStopping
  const isPartialReconActive = isPartialReconRunning

  // Agent status derived values
  const runningAgent = agentConversations.find(c => c.agentRunning)
  const totalConversations = agentConversations.length

  const PHASE_STYLES: Record<string, { color: string; bg: string; icon: typeof Shield }> = {
    informational: { color: '#059669', bg: 'rgba(5, 150, 105, 0.1)', icon: Shield },
    exploitation: { color: 'var(--status-warning)', bg: 'rgba(245, 158, 11, 0.1)', icon: Target },
    post_exploitation: { color: 'var(--status-error)', bg: 'rgba(239, 68, 68, 0.1)', icon: Zap },
  }

  return (
    <div className={styles.toolbar}>
      {targetDomain && (
        <>
          <div className={styles.divider} />
          <div className={styles.targetSection}>
            {subdomainList.length > 0 && (
              <div className={styles.subdomainWrapper}>
                <span className={styles.subdomainList}>
                  {subdomainList.join(', ')}
                </span>
                <div className={styles.subdomainTooltip}>
                  {subdomainList.join(', ')}
                </div>
              </div>
            )}
            <span className={styles.targetDomain}>{targetDomain}</span>
          </div>
        </>
      )}

      {stealthMode && (
        <>
          <div className={styles.divider} />
          <div className={styles.stealthBadge} title="隐身模式已启用 — 仅使用被动/低噪声手段">
            <StealthIcon size={12} />
            <span>隐身</span>
          </div>
        </>
      )}

      {roeEnabled && (
        <>
          <div className={styles.divider} />
          <div className={styles.roeBadge} title="交战规则已启用 — 侦察与代理将遵循护栏限制">
            <Shield size={12} />
            <span>RoE</span>
          </div>
        </>
      )}

      <div className={styles.divider} />
      <button
        className={`${styles.emergencyPauseButton} ${isEmergencyPausing ? styles.emergencyPauseButtonActive : ''}`}
        onClick={onEmergencyPauseAll}
        disabled={!isAnyPipelineRunning && !isEmergencyPausing}
        title="紧急暂停 — 立即冻结所有运行中的容器。如正在扫描/利用到非预期目标，请使用。"
      >
        {isEmergencyPausing ? (
          <Loader2 size={14} className={styles.spinner} />
        ) : (
          <ShieldAlert size={14} />
        )}
        <span>{isEmergencyPausing ? '暂停中…' : '全部暂停'}</span>
      </button>

      {(tunnelStatus?.ngrok?.active || tunnelStatus?.chisel?.active) && (
        <div className={styles.tunnelBadges}>
          {tunnelStatus.ngrok?.active && (
            <span className={styles.tunnelBadge} title={`Tunnel active: ${tunnelStatus.ngrok.host}:${tunnelStatus.ngrok.port}`}>
              <span className={styles.tunnelDot} />
              ngrok
            </span>
          )}
          {tunnelStatus.chisel?.active && (
            <span className={styles.tunnelBadge} title={`Tunnel active: ${tunnelStatus.chisel.host}:${tunnelStatus.chisel.port}`}>
              <span className={styles.tunnelDot} />
              chisel
            </span>
          )}
        </div>
      )}

      <div className={styles.spacer} />

      <div className={styles.actionsRight}>
        {/* Recon Actions */}
        {projectId && (
          <>
            <div className={styles.actionGroup}>
              <button
                className={`${styles.reconButton} ${isReconActive ? styles.reconButtonActive : ''}`}
                onClick={isReconPaused ? onResumeRecon : onStartRecon}
                disabled={isReconRunning || isPartialReconRunning}
                title={isPartialReconRunning ? 'Partial recon is running -- stop it first' : isReconStopping ? '正在停止…' : isReconRunning ? '侦察进行中…' : isReconPaused ? '继续侦察' : '启动侦察'}
              >
                {isReconRunning ? (
                  <Loader2 size={14} className={styles.spinner} />
                ) : (
                  <Play size={14} />
                )}
                <span>{isReconStopping ? '正在停止…' : isReconBusy ? '运行中…' : isReconPaused ? '继续' : '开始侦察'}</span>
              </button>

              {isReconBusy && (
                <button
                  className={styles.pauseButton}
                  onClick={onPauseRecon}
                  title="暂停侦察"
                >
                  <Pause size={14} />
                </button>
              )}

              {isReconActive && (
                <button
                  className={styles.stopButton}
                  onClick={onStopRecon}
                  disabled={isReconStopping}
                  title="停止侦察"
                >
                  <Square size={14} />
                </button>
              )}

              {isReconActive && (
                <button
                  className={`${styles.logsButton} ${isLogsOpen ? styles.logsButtonActive : ''}`}
                  onClick={onToggleLogs}
                  title="查看日志"
                >
                  <Terminal size={14} />
                </button>
              )}

              <button
                className={styles.downloadButton}
                onClick={onDownloadJSON}
                disabled={!hasReconData || isReconActive}
                title={hasReconData ? '下载侦察 JSON' : '暂无数据'}
              >
                <Download size={14} />
              </button>
            </div>

            {/* Partial Recon Badge */}
            {isPartialReconActive && (
              <div className={styles.actionGroup}>
                <span className={styles.partialReconBadge}>
                  {isPartialReconBusy ? (
                    <Loader2 size={12} className={styles.spinner} />
                  ) : null}
                  <span>Partial: {WORKFLOW_TOOLS.find(t => t.id === partialReconToolId)?.label || partialReconToolId || 'Running'}</span>
                </span>

                <button
                  className={styles.stopButton}
                  onClick={onStopPartialRecon}
                  disabled={isPartialReconStopping}
                  title="Stop Partial Recon"
                >
                  <Square size={14} />
                </button>

                <button
                  className={`${styles.logsButton} ${isPartialReconLogsOpen ? styles.logsButtonActive : ''}`}
                  onClick={onTogglePartialReconLogs}
                  title="View Partial Recon Logs"
                >
                  <Terminal size={14} />
                </button>
              </div>
            )}

            {/* GVM Scan Actions */}
            <div className={styles.actionGroup}>
              <button
                className={`${styles.gvmButton} ${isGvmActive ? styles.gvmButtonActive : ''}`}
                onClick={isGvmPaused ? onResumeGvm : onStartGvm}
                disabled={!gvmAvailable || isGvmRunning || (!hasReconData && !isGvmPaused) || (stealthMode && !isGvmPaused)}
                title={
                  !gvmAvailable
                    ? '未安装 GVM。运行 ./redamon.sh install --gvm 以启用漏洞扫描'
                    : stealthMode && !isGvmPaused
                    ? '隐身模式下已禁用 GVM 扫描（每个目标约产生 50,000 次主动探测）'
                    : !hasReconData && !isGvmPaused
                    ? '请先运行侦察'
                    : isGvmStopping
                    ? '正在停止…'
                    : isGvmRunning
                    ? 'GVM 扫描进行中…'
                    : isGvmPaused
                    ? '继续 GVM 扫描'
                    : '启动 GVM 漏洞扫描'
                }
              >
                {isGvmRunning ? (
                  <Loader2 size={14} className={styles.spinner} />
                ) : (
                  <Shield size={14} />
                )}
                <span>{isGvmStopping ? '正在停止…' : isGvmBusy ? '扫描中…' : isGvmPaused ? '继续' : 'GVM 扫描'}</span>
              </button>

              {isGvmBusy && (
                <button
                  className={styles.pauseButton}
                  onClick={onPauseGvm}
                  title="暂停 GVM 扫描"
                >
                  <Pause size={14} />
                </button>
              )}

              {isGvmActive && (
                <button
                  className={styles.stopButton}
                  onClick={onStopGvm}
                  disabled={isGvmStopping}
                  title="停止 GVM 扫描"
                >
                  <Square size={14} />
                </button>
              )}

              {isGvmActive && (
                <button
                  className={`${styles.logsButton} ${isGvmLogsOpen ? styles.logsButtonActive : ''}`}
                  onClick={onToggleGvmLogs}
                  title="查看 GVM 日志"
                >
                  <Terminal size={14} />
                </button>
              )}

              <button
                className={styles.downloadButton}
                onClick={onDownloadGvmJSON}
                disabled={!hasGvmData || isGvmActive}
                title={hasGvmData ? '下载 GVM JSON' : '暂无 GVM 数据'}
              >
                <Download size={14} />
              </button>
            </div>

            {/* Other Scans (GitHub Hunt + TruffleHog) */}
            <div className={styles.actionGroup}>
              <button
                className={`${styles.githubHuntButton} ${(isGithubHuntActive || isTrufflehogActive) ? styles.githubHuntButtonActive : ''}`}
                onClick={onToggleOtherScansModal}
                title="其他扫描（GitHub Hunt、TruffleHog）"
              >
                {(isGithubHuntRunning || isTrufflehogRunning) ? (
                  <Loader2 size={14} className={styles.spinner} />
                ) : (
                  <Github size={14} />
                )}
                <span>{(isGithubHuntBusy || isTrufflehogBusy) ? '扫描中…' : '其他扫描'}</span>
              </button>
            </div>
          </>
        )}

        {/* Agent Status Indicators */}
        {totalConversations > 0 && (
          <div className={styles.agentStatus}>
            {agentActiveCount > 0 ? (
              <div className={styles.agentActiveBadge}>
                <span className={styles.agentDot} />
                <span>{agentActiveCount} 个运行中</span>
              </div>
            ) : (
              <div className={styles.agentIdleBadge}>
                <MessageSquare size={10} />
                <span>{totalConversations} 个会话</span>
              </div>
            )}
            {runningAgent && (() => {
              const phase = PHASE_STYLES[runningAgent.currentPhase] || PHASE_STYLES.informational
              const PhaseIcon = phase.icon
              return (
                <div
                  className={styles.agentPhaseBadge}
                  style={{ color: phase.color, backgroundColor: phase.bg, borderColor: phase.color }}
                >
                  <PhaseIcon size={10} />
                  <span>{runningAgent.currentPhase.replace('_', ' ')}</span>
                  {runningAgent.iterationCount > 0 && (
                    <span className={styles.agentStep}>步骤 {runningAgent.iterationCount}</span>
                  )}
                </div>
              )
            })()}
          </div>
        )}

        <button
          className={`${styles.aiButton} ${isAIOpen ? styles.aiButtonActive : ''}`}
          onClick={onToggleAI}
          aria-label="切换 AI 代理"
          aria-expanded={isAIOpen}
          title="AI 代理"
        >
          <Bot size={14} />
          <span>AI 代理</span>
        </button>
      </div>
    </div>
  )
}
