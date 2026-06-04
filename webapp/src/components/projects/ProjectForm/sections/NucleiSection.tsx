'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronDown, Shield, Upload, Trash2, Loader2, FileText, Play, AlertTriangle } from 'lucide-react'
import { Toggle, WikiInfoButton } from '@/components/ui'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'
import { NodeInfoTooltip } from '../NodeInfoTooltip'
import { TimeEstimate } from '../TimeEstimate'
import { FileImportButton } from '../FileImportButton'
import { AiToggleLabel } from '../AiToggleLabel'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface NucleiSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  onRun?: () => void
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

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#e53e3e',
  high: '#dd6b20',
  medium: '#d69e2e',
  low: '#38a169',
  info: '#3182ce',
  unknown: '#718096',
}

export function NucleiSection({ data, updateField, onRun }: NucleiSectionProps) {
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
          Nuclei 漏洞扫描器
          <NodeInfoTooltip section="Nuclei" />
          <WikiInfoButton target="Nuclei" />
          <span className={styles.badgeActive}>已启用</span>
        </h2>
        <div className={styles.sectionHeaderRight}>
          {onRun && data.nucleiEnabled && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRun() }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '3px 8px', borderRadius: '4px',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                color: '#22c55e', cursor: 'pointer', fontSize: '11px', fontWeight: 500,
              }}
              title="运行 Nuclei"
            >
              <Play size={10} /> 运行局部侦察
            </button>
          )}
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
            使用 ProjectDiscovery 的 Nuclei 进行模板化漏洞扫描。对已发现端点运行数千条安全检测，以识别 CVE、错误配置、暴露面板等安全问题。
          </p>
          {data.nucleiEnabled && (
          <>
          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>严重等级</h3>
            <p className={styles.fieldHint} style={{ marginBottom: '0.5rem' }}>按严重度过滤漏洞。生产扫描建议排除 &ldquo;info&rdquo;</p>
            <TimeEstimate estimate="仅 Critical：比全等级约快 70%" />
            <div className={styles.checkboxGroup}>
              {SEVERITY_OPTIONS.map(severity => (
                <label key={severity} className="checkboxLabel">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={(data.nucleiSeverity ?? []).includes(severity)}
                    onChange={() => toggleSeverity(severity)}
                  />
                  {severity.charAt(0).toUpperCase() + severity.slice(1)}
                </label>
              ))}
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>速率限制</label>
              <input
                type="number"
                className="textInput"
                value={data.nucleiRateLimit}
                onChange={(e) => updateField('nucleiRateLimit', parseInt(e.target.value) || 100)}
                min={1}
              />
              <span className={styles.fieldHint}>每秒请求数。多数目标建议 100-150，敏感系统建议更低</span>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>批大小</label>
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
              <label className={styles.fieldLabel}>并发数</label>
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
              <span className={styles.fieldHint}>每个模板检测请求的超时时间</span>
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
              <span className={styles.fieldHint}>请求失败时的重试次数</span>
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
              <span className={styles.fieldHint}>最多跟随的重定向链长度</span>
            </div>
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>模板配置</h3>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>模板目录</label>
              <div className={styles.fileImportWrap}>
                <input
                  type="text"
                  className="textInput"
                  value={(data.nucleiTemplates ?? []).join(', ')}
                  onChange={(e) => updateField('nucleiTemplates', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder="cves, vulnerabilities, misconfig（留空 = 全部）"
                />
                <FileImportButton
                  fieldName="模板目录"
                  onImport={(values) => updateField('nucleiTemplates', values)}
                />
              </div>
              <span className={styles.fieldHint}>cves, vulnerabilities, misconfiguration, exposures, technologies, default-logins, takeovers</span>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>排除模板路径</label>
              <div className={styles.fileImportWrap}>
                <input
                  type="text"
                  className="textInput"
                  value={(data.nucleiExcludeTemplates ?? []).join(', ')}
                  onChange={(e) => updateField('nucleiExcludeTemplates', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder="http/vulnerabilities/generic/"
                />
                <FileImportButton
                  fieldName="模板路径"
                  onImport={(values) => updateField('nucleiExcludeTemplates', values)}
                />
              </div>
              <span className={styles.fieldHint}>按路径排除指定目录或模板文件</span>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>自定义模板路径</label>
              <div className={styles.fileImportWrap}>
                <textarea
                  className="textarea"
                  value={(data.nucleiCustomTemplates ?? []).join('\n')}
                  onChange={(e) => updateField('nucleiCustomTemplates', e.target.value.split('\n').filter(Boolean))}
                  placeholder="/path/to/custom-templates&#10;~/my-nuclei-templates"
                  rows={2}
                />
                <FileImportButton
                  variant="textarea"
                  fieldName="模板路径"
                  onImport={(values) => updateField('nucleiCustomTemplates', values)}
                />
              </div>
              <span className={styles.fieldHint}>在官方模板库之外添加你自己的模板</span>
            </div>
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>模板标签</h3>
            <p className={styles.fieldHint} style={{ marginBottom: '0.5rem' }}>按功能标签过滤模板</p>
            <div className={styles.toggleRow} style={{ marginBottom: 'var(--space-2)', alignItems: 'center' }}>
              <AiToggleLabel
                label="使用 AI 选择标签"
                tooltip={
                  'AI 会根据识别到的技术栈，在每次扫描时自动裁剪“包含标签”列表（例如在 Node 站点上移除 wordpress 这类无关标签；识别到 Apache 时自动加入 apache 等技术相关标签）。开启后，下方静态“包含标签”列表会被忽略。该开关与 Target 页的 AI 面板联动：这里切换，那里也会同步。候选标签池来自当前 nuclei-templates 卷（出现次数 >= 50，约 125 个大类标签）。' +
                  (!data.aiInPipeline ? '请先在 Target 页启用 “AI in Pipeline” 才能使用。' : '')
                }
              />
              <Toggle
                checked={data.nucleiAiTags}
                disabled={!data.aiInPipeline}
                onChange={(checked) => updateField('nucleiAiTags', checked)}
              />
            </div>
            <div className={styles.toggleRow} style={{ alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-2)' }}>
              <AiToggleLabel
                label="使用 AI 过滤误报拦截页"
                tooltip={
                  "增强 Nuclei 基于关键词的 WAF/限流识别能力。当某条结果的响应状态码可疑（403/406/418/429/503）但未命中关键词时，由 LLM 判断响应体是拦截页还是真实命中。可识别静态列表遗漏的“换壳”WAF 拦截（例如 AWS WAF JSON、自定义 Imperva、Fortinet），并避免合法页面包含 “WAF” 或 “Access Denied” 等词导致的误报。" +
                  (!data.aiInPipeline ? '请先在 Target 页启用 “AI in Pipeline” 才能使用。' : '')
                }
              />
              <Toggle
                checked={data.nucleiAiResponseFilter}
                disabled={!data.aiInPipeline}
                onChange={(checked) => updateField('nucleiAiResponseFilter', checked)}
              />
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>包含标签</label>
                <div className={styles.fileImportWrap}>
                  <input
                    type="text"
                    className="textInput"
                    value={(data.nucleiTags ?? []).join(', ')}
                    onChange={(e) => updateField('nucleiTags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder="cve, xss, sqli, rce（留空 = 仅自定义模板）"
                    disabled={data.nucleiAiTags}
                    style={data.nucleiAiTags ? { opacity: 0.5 } : undefined}
                  />
                  <FileImportButton
                    fieldName="标签"
                    onImport={(values) => updateField('nucleiTags', values)}
                  />
                </div>
                <span className={styles.fieldHint}>
                  {data.nucleiAiTags ? (
                    <>标签由 AI 根据技术指纹按次扫描选择，上方静态列表会被忽略。</>
                  ) : (
                    <>
                      常用：cve, xss, sqli, rce, lfi, ssrf, xxe, ssti。
                      <strong> 留空</strong> 表示内置约 8000 个模板 <em>不会</em> 运行 &mdash;
                      仅执行你在下方勾选的自定义模板。如果两者都为空，则跳过检测阶段。
                    </>
                  )}
                </span>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>排除标签</label>
                <div className={styles.fileImportWrap}>
                  <input
                    type="text"
                    className="textInput"
                    value={(data.nucleiExcludeTags ?? []).join(', ')}
                    onChange={(e) => updateField('nucleiExcludeTags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder="dos, fuzz"
                  />
                  <FileImportButton
                    fieldName="标签"
                    onImport={(values) => updateField('nucleiExcludeTags', values)}
                  />
                </div>
                <span className={styles.fieldHint}>生产扫描建议排除 dos、fuzz</span>
              </div>
            </div>
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>模板选项</h3>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>自动更新模板</span>
                <p className={styles.toggleDescription}>扫描前下载最新模板，额外耗时约 10-30 秒</p>
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
                    上传为全局共享。勾选要在本项目扫描中使用的模板。
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
                    {isUploading ? '正在上传...' : '上传 .yaml'}
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
                <span className={styles.toggleLabel}>仅新模板</span>
                <p className={styles.toggleDescription}>只运行上次更新后新增的模板，适合日常扫描</p>
              </div>
              <Toggle
                checked={data.nucleiNewTemplatesOnly}
                onChange={(checked) => updateField('nucleiNewTemplatesOnly', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>增加 DAST 扫描</span>
                <p className={styles.toggleDescription}>对带参数的 URL 进行第二次 nuclei 扫描并启用 <code>-dast</code>（XSS/SQLi/SSTI/RCE fuzz）。为叠加模式：检测阶段（CVE/暴露面/自定义模板/标签）仍会先执行。</p>
                <TimeEstimate estimate="扫描时间约 +50-100%（额外 DAST 扫描）" />
              </div>
              <Toggle
                checked={data.nucleiDastMode}
                onChange={(checked) => updateField('nucleiDastMode', checked)}
              />
            </div>
            {data.nucleiDastMode && (
              <div className={styles.shodanWarning}>
                <AlertTriangle size={14} />
                <div>
                  <strong>两次扫描如何工作。</strong> 第 1 次（检测）会按你的完整配置执行：严重度、标签、自定义模板，以及内置约 8000 个模板（扣除你排除的部分）。第 2 次（DAST）仅运行 <code>dast/</code> 下约 250 个模板，并强制启用 <code>-dast</code>；同时会忽略标签/模板过滤，因为这些过滤与 DAST 集合相交可能为空，导致 <em>&ldquo;no templates provided for scan.&rdquo;</em> 的致命错误。
                  <br /><br />
                  <strong>DAST 需要带参数的 URL。</strong> 内置 DAST 模板主要 fuzz 查询参数（路径/头/Cookie/Body 的 fuzz 自 v3.2 起存在，但在官方模板中较少）。如果 <code>resource_enum</code> 未产出任何包含 <code>?param=value</code> 的 URL，则会自动跳过 DAST，只运行检测阶段。若需要 DAST 覆盖，请先运行 Katana / Hakrawler。
                  <br /><br />
                  <strong>标签与模板过滤只作用于检测阶段。</strong> 想让检测阶段偏向 GraphQL？照常设置包含标签 <code>graphql,apollo,hasura</code>：它只过滤第 1 次扫描；DAST 仍会对带参数 URL 进行不加过滤的运行。
                  <br /><br />
                  <strong>成本：</strong>开启 DAST 后扫描时间大约翻倍（两次扫描无法共享工作量）。两次扫描的结果会合并为一个报告。
                </div>
              </div>
            )}
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>高级选项</h3>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>无头模式</span>
                <p className={styles.toggleDescription}>使用无头浏览器渲染 JavaScript 页面。需要已安装 Chrome</p>
                <TimeEstimate estimate="扫描时间约 +100-200%（浏览器渲染）" />
              </div>
              <Toggle
                checked={data.nucleiHeadless}
                onChange={(checked) => updateField('nucleiHeadless', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>系统 DNS 解析器</span>
                <p className={styles.toggleDescription}>使用系统 DNS 替代 nuclei 默认 DNS，更适合内网环境</p>
              </div>
              <Toggle
                checked={data.nucleiSystemResolvers}
                onChange={(checked) => updateField('nucleiSystemResolvers', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>Interactsh</span>
                <p className={styles.toggleDescription}>通过带外回连检测盲注类漏洞（SSRF/XXE/RCE）。需要可访问互联网</p>
              </div>
              <Toggle
                checked={data.nucleiInteractsh}
                onChange={(checked) => updateField('nucleiInteractsh', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>跟随重定向</span>
                <p className={styles.toggleDescription}>模板执行过程中跟随 HTTP 重定向</p>
              </div>
              <Toggle
                checked={data.nucleiFollowRedirects}
                onChange={(checked) => updateField('nucleiFollowRedirects', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>扫描所有 IP</span>
                <p className={styles.toggleDescription}>扫描解析到的全部 IP，而不仅是域名。可能产生重复漏洞结果</p>
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
