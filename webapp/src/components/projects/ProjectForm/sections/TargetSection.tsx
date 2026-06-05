'use client'

import { useState, useMemo, useEffect } from 'react'
import { ChevronDown, Target, ShieldAlert, AlertTriangle } from 'lucide-react'
import { AiToggleLabel } from '../AiToggleLabel'
import { Toggle } from '@/components/ui'
import type { Project } from '@prisma/client'
import { isHardBlockedDomain } from '@/lib/hard-guardrail'
import { FileImportButton } from '../FileImportButton'
import { ModelPicker } from '@/components/shared/ModelPicker'
import { useProject } from '@/providers/ProjectProvider'
import styles from '../ProjectForm.module.css'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface TargetSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  mode?: 'create' | 'edit'
}

// Helper to convert stored format (with dots) to display format (without dots)
function toDisplayPrefixes(subdomainList: string[]): string {
  return subdomainList
    .filter(s => s !== '.')  // Exclude root domain marker
    .map(s => s.endsWith('.') ? s.slice(0, -1) : s)  // Remove trailing dot
    .join(', ')
}

// Helper to convert display format to stored format (with trailing dots)
function toStoredPrefixes(displayValue: string, includeRoot: boolean): string[] {
  const prefixes = displayValue
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.endsWith('.') ? s : s + '.')  // Add trailing dot if missing

  if (includeRoot) {
    prefixes.push('.')
  }

  return prefixes
}

// Helper to parse IP textarea into array
function parseIpList(text: string): string[] {
  return text
    .split(/[,\n]/)
    .map(s => s.trim())
    .filter(Boolean)
}

export function TargetSection({ data, updateField, mode = 'create' }: TargetSectionProps) {
  const isLocked = mode === 'edit'
  const [isOpen, setIsOpen] = useState(true)
  const { userId } = useProject()

  const ipMode = data.ipMode || false

  // Check if root domain is included in the list
  const includesRootDomain = useMemo(() => data.subdomainList.includes('.'), [data.subdomainList])

  // Display value without dots
  const displayPrefixes = useMemo(() => toDisplayPrefixes(data.subdomainList), [data.subdomainList])

  // Display value for IP textarea
  const displayIps = useMemo(() => (data.targetIps || []).join('\n'), [data.targetIps])

  // Hard guardrail: deterministic check for government/public domains (non-disableable)
  const hardBlockResult = useMemo(
    () => (!ipMode && data.targetDomain ? isHardBlockedDomain(data.targetDomain) : { blocked: false, reason: '' }),
    [ipMode, data.targetDomain]
  )

  const handlePrefixesChange = (value: string) => {
    updateField('subdomainList', toStoredPrefixes(value, includesRootDomain))
  }

  const handleRootDomainToggle = (checked: boolean) => {
    const currentPrefixes = toDisplayPrefixes(data.subdomainList)
    updateField('subdomainList', toStoredPrefixes(currentPrefixes, checked))
  }

  // When subdomain discovery is OFF and no prefixes are set, the only valid
  // target is the root domain. Force-enable "Include Root Domain" and lock it
  // so the pipeline cannot be started with zero targets (which would silently
  // produce empty results). Runs in edit mode too — it's a system-driven
  // safety net, not user editing of scope.
  const forceIncludeRootDomain = !ipMode
    && !data.subdomainDiscoveryEnabled
    && displayPrefixes.trim().length === 0

  // When the user supplies explicit Subdomain Prefixes, the pipeline runs in
  // FILTERED mode and the entire Subdomain Discovery group (Subfinder, Amass,
  // crt.sh, HackerTarget, Knockpy, puredns) is silently skipped. Force the
  // master toggle OFF so the UI matches what the backend actually does.
  const prefixesPresent = !ipMode && !isLocked && displayPrefixes.trim().length > 0

  useEffect(() => {
    if (forceIncludeRootDomain && !includesRootDomain) {
      handleRootDomainToggle(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceIncludeRootDomain, includesRootDomain])

  useEffect(() => {
    if (prefixesPresent && data.subdomainDiscoveryEnabled) {
      updateField('subdomainDiscoveryEnabled', false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefixesPresent, data.subdomainDiscoveryEnabled])

  const handleIpModeToggle = (checked: boolean) => {
    updateField('ipMode', checked)
    if (checked) {
      updateField('targetDomain', '')
      updateField('subdomainList', [])
    } else {
      updateField('targetIps', [])
    }
  }

  const handleIpsChange = (text: string) => {
    updateField('targetIps', parseIpList(text))
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Target size={16} />
          目标配置
        </h2>
        <ChevronDown
          size={16}
          className={`${styles.sectionIcon} ${isOpen ? styles.sectionIconOpen : ''}`}
        />
      </div>

      {isOpen && (
        <div className={styles.sectionContent}>
          <p className={styles.sectionDescription}>
            定义本次渗透测试的主要目标，可在域名模式与 IP 模式之间切换。
          </p>

          {/* IP Mode Toggle - locked in edit mode */}
          <div className={styles.toggleRow}>
            <div>
              <span className={styles.toggleLabel}>从 IP 开始</span>
              <p className={styles.toggleDescription}>
                使用 IP 地址或 CIDR 段作为目标，而不是域名。流水线将尝试执行反向 DNS 以发现主机名。
              </p>
            </div>
            <Toggle
              checked={ipMode}
              onChange={handleIpModeToggle}
              disabled={isLocked}
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={`${styles.fieldLabel} ${styles.fieldLabelRequired}`}>
                项目名称
              </label>
              <input
                type="text"
                className="textInput"
                value={data.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="我的安全项目"
              />
            </div>

            {!ipMode && (
              <div className={styles.fieldGroup}>
                <label className={`${styles.fieldLabel} ${styles.fieldLabelRequired}`}>
                  目标域名
                </label>
                <input
                  type="text"
                  className="textInput"
                  value={data.targetDomain}
                  onChange={(e) => updateField('targetDomain', e.target.value)}
                  placeholder="example.com"
                  disabled={isLocked}
                  title={isLocked ? '目标域名在创建后不可更改。如需修改，请创建新项目。' : undefined}
                />
              </div>
            )}
          </div>

          {/* Hard guardrail warning for government/public domains */}
          {hardBlockResult.blocked && (
            <div className={styles.shodanWarning} style={{ borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.08)' }}>
              <ShieldAlert size={14} style={{ color: '#ef4444' }} />
              <span>
                <strong>目标已被永久拦截：</strong>政府、军方、教育机构与国际组织网站（.gov、.mil、.edu、.int 等）
                始终被禁止作为目标，与护栏设置无关，且无法关闭此限制。
              </span>
            </div>
          )}

          {/* IP Mode: Target IPs textarea */}
          {ipMode && (
            <div className={styles.fieldGroup}>
              <label className={`${styles.fieldLabel} ${styles.fieldLabelRequired}`}>
                目标 IP / CIDR
              </label>
              <div className={styles.fileImportWrap}>
                <textarea
                  className="textarea"
                  value={displayIps}
                  onChange={(e) => handleIpsChange(e.target.value)}
                  placeholder={"192.168.1.1\n10.0.0.0/24\n2001:db8::1"}
                  rows={4}
                  disabled={isLocked}
                  title={isLocked ? '目标 IP 在创建后不可更改。' : undefined}
                />
                {!isLocked && (
                  <FileImportButton
                    variant="textarea"
                    fieldName="目标 IP / CIDR"
                    onImport={(values) => updateField('targetIps', values)}
                  />
                )}
              </div>
              <span className={styles.fieldHint}>
                {isLocked
                  ? '项目创建后目标 IP 会被锁定。如需修改，请创建新项目。'
                  : '每行一个 IP 或 CIDR，也可使用逗号分隔。支持 IPv4、IPv6 与 CIDR 段。最大 /24（256 主机）。'}
              </span>
            </div>
          )}

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>描述</label>
            <textarea
              className="textarea"
              value={data.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="项目描述（可选）"
              rows={2}
            />
          </div>

          {/* Domain-mode only fields */}
          {!ipMode && (
            <>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>子域名前缀</label>
                <div className={styles.fileImportWrap}>
                  <input
                    type="text"
                    className="textInput"
                    value={displayPrefixes}
                    onChange={(e) => handlePrefixesChange(e.target.value)}
                    placeholder="www, api, admin（逗号分隔）"
                    disabled={isLocked}
                    title={isLocked ? '子域名列表在创建后不可更改。如需修改，请创建新项目。' : undefined}
                  />
                  {!isLocked && (
                    <FileImportButton
                      fieldName="子域名前缀"
                      onImport={(values) => handlePrefixesChange(values.join(', '))}
                    />
                  )}
                </div>
                <span className={styles.fieldHint}>
                  {isLocked
                    ? '为保持图数据一致性，项目创建后目标域名与子域名范围将被锁定。如需修改，请创建新项目。'
                    : '留空则枚举所有子域名。请输入不带点的前缀（例如：www、api、admin）。'}
                </span>
                {!isLocked && displayPrefixes.trim().length === 0 && (
                  <div
                    className={styles.shodanWarning}
                    style={{
                      marginTop: 'var(--space-2)',
                      marginBottom: 0,
                      padding: 'var(--space-3) var(--space-4)',
                      fontSize: 'var(--text-sm)',
                      borderWidth: '2px',
                      borderColor: 'rgba(251, 146, 60, 0.5)',
                      background: 'rgba(251, 146, 60, 0.12)',
                      alignItems: 'center',
                    }}
                  >
                    <AlertTriangle size={22} style={{ color: '#fb923c' }} />
                    <span>
                      <strong>提示：</strong>子域名前缀留空会对整个域进行完整子域名枚举。
                      相比只扫描指定前缀，耗时会<strong>显著更长</strong>。
                    </span>
                  </div>
                )}
                {prefixesPresent && (
                  <div
                    className={styles.shodanWarning}
                    style={{
                      marginTop: 'var(--space-2)',
                      marginBottom: 0,
                      padding: 'var(--space-3) var(--space-4)',
                      fontSize: 'var(--text-sm)',
                      borderWidth: '2px',
                      borderColor: 'rgba(96, 165, 250, 0.5)',
                      background: 'rgba(96, 165, 250, 0.12)',
                      alignItems: 'center',
                    }}
                  >
                    <AlertTriangle size={22} style={{ color: '#60a5fa' }} />
                    <span>
                      <strong>过滤模式：</strong>设置明确前缀后，流水线仅扫描你列出的子域名。
                      <strong>子域名发现已自动关闭并锁定</strong>（Subfinder、Amass、crt.sh、HackerTarget、Knockpy、puredns 将不会运行）。
                      若需全量枚举，请清空前缀。
                    </span>
                  </div>
                )}
              </div>

              <div className={styles.toggleRow}>
                <div>
                  <span className={styles.toggleLabel}>包含根域名</span>
                  <p className={styles.toggleDescription}>
                    同时扫描根域名（例如不带子域名的 example.com）
                    {forceIncludeRootDomain && (
                      <>
                        {' '}
                        <strong>已锁定为开启：子域名发现已关闭且未设置前缀，因此根域名是唯一有效目标。</strong>
                      </>
                    )}
                  </p>
                </div>
                <Toggle
                  checked={includesRootDomain}
                  onChange={handleRootDomainToggle}
                  disabled={isLocked || forceIncludeRootDomain}
                />
              </div>

              {/* AI in Pipeline (master toggle, model picker, per-tool toggles) */}
              <div className={styles.subSection}>
                <div className={styles.toggleRow} style={{ gap: 'var(--space-4)', alignItems: 'center' }}>
                  <AiToggleLabel
                    label="启用流水线 AI"
                    tooltip={
                      '主开关：解锁下方所有按工具划分的 AI 开关。关闭时，所有工具级 AI 标记会被强制关闭并禁用，' +
                      '侦察流水线不会进行任何 LLM 调用；开启后，每个工具的 AI hook 可独立启用/停用。' +
                      '下方可选择该流水线 AI hook 使用的模型。'
                    }
                  />
                  <Toggle
                    checked={data.aiInPipeline}
                    onChange={(checked) => {
                      updateField('aiInPipeline', checked)
                      // When master flips, cascade to every per-tool flag so the
                      // form state matches the backend defense-in-depth contract.
                      updateField('ffufAiExtensions', checked)
                      updateField('nucleiAiTags', checked)
                      updateField('wafAiClassifier', checked)
                      updateField('nucleiAiResponseFilter', checked)
                      updateField('takeoverAiClassifier', checked)
                    }}
                  />
                </div>
                {data.aiInPipeline && (
                  <>
                    <div className={styles.fieldRow} style={{ marginTop: 'var(--space-3)' }}>
                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>AI 模型</label>
                        <ModelPicker
                          userId={userId}
                          value={data.aiPipelineModel}
                          onChange={(id) => updateField('aiPipelineModel', id)}
                        />
                        <span className={styles.fieldHint}>
                          侦察阶段所有 AI hook 使用的模型，与 Agent 自身的模型选择相互独立。
                          若更关注成本，可在此选择更便宜的模型。
                        </span>
                      </div>
                    </div>

                    {/* Per-tool AI toggles. Each one mirrors the toggle in its tool
                        section, sharing the same form field, so flipping either
                        place updates both. The list lives inside a fixed-height
                        scroll container so adding more hooks doesn't push the
                        rest of the form down. Descriptions are rendered as
                        native title-attribute tooltips on the info icon to
                        keep each row compact. Add new entries to the
                        `aiPipelineHooks` array below as more tools gain AI
                        hooks -- no JSX changes needed. */}
                    {(() => {
                      const aiPipelineHooks: Array<{
                        field: 'ffufAiExtensions' | 'nucleiAiTags' | 'wafAiClassifier' | 'nucleiAiResponseFilter' | 'takeoverAiClassifier'
                        label: string
                        description: string
                      }> = [
                        {
                          field: 'ffufAiExtensions',
                          label: 'FFuf：用 AI 推断后缀',
                          description: '对每个 fuzz 目标，FFuf 会先发送一次 HEAD 请求，并基于响应头（Server、X-Powered-By、X-AspNet-Version）让所选模型推断最可能的文件后缀。开启后，FFuf 模块中的静态后缀列表将被忽略。该开关与 FFuf 模块中的同名开关共享同一字段：这里切换会同步到那里。按指纹缓存会将相同技术栈后的多个 Host 折叠为一次 LLM 调用。',
                        },
                        {
                          field: 'nucleiAiTags',
                          label: 'Nuclei：用 AI 选择标签',
                          description: '每次扫描仅执行一次：Nuclei 汇总 http_probe 检测到的技术栈（Wappalyzer + Server headers），并让所选模型将 include-tags 精简为匹配技术栈的标签。例如在 Node 站点上去掉 wordpress 之类无关标签，检测到 Apache 或 WordPress 插件时补充对应标签。开启后，Nuclei 模块中的静态 Include Tags 列表将被忽略。该开关与 Nuclei 模块中的同名开关共享同一字段。候选标签池来自运行时 nuclei-templates 卷（数量 >= 50，约 125 个大类标签）。',
                        },
                        {
                          field: 'wafAiClassifier',
                          label: '安全检查：用 AI 识别 WAF',
                          description: '增强“直接 IP / WAF 绕过”检查中使用的静态 WAF/CDN 头部 token 检测。当静态列表漏检（现代 WAF 可能移除或重塑其头部标识）时，会将响应交给所选模型二次分析，基于 headers、body 指纹、cookies 与延迟对 WAF 存在性打分 0–100。该开关与「安全检查」模块中的同名开关共享同一字段。按响应指纹缓存会将相同响应折叠为一次 LLM 调用。',
                        },
                        {
                          field: 'nucleiAiResponseFilter',
                          label: 'Nuclei：用 AI 过滤误报拦截页',
                          description: '增强 Nuclei 误报过滤器内的基于关键词的 WAF/限流识别。当静态列表漏检（改版的 WAF 拦截页、AWS WAF JSON 错误页、自定义 Fortinet 页面等）但响应仍像拦截（例如注入类发现出现可疑状态码）时，LLM 会将 body 判定为拦截页或真实命中，从而抑制误报，并暴露被关键词过滤器误隐藏的真实发现。该开关与 Nuclei 模块中的同名开关共享同一字段。按响应指纹缓存用于控制成本。',
                        },
                        {
                          field: 'takeoverAiClassifier',
                          label: '接管检测：用 AI 区分 WAF “No-Host” 页面',
                          description: 'Subjack/Nuclei 的接管指纹可能与 WAF 对“未知主机名”返回的拦截页产生碰撞。开启后，会对每个接管候选进行探测；若响应不包含第三方厂商 token（Heroku-Request-Id、x-amz-bucket-region 等），则由 LLM 将 body 判定为真实未认领服务页或 WAF 拦截页。AI 判定为碰撞的结果会额外扣 40 分，从而进入 manual_review 而非作为高危直接发布。该开关与「子域名接管」模块中的同名开关共享同一字段。',
                        },
                      ]
                      return (
                        <div
                          style={{
                            marginTop: 'var(--space-4)',
                            maxHeight: 240,
                            overflowY: 'auto',
                            border: '1px solid var(--border-subtle, #2a2a2a)',
                            borderRadius: 'var(--radius-2, 6px)',
                            padding: 'var(--space-2, 8px) var(--space-3, 12px)',
                            background: 'var(--surface-1, transparent)',
                          }}
                        >
                          {aiPipelineHooks.map((hook, idx) => (
                            <div
                              key={hook.field}
                              className={styles.toggleRow}
                              style={{
                                gap: 'var(--space-3)',
                                paddingTop: idx === 0 ? 0 : 'var(--space-2, 8px)',
                                paddingBottom: 'var(--space-2, 8px)',
                                borderTop: idx === 0 ? 'none' : '1px solid var(--border-subtle, #222)',
                                alignItems: 'center',
                              }}
                            >
                              <AiToggleLabel
                                label={hook.label}
                                tooltip={hook.description}
                              />
                              <Toggle
                                checked={data[hook.field]}
                                onChange={(checked) => updateField(hook.field, checked)}
                              />
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </>
                )}
              </div>

              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>域名验证</h3>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>验证域名所有权</span>
                    <p className={styles.toggleDescription}>
                      扫描前需要通过 DNS TXT 记录验证
                    </p>
                  </div>
                  <Toggle
                    checked={data.verifyDomainOwnership}
                    onChange={(checked) => updateField('verifyDomainOwnership', checked)}
                  />
                </div>

                {data.verifyDomainOwnership && (
                  <div className={styles.fieldRow}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>所有权令牌</label>
                      <input
                        type="text"
                        className="textInput"
                        value={data.ownershipToken}
                        onChange={(e) => updateField('ownershipToken', e.target.value)}
                      />
                    </div>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>TXT 记录前缀</label>
                      <input
                        type="text"
                        className="textInput"
                        value={data.ownershipTxtPrefix}
                        onChange={(e) => updateField('ownershipTxtPrefix', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>隐身模式</h3>
            <div className={styles.toggleRow} style={{ gap: 'var(--space-4)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className={styles.toggleLabel}>启用隐身模式</span>
                <p className={styles.toggleDescription}>
                  强制整条流水线仅使用被动与低噪声技术。会禁用主动扫描器（Kiterunner、banner 抓取等），
                  端口扫描切换为被动模式；Nuclei 禁用 DAST 与 interactsh。AI Agent 仅使用隐蔽方法，
                  若某个请求动作无法在隐身约束下执行，将停止继续推进。
                </p>
              </div>
              <Toggle
                checked={data.stealthMode}
                onChange={(checked) => updateField('stealthMode', checked)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
