'use client'

import { useState, useRef } from 'react'
import { ChevronDown, Shield, Upload, Loader2, Plus, Minus, CheckCircle } from 'lucide-react'
import { Toggle } from '@/components/ui'
import { Modal } from '@/components/ui/Modal/Modal'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'

type ProjectFormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface RoeSectionProps {
  data: ProjectFormData
  updateField: <K extends keyof ProjectFormData>(field: K, value: ProjectFormData[K]) => void
  updateMultipleFields: (fields: Partial<ProjectFormData>) => void
  mode: 'create' | 'edit'
  onFileSelected: (file: File | null) => void
}

const ENGAGEMENT_TYPES = [
  { value: 'external', label: '外部渗透测试' },
  { value: 'internal', label: '内部渗透测试' },
  { value: 'web_app', label: 'Web 应用测试' },
  { value: 'api', label: 'API 安全测试' },
  { value: 'mobile', label: '移动应用测试' },
  { value: 'physical', label: '物理安全测试' },
  { value: 'social_engineering', label: '社会工程' },
  { value: 'red_team', label: '红队演练' },
]

const FORBIDDEN_CATEGORIES = [
  { value: 'brute_force', label: '凭据测试' },
  { value: 'dos', label: '可用性测试' },
  { value: 'social_engineering', label: '社会工程' },
  { value: 'physical', label: '物理访问' },
]

const DATA_HANDLING_OPTIONS = [
  { value: 'no_access', label: '不访问敏感数据' },
  { value: 'prove_access_only', label: '仅证明可访问（不采集）' },
  { value: 'limited_collection', label: '有限采集' },
  { value: 'full_access', label: '完全访问' },
]

const COMPLIANCE_OPTIONS = ['PCI-DSS', 'HIPAA', 'SOC2', 'GDPR', 'ISO27001']

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const WEEKDAY_LABELS: Record<string, string> = {
  monday: '周一',
  tuesday: '周二',
  wednesday: '周三',
  thursday: '周四',
  friday: '周五',
  saturday: '周六',
  sunday: '周日',
}

export function RoeSection({ data, updateField, updateMultipleFields, mode, onFileSelected }: RoeSectionProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [showParseSuccess, setShowParseSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const readOnly = mode === 'edit'

  const handleFileUpload = async (file: File) => {
    setIsParsing(true)
    setParseError(null)
    onFileSelected(file)

    try {
      const formData = new FormData()
      formData.append('file', file)
      // Pass the currently selected LLM model so the agent uses it for parsing
      if (data.agentOpenaiModel) {
        formData.append('model', data.agentOpenaiModel as string)
      }

      const response = await fetch('/api/roe/parse', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || `解析失败（${response.status}）`)
      }

      const parsed = await response.json()

      // Build update object from parsed fields, only setting non-null values
      const updates: Partial<ProjectFormData> = {}
      const fieldMap: Record<string, keyof ProjectFormData> = {
        name: 'name',
        description: 'description',
        targetDomain: 'targetDomain',
        targetIps: 'targetIps',
        ipMode: 'ipMode',
        subdomainList: 'subdomainList',
        stealthMode: 'stealthMode',
        roeEnabled: 'roeEnabled',
        roeRawText: 'roeRawText',
        roeClientName: 'roeClientName',
        roeClientContactName: 'roeClientContactName',
        roeClientContactEmail: 'roeClientContactEmail',
        roeClientContactPhone: 'roeClientContactPhone',
        roeEmergencyContact: 'roeEmergencyContact',
        roeEngagementStartDate: 'roeEngagementStartDate',
        roeEngagementEndDate: 'roeEngagementEndDate',
        roeEngagementType: 'roeEngagementType',
        roeExcludedHosts: 'roeExcludedHosts',
        roeExcludedHostReasons: 'roeExcludedHostReasons',
        roeTimeWindowEnabled: 'roeTimeWindowEnabled',
        roeTimeWindowTimezone: 'roeTimeWindowTimezone',
        roeTimeWindowDays: 'roeTimeWindowDays',
        roeTimeWindowStartTime: 'roeTimeWindowStartTime',
        roeTimeWindowEndTime: 'roeTimeWindowEndTime',
        roeForbiddenCategories: 'roeForbiddenCategories',
        agentToolPhaseMap: 'agentToolPhaseMap',
        roeMaxSeverityPhase: 'roeMaxSeverityPhase',
        roeAllowDos: 'roeAllowDos',
        roeAllowSocialEngineering: 'roeAllowSocialEngineering',
        roeAllowPhysicalAccess: 'roeAllowPhysicalAccess',
        roeAllowDataExfiltration: 'roeAllowDataExfiltration',
        roeAllowAccountLockout: 'roeAllowAccountLockout',
        roeAllowProductionTesting: 'roeAllowProductionTesting',
        roeGlobalMaxRps: 'roeGlobalMaxRps',
        roeSensitiveDataHandling: 'roeSensitiveDataHandling',
        roeDataRetentionDays: 'roeDataRetentionDays',
        roeRequireDataEncryption: 'roeRequireDataEncryption',
        roeStatusUpdateFrequency: 'roeStatusUpdateFrequency',
        roeCriticalFindingNotify: 'roeCriticalFindingNotify',
        roeIncidentProcedure: 'roeIncidentProcedure',
        roeThirdPartyProviders: 'roeThirdPartyProviders',
        roeComplianceFrameworks: 'roeComplianceFrameworks',
        roeNotes: 'roeNotes',
        naabuRateLimit: 'naabuRateLimit',
        nucleiRateLimit: 'nucleiRateLimit',
        katanaRateLimit: 'katanaRateLimit',
        httpxRateLimit: 'httpxRateLimit',
        nucleiSeverity: 'nucleiSeverity',
        scanModules: 'scanModules',
      }

      for (const [key, formKey] of Object.entries(fieldMap)) {
        if (parsed[key] !== null && parsed[key] !== undefined) {
          // agentToolPhaseMap: LLM returns only disabled tools (e.g. {"execute_hydra": []}).
          // Merge into existing map so we don't wipe out all other tools' phases.
          if (key === 'agentToolPhaseMap' && typeof parsed[key] === 'object') {
            const currentMap = (typeof data.agentToolPhaseMap === 'string'
              ? JSON.parse(data.agentToolPhaseMap)
              : data.agentToolPhaseMap ?? {}) as Record<string, string[]>
            const disabledTools = parsed[key] as Record<string, string[]>
            const merged = { ...currentMap }
            for (const [tool, phases] of Object.entries(disabledTools)) {
              merged[tool] = phases // override only the tools the LLM wants to disable
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (updates as any)[formKey] = merged
            continue
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (updates as any)[formKey] = parsed[key]
        }
      }

      // Store parsed JSON for viewer
      updates.roeParsedJson = parsed
      updates.roeEnabled = true

      updateMultipleFields(updates)
      setShowParseSuccess(true)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : '文档解析失败')
    } finally {
      setIsParsing(false)
    }
  }

  const addExcludedHost = () => {
    updateField('roeExcludedHosts', [...(data.roeExcludedHosts || []), ''])
    updateField('roeExcludedHostReasons', [...(data.roeExcludedHostReasons || []), ''])
  }

  const removeExcludedHost = (index: number) => {
    const hosts = [...(data.roeExcludedHosts || [])]
    const reasons = [...(data.roeExcludedHostReasons || [])]
    hosts.splice(index, 1)
    reasons.splice(index, 1)
    updateField('roeExcludedHosts', hosts)
    updateField('roeExcludedHostReasons', reasons)
  }

  const updateExcludedHost = (index: number, value: string) => {
    const hosts = [...(data.roeExcludedHosts || [])]
    hosts[index] = value
    updateField('roeExcludedHosts', hosts)
  }

  const updateExcludedReason = (index: number, value: string) => {
    const reasons = [...(data.roeExcludedHostReasons || [])]
    reasons[index] = value
    updateField('roeExcludedHostReasons', reasons)
  }

  const toggleDay = (day: string) => {
    const days = data.roeTimeWindowDays || []
    if (days.includes(day)) {
      updateField('roeTimeWindowDays', days.filter(d => d !== day))
    } else {
      updateField('roeTimeWindowDays', [...days, day])
    }
  }

  const toggleForbiddenCategory = (cat: string) => {
    const cats = data.roeForbiddenCategories || []
    if (cats.includes(cat)) {
      updateField('roeForbiddenCategories', cats.filter(c => c !== cat))
    } else {
      updateField('roeForbiddenCategories', [...cats, cat])
    }
  }

  const toggleCompliance = (fw: string) => {
    const current = data.roeComplianceFrameworks || []
    if (current.includes(fw)) {
      updateField('roeComplianceFrameworks', current.filter(c => c !== fw))
    } else {
      updateField('roeComplianceFrameworks', [...current, fw])
    }
  }

  return (
    <>
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Shield size={16} />
          交战规则（RoE）
        </h2>
        <ChevronDown
          size={16}
          className={`${styles.sectionIcon} ${isOpen ? styles.sectionIconOpen : ''}`}
        />
      </div>

      {isOpen && (
        <div className={styles.sectionContent}>
          {/* Document Upload (create mode only) */}
          {mode === 'create' && (
            <div className={styles.subSection}>
              <h3 className={styles.subSectionTitle}>上传 RoE 文档</h3>
              <p className={styles.sectionDescription}>
                上传交战规则（Rules of Engagement）文档（.pdf/.txt/.md/.docx）以自动填充项目设置。
                解析后的规则会同时对 <strong>侦察流水线</strong>（排除主机、限速、时间窗口）与 <strong>AI 代理活动</strong>（工具限制、阶段上限、提示词级约束）施加防护规则。
              </p>
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt,.md,.docx"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file)
                    }}
                  />
                  <button
                    type="button"
                    className="secondaryButton"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isParsing}
                    style={{ width: 'fit-content' }}
                  >
                    {isParsing ? (
                      <>
                        <Loader2 size={14} className={styles.spinner} />
                        正在解析 RoE 文档...
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        上传并解析文档
                      </>
                    )}
                  </button>
                  {parseError && (
                    <span style={{ color: 'var(--color-error)', fontSize: '0.8rem', marginTop: 4 }}>
                      {parseError}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Master Switch */}
          <div className={styles.subSection}>
            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>启用交战规则（RoE）</label>
                <Toggle
                  checked={data.roeEnabled}
                  onChange={(v) => updateField('roeEnabled', v)}
                  disabled={readOnly}
                />
                <span className={styles.fieldHint}>启用后，RoE 约束会同时作用于 AI 代理与侦察流水线。</span>
              </div>
            </div>
          </div>

          {data.roeEnabled && (
            <>
              {/* Client & Engagement */}
              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>客户与任务信息</h3>
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>客户名称</label>
                    <input className="textInput" value={data.roeClientName} readOnly={readOnly}
                      onChange={(e) => updateField('roeClientName', e.target.value)} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>任务类型</label>
                    <select className="select" value={data.roeEngagementType} disabled={readOnly}
                      onChange={(e) => updateField('roeEngagementType', e.target.value)}>
                      {ENGAGEMENT_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>联系人姓名</label>
                    <input className="textInput" value={data.roeClientContactName} readOnly={readOnly}
                      onChange={(e) => updateField('roeClientContactName', e.target.value)} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>联系人邮箱</label>
                    <input className="textInput" type="email" value={data.roeClientContactEmail} readOnly={readOnly}
                      onChange={(e) => updateField('roeClientContactEmail', e.target.value)} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>联系电话</label>
                    <input className="textInput" value={data.roeClientContactPhone} readOnly={readOnly}
                      onChange={(e) => updateField('roeClientContactPhone', e.target.value)} />
                  </div>
                </div>
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>紧急联系人</label>
                    <input className="textInput" value={data.roeEmergencyContact} readOnly={readOnly}
                      onChange={(e) => updateField('roeEmergencyContact', e.target.value)} />
                  </div>
                </div>
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>开始日期</label>
                    <input className="textInput" type="date" value={data.roeEngagementStartDate} readOnly={readOnly}
                      onChange={(e) => updateField('roeEngagementStartDate', e.target.value)} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>结束日期</label>
                    <input className="textInput" type="date" value={data.roeEngagementEndDate} readOnly={readOnly}
                      onChange={(e) => updateField('roeEngagementEndDate', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Excluded Hosts */}
              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>排除主机</h3>
                <p className={styles.sectionDescription}>绝对禁止扫描/测试的 IP 或域名。</p>
                {(data.roeExcludedHosts || []).map((host, i) => (
                  <div key={i} className={styles.fieldRow} style={{ alignItems: 'flex-end' }}>
                    <div className={styles.fieldGroup} style={{ flex: 1 }}>
                      <label className={styles.fieldLabel}>主机</label>
                      <input className="textInput" value={host} readOnly={readOnly}
                        onChange={(e) => updateExcludedHost(i, e.target.value)} placeholder="IP 或域名" />
                    </div>
                    <div className={styles.fieldGroup} style={{ flex: 1 }}>
                      <label className={styles.fieldLabel}>原因</label>
                      <input className="textInput" value={(data.roeExcludedHostReasons || [])[i] || ''} readOnly={readOnly}
                        onChange={(e) => updateExcludedReason(i, e.target.value)} placeholder="排除原因" />
                    </div>
                    {!readOnly && (
                      <button type="button" className="secondaryButton" onClick={() => removeExcludedHost(i)}
                        style={{ marginBottom: 4 }}>
                        <Minus size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {!readOnly && (
                  <button type="button" className="secondaryButton" onClick={addExcludedHost}
                    style={{ width: 'fit-content', marginTop: 4 }}>
                    <Plus size={14} /> 添加排除主机
                  </button>
                )}
              </div>

              {/* Time Window */}
              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>时间窗口</h3>
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>仅允许在特定时间窗口内测试</label>
                    <Toggle
                      checked={data.roeTimeWindowEnabled}
                      onChange={(v) => updateField('roeTimeWindowEnabled', v)}
                      disabled={readOnly}
                    />
                  </div>
                </div>
                {data.roeTimeWindowEnabled && (
                  <>
                    <div className={styles.fieldRow}>
                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>时区</label>
                        <input className="textInput" value={data.roeTimeWindowTimezone} readOnly={readOnly}
                          onChange={(e) => updateField('roeTimeWindowTimezone', e.target.value)}
                          placeholder="例如：Asia/Shanghai、Europe/Rome、America/New_York" />
                      </div>
                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>开始时间</label>
                        <input className="textInput" type="time" value={data.roeTimeWindowStartTime} readOnly={readOnly}
                          onChange={(e) => updateField('roeTimeWindowStartTime', e.target.value)} />
                      </div>
                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>结束时间</label>
                        <input className="textInput" type="time" value={data.roeTimeWindowEndTime} readOnly={readOnly}
                          onChange={(e) => updateField('roeTimeWindowEndTime', e.target.value)} />
                      </div>
                    </div>
                    <div className={styles.fieldRow}>
                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>允许日期</label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {WEEKDAYS.map(day => (
                            <label key={day} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: readOnly ? 'default' : 'pointer' }}>
                              <input type="checkbox" checked={(data.roeTimeWindowDays || []).includes(day)}
                                disabled={readOnly} onChange={() => toggleDay(day)} />
                              {(WEEKDAY_LABELS[day] ?? day)}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Testing Permissions */}
              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>测试许可</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>允许可用性测试</label>
                    <Toggle checked={data.roeAllowDos} onChange={(v) => updateField('roeAllowDos', v)} disabled={readOnly} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>允许社会工程</label>
                    <Toggle checked={data.roeAllowSocialEngineering} onChange={(v) => updateField('roeAllowSocialEngineering', v)} disabled={readOnly} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>允许物理访问</label>
                    <Toggle checked={data.roeAllowPhysicalAccess} onChange={(v) => updateField('roeAllowPhysicalAccess', v)} disabled={readOnly} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>允许数据外传</label>
                    <Toggle checked={data.roeAllowDataExfiltration} onChange={(v) => updateField('roeAllowDataExfiltration', v)} disabled={readOnly} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>允许账号锁定</label>
                    <Toggle checked={data.roeAllowAccountLockout} onChange={(v) => updateField('roeAllowAccountLockout', v)} disabled={readOnly} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>允许对生产环境测试</label>
                    <Toggle checked={data.roeAllowProductionTesting} onChange={(v) => updateField('roeAllowProductionTesting', v)} disabled={readOnly} />
                  </div>
                </div>
              </div>

              {/* Forbidden Categories */}
              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>禁止技术</h3>
                <p style={{ fontSize: '0.8rem', color: '#888', margin: '0 0 8px 0' }}>
                  工具级限制请在“工具矩阵（Tool Matrix）”的“工具阶段限制”中配置。
                </p>
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>禁止类别</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {FORBIDDEN_CATEGORIES.map(cat => (
                        <label key={cat.value} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: readOnly ? 'default' : 'pointer' }}>
                          <input type="checkbox" checked={(data.roeForbiddenCategories || []).includes(cat.value)}
                            disabled={readOnly} onChange={() => toggleForbiddenCategory(cat.value)} />
                          {cat.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Severity Cap & Rate Limit */}
              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>约束</h3>
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>允许的最高阶段</label>
                    <select className="select" value={data.roeMaxSeverityPhase} disabled={readOnly}
                      onChange={(e) => updateField('roeMaxSeverityPhase', e.target.value)}>
                      <option value="informational">仅信息收集（侦察/扫描）</option>
                      <option value="exploitation">最多到利用阶段</option>
                      <option value="post_exploitation">所有阶段（不限制）</option>
                    </select>
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>全局最大请求/秒</label>
                    <input className="textInput" type="number" min={0} value={data.roeGlobalMaxRps} readOnly={readOnly}
                      onChange={(e) => updateField('roeGlobalMaxRps', parseInt(e.target.value) || 0)} />
                    <span className={styles.fieldHint}>0=不限速。会对所有工具的限速参数生效。</span>
                  </div>
                </div>
              </div>

              {/* Data Handling */}
              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>数据处理</h3>
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>敏感数据策略</label>
                    <select className="select" value={data.roeSensitiveDataHandling} disabled={readOnly}
                      onChange={(e) => updateField('roeSensitiveDataHandling', e.target.value)}>
                      {DATA_HANDLING_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>数据保留（天）</label>
                    <input className="textInput" type="number" min={1} value={data.roeDataRetentionDays} readOnly={readOnly}
                      onChange={(e) => updateField('roeDataRetentionDays', parseInt(e.target.value) || 90)} />
                  </div>
                </div>
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>必须加密数据</label>
                    <Toggle checked={data.roeRequireDataEncryption}
                      onChange={(v) => updateField('roeRequireDataEncryption', v)} disabled={readOnly} />
                  </div>
                </div>
              </div>

              {/* Communication */}
              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>沟通</h3>
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>状态更新频率</label>
                    <select className="select" value={data.roeStatusUpdateFrequency} disabled={readOnly}
                      onChange={(e) => updateField('roeStatusUpdateFrequency', e.target.value)}>
                      <option value="daily">每日</option>
                      <option value="weekly">每周</option>
                      <option value="on_finding">每次发现</option>
                      <option value="none">不通知</option>
                    </select>
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>重大发现通知客户</label>
                    <Toggle checked={data.roeCriticalFindingNotify}
                      onChange={(v) => updateField('roeCriticalFindingNotify', v)} disabled={readOnly} />
                  </div>
                </div>
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>事件处置流程</label>
                    <textarea className="textInput" rows={3} value={data.roeIncidentProcedure} readOnly={readOnly}
                      onChange={(e) => updateField('roeIncidentProcedure', e.target.value)}
                      placeholder="若测试引发事件，应如何处理……" />
                  </div>
                </div>
              </div>

              {/* Compliance */}
              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>合规与授权</h3>
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>合规框架</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {COMPLIANCE_OPTIONS.map(fw => (
                        <label key={fw} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: readOnly ? 'default' : 'pointer' }}>
                          <input type="checkbox" checked={(data.roeComplianceFrameworks || []).includes(fw)}
                            disabled={readOnly} onChange={() => toggleCompliance(fw)} />
                          {fw}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Third-Party Providers */}
              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>第三方服务商</h3>
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>需要单独授权的云/托管服务商</label>
                    <input className="textInput" type="text" readOnly={readOnly}
                      value={(data.roeThirdPartyProviders || []).join(', ')}
                      onChange={(e) => updateField('roeThirdPartyProviders', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))}
                      placeholder="例如：AWS, Hetzner, Cloudflare" />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>备注</h3>
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <textarea className="textInput" rows={4} value={data.roeNotes} readOnly={readOnly}
                      onChange={(e) => updateField('roeNotes', e.target.value)}
                      placeholder="未被以上字段覆盖的补充规则……" />
                  </div>
                </div>
              </div>

              {/* Raw RoE Text (always read-only) */}
              {data.roeRawText && (
                <div className={styles.subSection}>
                  <h3 className={styles.subSectionTitle}>提取的文档文本</h3>
                  <div className={styles.fieldRow}>
                    <div className={styles.fieldGroup}>
                      <textarea className="textInput" rows={8} value={data.roeRawText} readOnly
                        style={{ fontFamily: 'monospace', fontSize: '0.8rem' }} />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>

    <Modal
      isOpen={showParseSuccess}
      onClose={() => setShowParseSuccess(false)}
      title="RoE 文档解析成功"
      size="default"
      footer={
        <button
          type="button"
          onClick={() => setShowParseSuccess(false)}
          style={{
            padding: '8px 24px',
            background: 'var(--color-accent, #3b82f6)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 500,
          }}
        >
          确定
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.9rem', lineHeight: 1.6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-success, #22c55e)' }}>
          <CheckCircle size={20} />
          <strong>已根据 RoE 文档更新项目设置。</strong>
        </div>

        <p style={{ margin: 0 }}>
          以下标签页可能已根据解析结果发生变更。请在保存前检查确认：
        </p>

        <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <li><strong>目标与模块</strong> — 目标域名、IP 地址、扫描模块、限速</li>
          <li><strong>工具矩阵</strong> — 工具阶段限制（被禁止的工具会在矩阵中被禁用）</li>
          <li><strong>交战规则（RoE）</strong> — 排除主机、时间窗口、测试许可、合规</li>
        </ul>

        <p style={{ margin: 0, padding: '10px 12px', background: 'var(--color-surface-alt, rgba(59,130,246,0.08))', borderRadius: '6px', borderLeft: '3px solid var(--color-accent, #3b82f6)' }}>
          交战规则（RoE）会同时对 <strong>侦察流水线</strong>（主机排除、限速、时间窗口）与 <strong>AI 代理</strong>（工具限制、阶段上限、提示词指令）生效。
        </p>
      </div>
    </Modal>
    </>
  )
}
