'use client'

import { useState } from 'react'
import { ChevronDown, Bot, AlertTriangle } from 'lucide-react'
import { Toggle } from '@/components/ui'
import { useProject } from '@/providers/ProjectProvider'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'
import { ModelPicker } from '@/components/shared/ModelPicker'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface AgentBehaviourSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
}

export function AgentBehaviourSection({ data, updateField }: AgentBehaviourSectionProps) {
  const [isOpen, setIsOpen] = useState(true)
  const { userId } = useProject()

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Bot size={16} />
          Agent 行为
        </h2>
        <ChevronDown
          size={16}
          className={`${styles.sectionIcon} ${isOpen ? styles.sectionIconOpen : ''}`}
        />
      </div>

      {isOpen && (
        <div className={styles.sectionContent}>
          <p className={styles.sectionDescription}>
            配置用于执行自主渗透测试的 AI 智能体编排器。可控制 LLM 模型、阶段切换、Payload 设置与安全闸门。各阶段的工具权限请在“工具矩阵”标签页中配置。
          </p>

          {/* LLM & Phase Configuration */}
          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>LLM 与阶段配置</h3>
            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>LLM 模型</label>
                <ModelPicker
                  userId={userId}
                  value={data.agentOpenaiModel}
                  onChange={(id) => updateField('agentOpenaiModel', id)}
                />
                <span className={styles.fieldHint}>
                  智能体使用的模型。请在“全局设置”中配置模型供应商。
                </span>
              </div>
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>启用后渗透阶段</span>
                <p className={styles.toggleDescription}>利用成功后启用后渗透。关闭时，智能体在利用阶段结束后停止。</p>
              </div>
              <Toggle
                checked={data.agentActivatePostExplPhase}
                onChange={(checked) => updateField('agentActivatePostExplPhase', checked)}
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
                <span className={styles.fieldHint}>有状态会在多轮对话之间保留 Meterpreter/shell 会话</span>
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>信息收集阶段系统提示词</label>
              <textarea
                className="textInput"
                value={data.agentInformationalSystemPrompt}
                onChange={(e) => updateField('agentInformationalSystemPrompt', e.target.value)}
                placeholder="为信息收集/侦察阶段自定义系统提示词…"
                rows={2}
              />
              <span className={styles.fieldHint}>在信息收集阶段注入。留空则使用默认值。</span>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>利用阶段系统提示词</label>
              <textarea
                className="textInput"
                value={data.agentExplSystemPrompt}
                onChange={(e) => updateField('agentExplSystemPrompt', e.target.value)}
                placeholder="为利用阶段自定义系统提示词…"
                rows={2}
              />
              <span className={styles.fieldHint}>在利用阶段注入。留空则使用默认值。</span>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>后渗透阶段系统提示词</label>
              <textarea
                className="textInput"
                value={data.agentPostExplSystemPrompt}
                onChange={(e) => updateField('agentPostExplSystemPrompt', e.target.value)}
                placeholder="为后渗透阶段自定义系统提示词…"
                rows={2}
              />
              <span className={styles.fieldHint}>在后渗透阶段注入。留空则使用默认值。</span>
            </div>
          </div>

          {/* Payload Direction */}
          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>Payload 方向</h3>
            <p className={styles.toggleDescription} style={{ marginBottom: 'var(--space-2)' }}>
              <strong>Reverse</strong>：目标回连你（LHOST + LPORT）。<strong>Bind</strong>：你连接目标（LPORT 留空）。
            </p>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>隧道提供方</label>
              <select
                className="textInput"
                value={data.agentNgrokTunnelEnabled ? 'ngrok' : data.agentChiselTunnelEnabled ? 'chisel' : 'none'}
                onChange={(e) => {
                  const val = e.target.value;
                  updateField('agentNgrokTunnelEnabled', val === 'ngrok');
                  updateField('agentChiselTunnelEnabled', val === 'chisel');
                }}
              >
                <option value="none">无（手动配置 LHOST/LPORT）</option>
                <option value="ngrok">ngrok（单端口 — 免费，无需 VPS）</option>
                <option value="chisel">chisel（多端口 — 需要 VPS）</option>
              </select>
              <span className={styles.fieldHint}>
                {data.agentNgrokTunnelEnabled && '在“全局设置 → 隧道”中配置 ngrok 认证 token。仅隧道 4444 端口（handler）。需要 stageless payload。不支持 Web delivery / HTA。'}
                {data.agentChiselTunnelEnabled && '在“全局设置 → 隧道”中配置 chisel 服务器 URL。需要你的 VPS 上运行 chisel server。隧道端口 4444（handler）+ 8080（web delivery）。需要 stageless payload。'}
                {!data.agentNgrokTunnelEnabled && !data.agentChiselTunnelEnabled && '未启用隧道——请在下方手动配置 LHOST/LPORT。'}
              </span>
            </div>
            {(data.agentNgrokTunnelEnabled || data.agentChiselTunnelEnabled) ? (
              <p className={styles.toggleDescription} style={{ marginTop: 'var(--space-2)', padding: 'var(--space-2)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-1)' }}>
                {data.agentNgrokTunnelEnabled && 'LHOST 与 LPORT 将从 ngrok 隧道自动检测，无需手动配置。'}
                {data.agentChiselTunnelEnabled && 'LHOST 由 VPS 主机名推导。handler（4444）与 web delivery（8080）端口都会被隧道转发，无需手动配置。'}
              </p>
            ) : (
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>LHOST（攻击者 IP）</label>
                  <input
                    type="text"
                    className="textInput"
                    value={data.agentLhost}
                    onChange={(e) => updateField('agentLhost', e.target.value)}
                    placeholder="例如 172.28.0.2"
                  />
                  <span className={styles.fieldHint}>Bind 模式请留空</span>
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
                    placeholder="留空 = Bind 模式"
                  />
                  <span className={styles.fieldHint}>Bind 模式请留空</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>目标机上的绑定端口</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.agentBindPortOnTarget || ''}
                    onChange={(e) => updateField('agentBindPortOnTarget', e.target.value === '' ? null : parseInt(e.target.value))}
                    min={1}
                    max={65535}
                    placeholder="留空 = 让智能体询问"
                  />
                  <span className={styles.fieldHint}>不确定就留空（智能体会询问）</span>
                </div>
              </div>
            )}
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>Payload 使用 HTTPS</span>
                <p className={styles.toggleDescription}>使用 reverse_https 替代 reverse_tcp。仅适用于 Reverse payload。</p>
              </div>
              <Toggle
                checked={data.agentPayloadUseHttps}
                onChange={(checked) => updateField('agentPayloadUseHttps', checked)}
              />
            </div>
          </div>

          {/* Fireteam (multi-agent) */}
          {(() => {
            const fireteamEnabled = (data as any).fireteamEnabled ?? true
            const maxConcurrent = (data as any).fireteamMaxConcurrent ?? 5
            const maxMembers = (data as any).fireteamMaxMembers ?? 5
            const memberMaxIter = (data as any).fireteamMemberMaxIterations ?? 10
            const timeoutSec = (data as any).fireteamTimeoutSec ?? 3600
            const propensity = (data as any).fireteamPropensity ?? 3
            const allowedPhasesRaw = (data as any).fireteamAllowedPhases ?? ['informational', 'exploitation', 'post_exploitation']
            const allowedPhases: string[] = Array.isArray(allowedPhasesRaw)
              ? allowedPhasesRaw
              : String(allowedPhasesRaw || '').split(',').map(s => s.trim()).filter(Boolean)
            const phaseLabel: Record<string, string> = {
              informational: '信息收集',
              exploitation: '利用',
              post_exploitation: '后渗透',
            }
            const togglePhase = (phase: string) => {
              const next = allowedPhases.includes(phase)
                ? allowedPhases.filter(p => p !== phase)
                : [...allowedPhases, phase]
              if (next.length === 0) return // at least one phase required
              updateField('fireteamAllowedPhases' as any, next as any)
            }
            const crossError =
              fireteamEnabled && maxConcurrent > maxMembers
                ? '最大并发数不能超过最大成员数'
                : null
            return (
              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>Fireteam（多智能体）</h3>
                <div className={styles.fieldHint} style={{ marginBottom: 8 }}>
                  开启后，智能体可并行部署最多 N 个专家子智能体，在独立攻击面上同时工作。
                  父智能体负责安全审批与阶段切换。
                </div>
                <div className={styles.toggleRow}>
                  <Toggle
                    checked={fireteamEnabled}
                    onChange={(v) => updateField('fireteamEnabled' as any, v as any)}
                    labelOn="Fireteam 已启用"
                    labelOff="Fireteam 已禁用"
                  />
                </div>
                {fireteamEnabled && (
                  <>
                    <div className={styles.fieldRow}>
                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>最大并发成员数</label>
                        <input
                          type="number"
                          className="textInput"
                          value={maxConcurrent}
                          min={1}
                          max={8}
                          onChange={(e) => {
                            // Pass raw value (string or NaN) through during typing.
                            // Clamping on every keystroke makes it impossible to enter
                            // multi-digit numbers — e.g. typing `15` clamps `1` to `2`
                            // before the user can finish.
                            const raw = e.target.value
                            updateField('fireteamMaxConcurrent' as any, (raw === '' ? '' : parseInt(raw)) as any)
                          }}
                          onBlur={(e) => {
                            const n = parseInt(e.target.value)
                            const v = Number.isFinite(n) ? Math.max(1, Math.min(8, n)) : 5
                            updateField('fireteamMaxConcurrent' as any, v as any)
                          }}
                        />
                        <span className={styles.fieldHint}>1-8。单次并行在途成员上限。</span>
                      </div>
                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>Fireteam 最大成员数</label>
                        <input
                          type="number"
                          className="textInput"
                          value={maxMembers}
                          min={2}
                          max={8}
                          onChange={(e) => {
                            const raw = e.target.value
                            updateField('fireteamMaxMembers' as any, (raw === '' ? '' : parseInt(raw)) as any)
                          }}
                          onBlur={(e) => {
                            const n = parseInt(e.target.value)
                            const v = Number.isFinite(n) ? Math.max(2, Math.min(8, n)) : 5
                            updateField('fireteamMaxMembers' as any, v as any)
                          }}
                        />
                        <span className={styles.fieldHint}>2-8。LLM 可请求的 Fireteam 规模硬上限。</span>
                      </div>
                    </div>
                    <div className={styles.fieldRow}>
                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>单成员最大迭代次数</label>
                        <input
                          type="number"
                          className="textInput"
                          value={memberMaxIter}
                          min={5}
                          max={50}
                          onChange={(e) => {
                            const raw = e.target.value
                            updateField('fireteamMemberMaxIterations' as any, (raw === '' ? '' : parseInt(raw)) as any)
                          }}
                          onBlur={(e) => {
                            const n = parseInt(e.target.value)
                            const v = Number.isFinite(n) ? Math.max(5, Math.min(50, n)) : 10
                            updateField('fireteamMemberMaxIterations' as any, v as any)
                          }}
                        />
                        <span className={styles.fieldHint}>5-50。每个成员在退出前的 ReAct 预算。</span>
                      </div>
                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>批处理超时（秒）</label>
                        <input
                          type="number"
                          className="textInput"
                          value={timeoutSec}
                          min={60}
                          max={7200}
                          onChange={(e) => {
                            const raw = e.target.value
                            updateField('fireteamTimeoutSec' as any, (raw === '' ? '' : parseInt(raw)) as any)
                          }}
                          onBlur={(e) => {
                            const n = parseInt(e.target.value)
                            const v = Number.isFinite(n) ? Math.max(60, Math.min(7200, n)) : 1800
                            updateField('fireteamTimeoutSec' as any, v as any)
                          }}
                        />
                        <span className={styles.fieldHint}>60-7200。整个 Fireteam 的墙钟时间硬上限。</span>
                      </div>
                    </div>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>允许的阶段</label>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {(['informational', 'exploitation', 'post_exploitation'] as const).map(p => (
                          <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <input
                              type="checkbox"
                              checked={allowedPhases.includes(p)}
                              onChange={() => togglePhase(p)}
                            />
                            <span style={{ fontSize: '0.85rem' }}>{phaseLabel[p] ?? p} ({p})</span>
                          </label>
                        ))}
                      </div>
                      <span className={styles.fieldHint}>
                        智能体可在这些阶段部署 Fireteam。侦察/信息收集较安全；利用/后渗透更深入，通常应串行。
                      </span>
                    </div>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>
                        Fireteam 倾向：<strong>{propensity}/5</strong>
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={5}
                        step={1}
                        value={propensity}
                        onChange={(e) => {
                          const v = Math.max(1, Math.min(5, parseInt(e.target.value) || 3))
                          updateField('fireteamPropensity' as any, v as any)
                        }}
                        style={{ width: '100%' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted, #888)', marginTop: 2 }}>
                        <span>1 - 仅在非常复杂的任务时</span>
                        <span>3 - 均衡（默认）</span>
                        <span>5 - 更积极部署</span>
                      </div>
                      <span className={styles.fieldHint}>
                        智能体相对于单智能体或 plan_tools 更倾向部署 Fireteam 的程度。会作为指令注入到系统提示词中，LLM 必须遵循。
                      </span>
                    </div>
                    {crossError && (
                      <div className={styles.shodanWarning} style={{ borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.08)' }}>
                        <AlertTriangle size={14} style={{ color: '#ef4444' }} />
                        <span>{crossError}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })()}

          {/* Agent Limits */}
          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>智能体限制</h3>
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
                <span className={styles.fieldHint}>LLM 推理迭代上限</span>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>轨迹记忆步数</label>
                <input
                  type="number"
                  className="textInput"
                  value={data.agentExecutionTraceMemorySteps}
                  onChange={(e) => updateField('agentExecutionTraceMemorySteps', parseInt(e.target.value) || 100)}
                  min={1}
                />
                <span className={styles.fieldHint}>保留在上下文中的历史步骤数</span>
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
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>计划最大并行工具数</label>
                <input
                  type="number"
                  className="textInput"
                  value={data.agentPlanMaxParallelTools ?? 10}
                  onChange={(e) => updateField('agentPlanMaxParallelTools', parseInt(e.target.value) || 10)}
                  min={1}
                  max={50}
                />
                <span className={styles.fieldHint}>每个批次可并行的工具数，超出的会排队</span>
              </div>
            </div>
          </div>

          {/* Approval Gates */}
          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>审批闸门</h3>

            {(!data.agentRequireApprovalForExploitation || !data.agentRequireApprovalForPostExploitation || !(data.agentGuardrailEnabled ?? true) || !(data.agentRequireToolConfirmation ?? true)) && (
              <div className={styles.shodanWarning} style={{ borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.08)' }}>
                <AlertTriangle size={14} style={{ color: '#ef4444' }} />
                <span>
                  <strong>自主运行风险：</strong>一个或多个安全闸门已关闭。
                  AI 智能体可能在未获人工批准的情况下执行利用、后渗透、危险工具或越界操作。
                  这会显著增加对目标系统造成非预期影响的风险。
               </span>
              </div>
            )}

            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>利用阶段需要审批</span>
                <p className={styles.toggleDescription}>进入利用阶段前需要用户确认。</p>
              </div>
              <Toggle
                checked={data.agentRequireApprovalForExploitation}
                onChange={(checked) => updateField('agentRequireApprovalForExploitation', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>后渗透阶段需要审批</span>
                <p className={styles.toggleDescription}>进入后渗透阶段前需要用户确认。</p>
              </div>
              <Toggle
                checked={data.agentRequireApprovalForPostExploitation}
                onChange={(checked) => updateField('agentRequireApprovalForPostExploitation', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>工具执行需要确认</span>
                <p className={styles.toggleDescription}>
                  执行危险工具前需要人工确认（nmap、nuclei、metasploit、hydra、kali shell 等）。
                </p>
              </div>
              <Toggle
                checked={data.agentRequireToolConfirmation ?? true}
                onChange={(checked) => updateField('agentRequireToolConfirmation', checked)}
              />
            </div>
          </div>

          {/* Kali Shell — Library Installation */}
          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>Kali Shell — 依赖安装</h3>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>允许安装依赖</span>
                <p className={styles.toggleDescription}>允许智能体在渗透测试过程中在 kali_shell 中安装包（pip/apt）。已安装的包为临时的——容器重启后会丢失。</p>
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
                    placeholder="例如 pyftpdlib, scapy, droopescan"
                  />
                  <span className={styles.fieldHint}>逗号分隔白名单。非空时，仅允许安装这些包。</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>禁止安装的包</label>
                  <textarea
                    className="textInput"
                    value={data.agentKaliInstallForbiddenPackages}
                    onChange={(e) => updateField('agentKaliInstallForbiddenPackages', e.target.value)}
                    rows={2}
                    placeholder="例如 metasploit-framework, cobalt-strike"
                  />
                  <span className={styles.fieldHint}>逗号分隔黑名单。这些包绝不能被安装。</span>
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
                <span className={styles.fieldHint}>单个日志文件最大大小</span>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>日志备份数量</label>
                <input
                  type="number"
                  className="textInput"
                  value={data.agentLogBackupCount}
                  onChange={(e) => updateField('agentLogBackupCount', parseInt(e.target.value) || 5)}
                  min={0}
                />
                <span className={styles.fieldHint}>保留的轮转备份数</span>
              </div>
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>启动时生成图像</span>
                <p className={styles.toggleDescription}>智能体启动时生成 LangGraph 可视化图像，便于调试。</p>
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
