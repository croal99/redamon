'use client'

import { Download, Shield, Clock, Ban, FileText, Users, AlertTriangle, Lock, Globe } from 'lucide-react'
import styles from './RoeViewer.module.css'

interface RoeViewerProps {
  projectId: string
  project: {
    roeEnabled?: boolean
    roeClientName?: string
    roeClientContactName?: string
    roeClientContactEmail?: string
    roeClientContactPhone?: string
    roeEmergencyContact?: string
    roeEngagementStartDate?: string
    roeEngagementEndDate?: string
    roeEngagementType?: string
    roeExcludedHosts?: string[]
    roeExcludedHostReasons?: string[]
    roeTimeWindowEnabled?: boolean
    roeTimeWindowTimezone?: string
    roeTimeWindowDays?: string[]
    roeTimeWindowStartTime?: string
    roeTimeWindowEndTime?: string
    roeForbiddenCategories?: string[]
    roeMaxSeverityPhase?: string
    roeAllowDos?: boolean
    roeAllowSocialEngineering?: boolean
    roeAllowPhysicalAccess?: boolean
    roeAllowDataExfiltration?: boolean
    roeAllowAccountLockout?: boolean
    roeAllowProductionTesting?: boolean
    roeGlobalMaxRps?: number
    roeSensitiveDataHandling?: string
    roeDataRetentionDays?: number
    roeRequireDataEncryption?: boolean
    roeStatusUpdateFrequency?: string
    roeCriticalFindingNotify?: boolean
    roeIncidentProcedure?: string
    roeThirdPartyProviders?: string[]
    roeComplianceFrameworks?: string[]
    roeNotes?: string
    roeDocumentName?: string
    targetDomain?: string
    targetIps?: string[]
    [key: string]: unknown
  }
}

function PermBadge({ allowed, label }: { allowed: boolean; label: string }) {
  return (
    <span className={`${styles.permBadge} ${allowed ? styles.permAllowed : styles.permDenied}`}>
      {allowed ? '\u2713' : '\u2717'} {label}
    </span>
  )
}

function Section({ title, icon, children, fullWidth }: { title: string; icon: React.ReactNode; children: React.ReactNode; fullWidth?: boolean }) {
  return (
    <div className={`${styles.card} ${fullWidth ? styles.fullWidth : ''}`}>
      <div className={styles.cardHeader}>
        {icon}
        <h3>{title}</h3>
      </div>
      <div className={styles.cardBody}>{children}</div>
    </div>
  )
}

const ENGAGEMENT_TYPE_LABELS: Record<string, string> = {
  external: '外部渗透测试',
  internal: '内部渗透测试',
  web_app: 'Web 应用测试',
  api: 'API 安全测试',
  mobile: '移动应用测试',
  physical: '物理安全测试',
  social_engineering: '社会工程学',
  red_team: '红队演练',
}

const CATEGORY_LABELS: Record<string, string> = {
  brute_force: '凭据测试',
  dos: '可用性测试',
  social_engineering: '社会工程学',
  physical: '物理访问',
}

export function RoeViewer({ projectId, project }: RoeViewerProps) {
  if (!project.roeEnabled) {
    return (
      <div className={styles.container}>
        <div className={styles.inner}>
          <div className={styles.empty}>
            <Shield size={44} strokeWidth={1.5} />
            <h2>无交战规则</h2>
            <p>此项目尚未配置 RoE 文档。</p>
            <p className={styles.hint}>创建项目时上传 RoE 文档以启用演练约束。</p>
          </div>
        </div>
      </div>
    )
  }

  const handleDownload = () => {
    window.open(`/api/projects/${projectId}/roe/download`, '_blank')
  }

  // Time window status
  let timeWindowActive = false
  if (project.roeTimeWindowEnabled) {
    try {
      const now = new Date()
      const day = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
      timeWindowActive = (project.roeTimeWindowDays || []).includes(day)
      const currentTime = now.toTimeString().slice(0, 5)
      if (timeWindowActive) {
        const start = project.roeTimeWindowStartTime || '00:00'
        const end = project.roeTimeWindowEndTime || '23:59'
        if (start <= end) {
          timeWindowActive = currentTime >= start && currentTime <= end
        } else {
          timeWindowActive = currentTime >= start || currentTime <= end
        }
      }
    } catch {
      // ignore
    }
  }

  const maxPhase = project.roeMaxSeverityPhase || 'post_exploitation'
  const phaseClass = maxPhase === 'informational' ? styles.phaseInfo : maxPhase === 'exploitation' ? styles.phaseExploit : styles.phaseAll
  const phaseLabel = maxPhase === 'informational' ? '仅信息收集' : maxPhase === 'exploitation' ? '直到漏洞利用' : '所有阶段'

  const dataHandlingLabels: Record<string, string> = {
    no_access: '不访问敏感数据',
    prove_access_only: '仅证明访问（不收集）',
    limited_collection: '允许有限收集',
    full_access: '允许完全访问',
  }

  const frequencyLabels: Record<string, string> = {
    daily: '每天',
    weekly: '每周',
    on_finding: '每次发现时',
    none: '无',
  }

  const excludedHosts = project.roeExcludedHosts || []
  const forbiddenCategories = project.roeForbiddenCategories || []
  const complianceFrameworks = project.roeComplianceFrameworks || []
  const thirdPartyProviders = project.roeThirdPartyProviders || []

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Shield size={20} />
          <h2>交战规则</h2>
        </div>
        {project.roeDocumentName && (
          <button className={styles.downloadBtn} onClick={handleDownload}>
            <Download size={14} />
            {project.roeDocumentName}
          </button>
        )}
      </div>

      <div className={styles.grid}>
        {/* Engagement Info */}
        <Section title="演练" icon={<Users size={15} />}>
          {project.roeClientName && <div className={styles.row}><span>客户</span><strong>{project.roeClientName}</strong></div>}
          {project.roeEngagementType && (
            <div className={styles.row}><span>类型</span><strong>{ENGAGEMENT_TYPE_LABELS[project.roeEngagementType] || project.roeEngagementType}</strong></div>
          )}
          {(project.roeEngagementStartDate || project.roeEngagementEndDate) && (
            <div className={styles.row}>
              <span>周期</span>
              <strong>{project.roeEngagementStartDate || '?'} &rarr; {project.roeEngagementEndDate || '?'}</strong>
            </div>
          )}
          {project.roeClientContactName && <div className={styles.row}><span>联系人</span><strong>{project.roeClientContactName}</strong></div>}
          {project.roeClientContactEmail && <div className={styles.row}><span>邮箱</span><strong>{project.roeClientContactEmail}</strong></div>}
          {project.roeClientContactPhone && <div className={styles.row}><span>电话</span><strong>{project.roeClientContactPhone}</strong></div>}
          {project.roeEmergencyContact && <div className={styles.row}><span>紧急联系</span><strong>{project.roeEmergencyContact}</strong></div>}
        </Section>

        {/* Scope */}
        <Section title="范围" icon={<Globe size={15} />}>
          {project.targetDomain && <div className={styles.row}><span>域名</span><strong>{project.targetDomain}</strong></div>}
          {project.targetIps && project.targetIps.length > 0 && (
            <div className={styles.row}><span>IP 范围</span><strong>{project.targetIps.join(', ')}</strong></div>
          )}
          {excludedHosts.length > 0 && (
            <div className={styles.row}><span>排除项</span><strong>{excludedHosts.length} 台主机</strong></div>
          )}
        </Section>

        {/* Exclusions — full width */}
        {excludedHosts.length > 0 && (
          <Section title="排除的主机" icon={<Ban size={15} />} fullWidth>
            {excludedHosts.map((host, i) => (
              <div key={i} className={styles.exclusionRow}>
                <span className={styles.exclusionHost}>{host}</span>
                {(project.roeExcludedHostReasons || [])[i] && (
                  <span className={styles.exclusionReason}>&mdash; {(project.roeExcludedHostReasons || [])[i]}</span>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* Time Window */}
        {project.roeTimeWindowEnabled && (
          <Section title="时间窗口" icon={<Clock size={15} />}>
            <div className={styles.row}>
              <span>日期</span>
              <strong>{(project.roeTimeWindowDays || []).map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ')}</strong>
            </div>
            <div className={styles.row}>
              <span>时段</span>
              <strong>{project.roeTimeWindowStartTime} &ndash; {project.roeTimeWindowEndTime}</strong>
            </div>
            <div className={styles.row}>
              <span>时区</span>
              <strong>{project.roeTimeWindowTimezone || 'UTC'}</strong>
            </div>
            <div className={styles.row}>
              <span>状态</span>
              <span className={timeWindowActive ? styles.statusActive : styles.statusInactive}>
                {timeWindowActive ? '\u25CF 活跃' : '\u25CB 窗口外'}
              </span>
            </div>
          </Section>
        )}

        {/* Testing Permissions */}
        <Section title="测试权限" icon={<Shield size={15} />}>
          <div className={styles.permGrid}>
            <PermBadge allowed={!!project.roeAllowDos} label="可用性" />
            <PermBadge allowed={!!project.roeAllowSocialEngineering} label="社会工程" />
            <PermBadge allowed={!!project.roeAllowPhysicalAccess} label="物理访问" />
            <PermBadge allowed={!!project.roeAllowDataExfiltration} label="数据外泄" />
            <PermBadge allowed={!!project.roeAllowAccountLockout} label="账号锁定" />
            <PermBadge allowed={project.roeAllowProductionTesting !== false} label="生产环境" />
          </div>
        </Section>

        {/* Constraints */}
        <Section title="约束" icon={<AlertTriangle size={15} />}>
          <div className={styles.row}>
            <span>最大阶段</span>
            <span className={`${styles.phaseIndicator} ${phaseClass}`}>{phaseLabel}</span>
          </div>
          {(project.roeGlobalMaxRps || 0) > 0 && (
            <div className={styles.row}><span>速率限制</span><strong>{project.roeGlobalMaxRps} rps</strong></div>
          )}
          {forbiddenCategories.length > 0 && (
            <>
              <div className={styles.row}><span>禁止项</span><span /></div>
              <div className={styles.tagList}>
                {forbiddenCategories.map(cat => (
                  <span key={cat} className={styles.tagDanger}>{CATEGORY_LABELS[cat] || cat}</span>
                ))}
              </div>
            </>
          )}
        </Section>

        {/* Data Handling */}
        <Section title="数据处理" icon={<Lock size={15} />}>
          <div className={styles.row}>
            <span>策略</span>
            <span className={styles.dataHandling}>{dataHandlingLabels[project.roeSensitiveDataHandling || 'no_access']}</span>
          </div>
          <div className={styles.row}>
            <span>保留期</span>
            <strong>{project.roeDataRetentionDays || 90} 天</strong>
          </div>
          {project.roeRequireDataEncryption !== false && (
            <div className={styles.row}>
              <span>加密</span>
              <span className={styles.encryptionBadge}>{'\u2713'} 必须（静态 + 传输中）</span>
            </div>
          )}
        </Section>

        {/* Communication */}
        <Section title="沟通" icon={<FileText size={15} />}>
          <div className={styles.row}>
            <span>状态更新</span>
            <strong>{frequencyLabels[project.roeStatusUpdateFrequency || 'daily'] || project.roeStatusUpdateFrequency}</strong>
          </div>
          <div className={styles.row}>
            <span>严重发现通知</span>
            <strong>{project.roeCriticalFindingNotify !== false ? '立即' : '否'}</strong>
          </div>
          {project.roeIncidentProcedure && (
            <div className={styles.textBlock}>
              <span>事件处理流程</span>
              <p>{project.roeIncidentProcedure}</p>
            </div>
          )}
        </Section>

        {/* Compliance */}
        {(complianceFrameworks.length > 0 || thirdPartyProviders.length > 0) && (
          <Section title="合规与授权" icon={<Shield size={15} />}>
            {complianceFrameworks.length > 0 && (
              <>
                <div className={styles.row}><span>框架</span><span /></div>
                <div className={styles.tagList}>
                  {complianceFrameworks.map(fw => (
                    <span key={fw} className={styles.tagInfo}>{fw}</span>
                  ))}
                </div>
              </>
            )}
            {thirdPartyProviders.length > 0 && (
              <>
                <div className={styles.row}><span>第三方</span><span /></div>
                <div className={styles.tagList}>
                  {thirdPartyProviders.map(p => (
                    <span key={p} className={styles.tag}>{p}</span>
                  ))}
                </div>
              </>
            )}
          </Section>
        )}

        {/* Notes — full width */}
        {project.roeNotes && (
          <Section title="附加说明" icon={<FileText size={15} />} fullWidth>
            <p className={styles.notes}>{project.roeNotes}</p>
          </Section>
        )}
      </div>
      </div>
    </div>
  )
}
