'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronDown, Bot, Search, Loader2, AlertTriangle } from 'lucide-react'
import { Toggle } from '@/components/ui'
import { useProject } from '@/providers/ProjectProvider'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'
import { type ModelOption, formatContextLength, getDisplayName } from '@/app/graph/components/AIAssistantDrawer/modelUtils'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface AgentBehaviourSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
}

export function AgentBehaviourSection({ data, updateField }: AgentBehaviourSectionProps) {
  const [isOpen, setIsOpen] = useState(true)
  const { userId } = useProject()

  // Model selector state
  const [allModels, setAllModels] = useState<Record<string, ModelOption[]>>({})
  const [modelsLoading, setModelsLoading] = useState(true)
  const [modelsError, setModelsError] = useState(false)
  const [search, setSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)


  // Fetch models on mount (pass userId for user-specific providers)
  useEffect(() => {
    const params = userId ? `?userId=${userId}` : ''
    fetch(`/api/models${params}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch')
        return r.json()
      })
      .then(data => {
        if (data && typeof data === 'object' && !data.error) {
          setAllModels(data)
        } else {
          setModelsError(true)
        }
      })
      .catch(() => setModelsError(true))
      .finally(() => setModelsLoading(false))
  }, [userId])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectModel = useCallback((id: string) => {
    updateField('agentOpenaiModel', id)
    setDropdownOpen(false)
    setSearch('')
  }, [updateField])

  // Filter models by search
  const filteredModels: Record<string, ModelOption[]> = {}
  const lowerSearch = search.toLowerCase()
  for (const [provider, models] of Object.entries(allModels)) {
    const filtered = models.filter(m =>
      m.id.toLowerCase().includes(lowerSearch) ||
      m.name.toLowerCase().includes(lowerSearch) ||
      m.description.toLowerCase().includes(lowerSearch)
    )
    if (filtered.length > 0) filteredModels[provider] = filtered
  }

  const totalFiltered = Object.values(filteredModels).reduce((sum, arr) => sum + arr.length, 0)

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Bot size={16} />
          代理行为（Agent Behaviour）
        </h2>
        <ChevronDown
          size={16}
          className={`${styles.sectionIcon} ${isOpen ? styles.sectionIconOpen : ''}`}
        />
      </div>

      {isOpen && (
        <div className={styles.sectionContent}>
          <p className={styles.sectionDescription}>
            配置执行自动化渗透测试的 AI 代理编排器：控制 LLM 模型、阶段切换、payload 设置与安全闸门。各阶段的工具权限在“工具矩阵（Tool Matrix）”中配置。
          </p>

          {/* LLM & Phase Configuration */}
          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>LLM 与阶段配置</h3>
            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>LLM 模型</label>
                <div className={styles.modelSelector} ref={dropdownRef}>
                  <div
                    className={`${styles.modelSelectorInput} ${dropdownOpen ? styles.modelSelectorInputFocused : ''}`}
                    onClick={() => {
                      setDropdownOpen(true)
                      setTimeout(() => inputRef.current?.focus(), 0)
                    }}
                  >
                    {dropdownOpen ? (
                      <input
                        ref={inputRef}
                        className={styles.modelSearchInput}
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="搜索模型..."
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setDropdownOpen(false)
                            setSearch('')
                          }
                        }}
                      />
                    ) : (
                      <span className={styles.modelSelectedText}>
                        {modelsLoading ? '正在加载模型...' : getDisplayName(data.agentOpenaiModel, allModels)}
                      </span>
                    )}
                    {modelsLoading ? (
                      <Loader2 size={12} className={styles.modelSelectorSpinner} />
                    ) : (
                      <Search size={12} className={styles.modelSelectorIcon} />
                    )}
                  </div>

                  {dropdownOpen && (
                    <div className={styles.modelDropdown}>
                      {modelsError ? (
                        <div className={styles.modelDropdownEmpty}>
                          <span>模型加载失败。可手动输入模型 ID：</span>
                          <input
                            className="textInput"
                            type="text"
                            value={data.agentOpenaiModel}
                            onChange={(e) => updateField('agentOpenaiModel', e.target.value)}
                            placeholder="e.g. claude-opus-4-6, gpt-5.2, openrouter/meta-llama/llama-4-maverick, openai_compat/llama3.1"
                            style={{ marginTop: 'var(--space-1)' }}
                          />
                        </div>
                      ) : Object.keys(filteredModels).length === 0 ? (
                        <div className={styles.modelDropdownEmpty}>
                          {search ? `没有匹配 "${search}" 的模型` : '未配置任何提供方'}
                        </div>
                      ) : (
                        Object.entries(filteredModels).map(([provider, models]) => (
                          <div key={provider} className={styles.modelGroup}>
                            <div className={styles.modelGroupHeader}>{provider}</div>
                            {models.map(model => (
                              <div
                                key={model.id}
                                className={`${styles.modelOption} ${model.id === data.agentOpenaiModel ? styles.modelOptionSelected : ''}`}
                                onClick={() => selectModel(model.id)}
                              >
                                <div className={styles.modelOptionMain}>
                                  <span className={styles.modelOptionName}>{model.name}</span>
                                  {model.context_length && (
                                    <span className={styles.modelOptionCtx}>{formatContextLength(model.context_length)}</span>
                                  )}
                                </div>
                                {model.description && (
                                  <span className={styles.modelOptionDesc}>{model.description}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <span className={styles.fieldHint}>
                  代理使用的模型。在“全局设置”中配置模型提供方。
                </span>
              </div>
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>启用后渗透阶段</span>
                <p className={styles.toggleDescription}>成功利用后进入后渗透阶段。关闭后代理会在利用阶段结束后停止。</p>
              </div>
              <Toggle
                checked={data.agentActivatePostExplPhase}
                onChange={(checked) => updateField('agentActivatePostExplPhase', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>深度思考</span>
                <p className={styles.toggleDescription}>
                  启用后，代理会在关键决策点（会话开始、阶段切换、失败循环）进行显式深度推理，
                  先规划多步攻击策略再行动。此类时刻会额外增加约 1 次 LLM 调用。
                  推荐用于服务较多、结构复杂的目标。
                </p>
              </div>
              <Toggle
                checked={data.agentDeepThinkEnabled}
                onChange={(checked) => updateField('agentDeepThinkEnabled', checked)}
              />
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>后渗透类型</label>
                <select
                  className="select"
                  value={data.agentPostExplPhaseType}
                  onChange={(e) => updateField('agentPostExplPhaseType', e.target.value)}
                >
                  <option value="statefull">有状态（Stateful）</option>
                  <option value="stateless">无状态（Stateless）</option>
                </select>
                <span className={styles.fieldHint}>有状态模式会在多轮交互间保留 Meterpreter/shell 会话</span>
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>信息收集阶段系统提示词</label>
              <textarea
                className="textInput"
                value={data.agentInformationalSystemPrompt}
                onChange={(e) => updateField('agentInformationalSystemPrompt', e.target.value)}
                placeholder="信息收集/侦察阶段的自定义系统提示词..."
                rows={2}
              />
              <span className={styles.fieldHint}>仅在信息收集阶段注入。留空则使用默认提示词。</span>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>利用阶段系统提示词</label>
              <textarea
                className="textInput"
                value={data.agentExplSystemPrompt}
                onChange={(e) => updateField('agentExplSystemPrompt', e.target.value)}
                placeholder="利用阶段的自定义系统提示词..."
                rows={2}
              />
              <span className={styles.fieldHint}>仅在利用阶段注入。留空则使用默认提示词。</span>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>后渗透阶段系统提示词</label>
              <textarea
                className="textInput"
                value={data.agentPostExplSystemPrompt}
                onChange={(e) => updateField('agentPostExplSystemPrompt', e.target.value)}
                placeholder="后渗透阶段的自定义系统提示词..."
                rows={2}
              />
              <span className={styles.fieldHint}>仅在后渗透阶段注入。留空则使用默认提示词。</span>
            </div>
          </div>

          {/* Payload Direction */}
          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>Payload 方向</h3>
            <p className={styles.toggleDescription} style={{ marginBottom: 'var(--space-2)' }}>
              <strong>Reverse</strong>：目标回连你（LHOST + LPORT）。<strong>Bind</strong>：你连接目标（LPORT 留空）。
            </p>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>隧道方案</label>
              <select
                className="textInput"
                value={data.agentNgrokTunnelEnabled ? 'ngrok' : data.agentChiselTunnelEnabled ? 'chisel' : 'none'}
                onChange={(e) => {
                  const val = e.target.value;
                  updateField('agentNgrokTunnelEnabled', val === 'ngrok');
                  updateField('agentChiselTunnelEnabled', val === 'chisel');
                }}
              >
                <option value="none">不使用（手动配置 LHOST/LPORT）</option>
                <option value="ngrok">ngrok（单端口——免费，无需 VPS）</option>
                <option value="chisel">chisel（多端口——需要 VPS）</option>
              </select>
              <span className={styles.fieldHint}>
                {data.agentNgrokTunnelEnabled && '在“全局设置 → Tunneling”中配置 ngrok auth token。仅转发 4444 端口（handler）。需要 stageless payload，不支持 Web delivery / HTA。'}
                {data.agentChiselTunnelEnabled && '在“全局设置 → Tunneling”中配置 chisel 服务器 URL。需要你的 VPS 上运行 chisel server。转发 4444（handler）+ 8080（web delivery）。需要 stageless payload。'}
                {!data.agentNgrokTunnelEnabled && !data.agentChiselTunnelEnabled && '不使用隧道——请在下方手动配置 LHOST/LPORT。'}
              </span>
            </div>
            {(data.agentNgrokTunnelEnabled || data.agentChiselTunnelEnabled) ? (
              <p className={styles.toggleDescription} style={{ marginTop: 'var(--space-2)', padding: 'var(--space-2)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-1)' }}>
                {data.agentNgrokTunnelEnabled && 'LHOST 与 LPORT 将从 ngrok 隧道自动识别，无需手动配置。'}
                {data.agentChiselTunnelEnabled && 'LHOST 会从 VPS 主机名推导，同时转发 handler（4444）与 web delivery（8080）端口，无需手动配置。'}
              </p>
            ) : (
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>LHOST（攻击机 IP）</label>
                  <input
                    type="text"
                    className="textInput"
                    value={data.agentLhost}
                    onChange={(e) => updateField('agentLhost', e.target.value)}
                    placeholder="e.g. 172.28.0.2"
                  />
                  <span className={styles.fieldHint}>Bind 模式下留空</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>LPORT</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.agentLport || ''}
                    onChange={(e) => updateField('agentLport', e.target.value === '' ? null : parseInt(e.target.value))}
                    min={1}
                    max={65535}
                    placeholder="Empty = bind mode"
                  />
                  <span className={styles.fieldHint}>Bind 模式下留空</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>目标侧绑定端口</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.agentBindPortOnTarget || ''}
                    onChange={(e) => updateField('agentBindPortOnTarget', e.target.value === '' ? null : parseInt(e.target.value))}
                    min={1}
                    max={65535}
                    placeholder="Empty = ask agent"
                  />
                  <span className={styles.fieldHint}>不确定可留空（代理会询问）</span>
                </div>
              </div>
            )}
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>Payload 使用 HTTPS</span>
                <p className={styles.toggleDescription}>使用 reverse_https 替代 reverse_tcp，仅适用于 reverse payload。</p>
              </div>
              <Toggle
                checked={data.agentPayloadUseHttps}
                onChange={(checked) => updateField('agentPayloadUseHttps', checked)}
              />
            </div>
          </div>

          {/* Agent Limits */}
          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>代理限制</h3>
            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>最大迭代次数</label>
                <input
                  type="number"
                  className="textInput"
                  value={data.agentMaxIterations}
                  onChange={(e) => updateField('agentMaxIterations', parseInt(e.target.value) || 100)}
                  min={1}
                />
                <span className={styles.fieldHint}>LLM 推理迭代次数上限</span>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>追踪记忆步数</label>
                <input
                  type="number"
                  className="textInput"
                  value={data.agentExecutionTraceMemorySteps}
                  onChange={(e) => updateField('agentExecutionTraceMemorySteps', parseInt(e.target.value) || 100)}
                  min={1}
                />
                <span className={styles.fieldHint}>上下文中保留的历史步骤数</span>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>工具输出最大字符数</label>
                <input
                  type="number"
                  className="textInput"
                  value={data.agentToolOutputMaxChars}
                  onChange={(e) => updateField('agentToolOutputMaxChars', parseInt(e.target.value) || 20000)}
                  min={1000}
                />
                <span className={styles.fieldHint}>工具输出截断上限</span>
              </div>
            </div>
          </div>

          {/* Approval Gates */}
          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>确认闸门</h3>

            {(!data.agentRequireApprovalForExploitation || !data.agentRequireApprovalForPostExploitation || !(data.agentGuardrailEnabled ?? true) || !(data.agentRequireToolConfirmation ?? true)) && (
              <div className={styles.shodanWarning} style={{ borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.08)' }}>
                <AlertTriangle size={14} style={{ color: '#ef4444' }} />
                <span>
                  <strong>自动化运行风险：</strong>一个或多个安全闸门已关闭。
                  AI 代理可能在无人确认的情况下执行利用/后渗透/高风险工具，或发生越权（超范围）行为。
                  这会显著增加对目标系统造成意外损害的风险。
                  你需要为所有代理的自动化行为承担全部责任。
                  详情请阅读 <a href="https://github.com/samugit83/redamon/blob/master/DISCLAIMER.md" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>DISCLAIMER.md</a>。
                </span>
              </div>
            )}

            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>利用前需确认</span>
                <p className={styles.toggleDescription}>进入利用阶段前需要用户确认。</p>
              </div>
              <Toggle
                checked={data.agentRequireApprovalForExploitation}
                onChange={(checked) => updateField('agentRequireApprovalForExploitation', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>后渗透前需确认</span>
                <p className={styles.toggleDescription}>进入后渗透阶段前需要用户确认。</p>
              </div>
              <Toggle
                checked={data.agentRequireApprovalForPostExploitation}
                onChange={(checked) => updateField('agentRequireApprovalForPostExploitation', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>工具执行需确认</span>
                <p className={styles.toggleDescription}>
                  执行高风险工具前需要手动确认
                  （nmap、nuclei、metasploit、hydra、kali shell 等）。
                </p>
              </div>
              <Toggle
                checked={data.agentRequireToolConfirmation ?? true}
                onChange={(checked) => updateField('agentRequireToolConfirmation', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>代理防护规则（Guardrail）</span>
                <p className={styles.toggleDescription}>
                  在会话开始时校验目标授权，并在代理提示词中强制执行范围限制。
                  阻止代理对知名公共目标操作，并避免越权（超范围）行为。
                  政府/军队/教育/国际组织域名（.gov/.mil/.edu/.int）无论该开关如何设置都会被永久拦截。
                </p>
              </div>
              <Toggle
                checked={data.agentGuardrailEnabled ?? true}
                onChange={(checked) => updateField('agentGuardrailEnabled', checked)}
              />
            </div>
          </div>

          {/* Kali Shell — Library Installation */}
          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>Kali Shell — 安装依赖</h3>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>允许安装依赖</span>
                <p className={styles.toggleDescription}>允许代理在渗透测试期间通过 kali_shell 安装 pip/apt 包。已安装依赖为临时数据——容器重启后会丢失。</p>
              </div>
              <Toggle
                checked={data.agentKaliInstallEnabled}
                onChange={(checked) => updateField('agentKaliInstallEnabled', checked)}
              />
            </div>
            {data.agentKaliInstallEnabled && (
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>允许安装的包</label>
                  <textarea
                    className="textInput"
                    value={data.agentKaliInstallAllowedPackages}
                    onChange={(e) => updateField('agentKaliInstallAllowedPackages', e.target.value)}
                    rows={2}
                    placeholder="e.g. pyftpdlib, scapy, droopescan"
                  />
                  <span className={styles.fieldHint}>逗号分隔白名单。若不为空，则只允许安装这些包。</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>禁止安装的包</label>
                  <textarea
                    className="textInput"
                    value={data.agentKaliInstallForbiddenPackages}
                    onChange={(e) => updateField('agentKaliInstallForbiddenPackages', e.target.value)}
                    rows={2}
                    placeholder="e.g. metasploit-framework, cobalt-strike"
                  />
                  <span className={styles.fieldHint}>逗号分隔黑名单。这些包绝对不允许被安装。</span>
                </div>
              </div>
            )}
          </div>

          {/* Retries, Logging & Debug */}
          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>重试、日志与调试</h3>
            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Cypher 最大重试次数</label>
                <input
                  type="number"
                  className="textInput"
                  value={data.agentCypherMaxRetries}
                  onChange={(e) => updateField('agentCypherMaxRetries', parseInt(e.target.value) || 3)}
                  min={0}
                  max={10}
                />
                <span className={styles.fieldHint}>Neo4j 查询重试次数</span>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>日志最大 MB</label>
                <input
                  type="number"
                  className="textInput"
                  value={data.agentLogMaxMb}
                  onChange={(e) => updateField('agentLogMaxMb', parseInt(e.target.value) || 10)}
                  min={1}
                />
                <span className={styles.fieldHint}>日志文件最大大小</span>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>日志备份数</label>
                <input
                  type="number"
                  className="textInput"
                  value={data.agentLogBackupCount}
                  onChange={(e) => updateField('agentLogBackupCount', parseInt(e.target.value) || 5)}
                  min={0}
                />
                <span className={styles.fieldHint}>保留的轮转备份数量</span>
              </div>
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>启动时生成图谱图片</span>
                <p className={styles.toggleDescription}>代理启动时生成 LangGraph 可视化图片，便于调试。</p>
              </div>
              <Toggle
                checked={data.agentCreateGraphImageOnInit}
                onChange={(checked) => updateField('agentCreateGraphImageOnInit', checked)}
              />
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
