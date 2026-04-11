'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronDown, Shield, Upload, Trash2, Loader2, FileText } from 'lucide-react'
import { Toggle } from '@/components/ui'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'
import { NodeInfoTooltip } from '../NodeInfoTooltip'
import { TimeEstimate } from '../TimeEstimate'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface NucleiSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
}

interface CustomTemplate {
  id: string
  name: string
  severity: string
  file: string
  path: string
  size: number
}

const SEVERITY_OPTIONS = ['critical', 'high', 'medium', 'low', 'info']
const SEVERITY_LABELS: Record<string, string> = {
  critical: '严重',
  high: '高',
  medium: '中',
  low: '低',
  info: '信息',
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#e53e3e',
  high: '#dd6b20',
  medium: '#d69e2e',
  low: '#38a169',
  info: '#3182ce',
  unknown: '#718096',
}

export function NucleiSection({ data, updateField }: NucleiSectionProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const templateFileRef = useRef<HTMLInputElement>(null)

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/nuclei-templates')
      if (res.ok) {
        const json = await res.json()
        setCustomTemplates(json.templates || [])
      }
    } catch {
      // Silently fail
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleTemplateUpload = async (file: File) => {
    setIsUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/nuclei-templates', {
        method: 'POST',
        body: formData,
      })

      const result = await res.json()
      if (!res.ok) {
        setUploadError(result.error || '上传失败')
        return
      }

      setCustomTemplates(result.templates || [])
    } catch {
      setUploadError('上传失败，请重试。')
    } finally {
      setIsUploading(false)
      if (templateFileRef.current) templateFileRef.current.value = ''
    }
  }

  const handleTemplateDelete = async (templatePath: string) => {
    try {
      const res = await fetch(
        `/api/nuclei-templates?path=${encodeURIComponent(templatePath)}`,
        { method: 'DELETE' }
      )

      if (res.ok) {
        const result = await res.json()
        setCustomTemplates(result.templates || [])
      }
    } catch {
      // Silently fail
    }
  }

  const toggleSeverity = (severity: string) => {
    const current = data.nucleiSeverity ?? []
    if (current.includes(severity)) {
      updateField('nucleiSeverity', current.filter(s => s !== severity))
    } else {
      updateField('nucleiSeverity', [...current, severity])
    }
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Shield size={16} />
          Nuclei 漏洞扫描
          <NodeInfoTooltip section="Nuclei" />
          <span className={styles.badgeActive}>主动</span>
        </h2>
        <div className={styles.sectionHeaderRight}>
          <div onClick={(e) => e.stopPropagation()}>
            <Toggle
              checked={data.nucleiEnabled}
              onChange={(checked) => updateField('nucleiEnabled', checked)}
            />
          </div>
          <ChevronDown
            size={16}
            className={`${styles.sectionIcon} ${isOpen ? styles.sectionIconOpen : ''}`}
          />
        </div>
      </div>

      {isOpen && (
        <div className={styles.sectionContent}>
          <p className={styles.sectionDescription}>
            基于 ProjectDiscovery Nuclei 的模板化漏洞扫描。会对已发现的端点执行大量安全检查，用于识别 CVE、错误配置、暴露面板及其他安全问题。
          </p>
          {data.nucleiEnabled && (
          <>
          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>严重级别</h3>
            <p className={styles.fieldHint} style={{ marginBottom: '0.5rem' }}>按严重级别过滤漏洞；生产扫描建议排除 “info”</p>
            <TimeEstimate estimate="仅扫描 critical：相较全量严重级别约快 70%" />
            <div className={styles.checkboxGroup}>
              {SEVERITY_OPTIONS.map(severity => (
                <label key={severity} className="checkboxLabel">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={(data.nucleiSeverity ?? []).includes(severity)}
                    onChange={() => toggleSeverity(severity)}
                  />
                  {(SEVERITY_LABELS[severity] ?? (severity.charAt(0).toUpperCase() + severity.slice(1)))}（{severity}）
                </label>
              ))}
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>限速</label>
              <input
                type="number"
                className="textInput"
                value={data.nucleiRateLimit}
                onChange={(e) => updateField('nucleiRateLimit', parseInt(e.target.value) || 100)}
                min={1}
              />
              <span className={styles.fieldHint}>请求/秒。大多数目标建议 100–150；敏感系统建议更低</span>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>批量大小</label>
              <input
                type="number"
                className="textInput"
                value={data.nucleiBulkSize}
                onChange={(e) => updateField('nucleiBulkSize', parseInt(e.target.value) || 25)}
                min={1}
              />
              <span className={styles.fieldHint}>并行处理的主机数量</span>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>并发</label>
              <input
                type="number"
                className="textInput"
                value={data.nucleiConcurrency}
                onChange={(e) => updateField('nucleiConcurrency', parseInt(e.target.value) || 25)}
                min={1}
              />
              <span className={styles.fieldHint}>并行执行的模板数量</span>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>超时（秒）</label>
              <input
                type="number"
                className="textInput"
                value={data.nucleiTimeout}
                onChange={(e) => updateField('nucleiTimeout', parseInt(e.target.value) || 10)}
                min={1}
              />
              <span className={styles.fieldHint}>每个模板检查的请求超时</span>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>重试次数</label>
              <input
                type="number"
                className="textInput"
                value={data.nucleiRetries}
                onChange={(e) => updateField('nucleiRetries', parseInt(e.target.value) || 1)}
                min={0}
                max={10}
              />
              <span className={styles.fieldHint}>失败请求的重试次数</span>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>最大重定向</label>
              <input
                type="number"
                className="textInput"
                value={data.nucleiMaxRedirects}
                onChange={(e) => updateField('nucleiMaxRedirects', parseInt(e.target.value) || 10)}
                min={0}
                max={50}
              />
              <span className={styles.fieldHint}>允许跟随的最大重定向链长度</span>
            </div>
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>模板配置</h3>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>模板目录</label>
              <input
                type="text"
                className="textInput"
                value={(data.nucleiTemplates ?? []).join(', ')}
                onChange={(e) => updateField('nucleiTemplates', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder="cves, vulnerabilities, misconfig（留空=全部）"
              />
              <span className={styles.fieldHint}>示例：cves, vulnerabilities, misconfiguration, exposures, technologies, default-logins, takeovers</span>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>排除模板路径</label>
              <input
                type="text"
                className="textInput"
                value={(data.nucleiExcludeTemplates ?? []).join(', ')}
                onChange={(e) => updateField('nucleiExcludeTemplates', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder="http/vulnerabilities/generic/"
              />
              <span className={styles.fieldHint}>按路径排除特定目录或模板文件</span>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>自定义模板路径</label>
              <textarea
                className="textarea"
                value={(data.nucleiCustomTemplates ?? []).join('\n')}
                onChange={(e) => updateField('nucleiCustomTemplates', e.target.value.split('\n').filter(Boolean))}
                placeholder="/path/to/custom-templates&#10;~/my-nuclei-templates"
                rows={2}
              />
              <span className={styles.fieldHint}>除官方仓库外，额外添加你自己的模板</span>
            </div>
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>模板标签</h3>
            <p className={styles.fieldHint} style={{ marginBottom: '0.5rem' }}>按功能标签过滤模板</p>
            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>包含标签</label>
                <input
                  type="text"
                  className="textInput"
                  value={(data.nucleiTags ?? []).join(', ')}
                  onChange={(e) => updateField('nucleiTags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder="cve, xss, sqli, rce（留空=全部）"
                />
                <span className={styles.fieldHint}>常用：cve, xss, sqli, rce, lfi, ssrf, xxe, ssti</span>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>排除标签</label>
                <input
                  type="text"
                  className="textInput"
                  value={(data.nucleiExcludeTags ?? []).join(', ')}
                  onChange={(e) => updateField('nucleiExcludeTags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder="dos, fuzz"
                />
                <span className={styles.fieldHint}>生产环境建议排除 dos、fuzz</span>
              </div>
            </div>
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>模板选项</h3>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>扫描前更新模板</span>
                <p className={styles.toggleDescription}>扫描前下载最新模板。会额外增加约 10–30 秒</p>
              </div>
              <Toggle
                checked={data.nucleiAutoUpdateTemplates}
                onChange={(checked) => updateField('nucleiAutoUpdateTemplates', checked)}
              />
            </div>
            {/* Custom Templates Manager */}
            <div style={{ marginTop: '12px', padding: '12px', background: 'var(--bg-secondary, #1a1a2e)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>自定义模板</span>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
                    上传为全局共享。勾选需要纳入本项目扫描的模板。
                  </p>
                </div>
                <div>
                  <input
                    ref={templateFileRef}
                    type="file"
                    accept=".yaml,.yml"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleTemplateUpload(file)
                    }}
                  />
                  <button
                    type="button"
                    className="secondaryButton"
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', padding: '4px 10px' }}
                    onClick={() => templateFileRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? <Loader2 size={13} className={styles.spin} /> : <Upload size={13} />}
                    {isUploading ? '上传中…' : '上传 .yaml'}
                  </button>
                </div>
              </div>

              {uploadError && (
                <p style={{ fontSize: '0.75rem', color: '#e53e3e', margin: '4px 0 8px' }}>{uploadError}</p>
              )}

              {customTemplates.length === 0 ? (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontStyle: 'italic', margin: '8px 0 0' }}>
                  暂无已上传的自定义模板。
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                  {customTemplates.map((t) => {
                    const selected = data.nucleiSelectedCustomTemplates ?? []
                    const isChecked = selected.includes(t.path)
                    return (
                      <div
                        key={t.path}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          background: isChecked ? 'var(--bg-tertiary, #16162a)' : 'transparent',
                          fontSize: '0.78rem',
                          border: isChecked ? '1px solid var(--color-primary, #e53e3e33)' : '1px solid transparent',
                        }}
                      >
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              const current = data.nucleiSelectedCustomTemplates ?? []
                              if (isChecked) {
                                updateField('nucleiSelectedCustomTemplates', current.filter(p => p !== t.path))
                              } else {
                                updateField('nucleiSelectedCustomTemplates', [...current, t.path])
                              }
                            }}
                            style={{ accentColor: 'var(--color-primary, #e53e3e)', cursor: 'pointer', flexShrink: 0 }}
                          />
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '1px 6px',
                              borderRadius: '3px',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              color: '#fff',
                              background: SEVERITY_COLORS[t.severity] || SEVERITY_COLORS.unknown,
                              flexShrink: 0,
                            }}
                          >
                            {t.severity}
                          </span>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.id}
                          </span>
                          {t.name && (
                            <span style={{ color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              — {t.name}
                            </span>
                          )}
                        </label>
                        <button
                          type="button"
                          onClick={() => handleTemplateDelete(t.path)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-tertiary)',
                            padding: '2px',
                            flexShrink: 0,
                            marginLeft: '8px',
                          }}
                          title={`删除 ${t.file}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>仅扫描新增模板</span>
                <p className={styles.toggleDescription}>只运行上次更新后新增的模板，适合每日例行扫描</p>
              </div>
              <Toggle
                checked={data.nucleiNewTemplatesOnly}
                onChange={(checked) => updateField('nucleiNewTemplatesOnly', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>DAST 模式</span>
                <p className={styles.toggleDescription}>对 XSS/SQLi/RCE 等进行主动 fuzz。更激进，可能触发告警；需要带参数的 URL</p>
                <TimeEstimate estimate="扫描耗时 +50–100%（主动 fuzz）" />
              </div>
              <Toggle
                checked={data.nucleiDastMode}
                onChange={(checked) => updateField('nucleiDastMode', checked)}
              />
            </div>
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>高级选项</h3>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>无头模式</span>
                <p className={styles.toggleDescription}>对 JavaScript 渲染页面使用无头浏览器。需要安装 Chrome</p>
                <TimeEstimate estimate="扫描耗时 +100–200%（浏览器渲染）" />
              </div>
              <Toggle
                checked={data.nucleiHeadless}
                onChange={(checked) => updateField('nucleiHeadless', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>使用系统 DNS</span>
                <p className={styles.toggleDescription}>使用操作系统 DNS 替代 nuclei 默认解析器，更适合内网环境</p>
              </div>
              <Toggle
                checked={data.nucleiSystemResolvers}
                onChange={(checked) => updateField('nucleiSystemResolvers', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>Interactsh</span>
                <p className={styles.toggleDescription}>通过带外回连检测盲打漏洞（SSRF/XXE/RCE）。需要联网</p>
              </div>
              <Toggle
                checked={data.nucleiInteractsh}
                onChange={(checked) => updateField('nucleiInteractsh', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>跟随重定向</span>
                <p className={styles.toggleDescription}>模板执行期间跟随 HTTP 重定向</p>
              </div>
              <Toggle
                checked={data.nucleiFollowRedirects}
                onChange={(checked) => updateField('nucleiFollowRedirects', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>扫描全部解析 IP</span>
                <p className={styles.toggleDescription}>扫描解析到的全部 IP（不只 hostname）。可能会产生重复漏洞结果</p>
              </div>
              <Toggle
                checked={data.nucleiScanAllIps}
                onChange={(checked) => updateField('nucleiScanAllIps', checked)}
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Docker 镜像</label>
            <input
              type="text"
              className="textInput"
              value={data.nucleiDockerImage}
              disabled
            />
          </div>
          </>
          )}
        </div>
      )}
    </div>
  )
}
