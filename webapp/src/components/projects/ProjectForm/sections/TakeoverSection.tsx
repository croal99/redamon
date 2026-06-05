'use client'

import { useState, type CSSProperties } from 'react'
import { ChevronDown, ShieldAlert, Play } from 'lucide-react'
import { Toggle } from '@/components/ui'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'
import { NodeInfoTooltip } from '../NodeInfoTooltip'
import { AiToggleLabel } from '../AiToggleLabel'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface TakeoverSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  onRun?: () => void
}

// Inline code-snippet style — keeps monospace snippets smaller than surrounding text
const codeStyle: CSSProperties = {
  fontSize: '0.85em',
  padding: '1px 4px',
  backgroundColor: 'rgba(255,255,255,0.06)',
  borderRadius: '3px',
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
}

// Must match recon/helpers/takeover_helpers.py::BADDNS_MODULES.
// Upstream ships 11 modules; only 10 are CLI-addressable (MTA-STS fails the
// baddns 2.1.0 validate_modules regex). Excluded here deliberately.
const BADDNS_MODULE_OPTIONS = [
  'cname',
  'ns',
  'mx',
  'txt',
  'spf',
  'dmarc',
  'wildcard',
  'nsec',
  'references',
  'zonetransfer',
] as const

const BADDNS_MODULE_DESCRIPTIONS: Record<string, string> = {
  cname: '悬空 CNAME 记录 + 潜在接管风险',
  ns: '悬空 NS 记录（过期 nameserver、云 DNS 委派残留）',
  mx: '悬空 MX 记录 + 根域可用性',
  txt: 'TXT 记录接管机会',
  spf: 'SPF include/redirect 链指向悬空域名',
  dmarc: 'DMARC 缺失或配置错误',
  wildcard: '通配符 DNS 导致大范围接管风险',
  nsec: '通过 NSEC-walking 进行子域名枚举（较慢）',
  references: 'HTML 引用指向可劫持域名',
  zonetransfer: 'DNS 区域传送尝试（AXFR，较慢）',
}

export function TakeoverSection({ data, updateField, onRun }: TakeoverSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  const toggleSeverity = (severity: string) => {
    const current = data.takeoverSeverity ?? []
    if (current.includes(severity)) {
      updateField('takeoverSeverity', current.filter(s => s !== severity))
    } else {
      updateField('takeoverSeverity', [...current, severity])
    }
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <ShieldAlert size={16} />
          子域名接管
          <NodeInfoTooltip section="SubdomainTakeover" />
          <span className={styles.badgeActive}>主动</span>
        </h2>
        <div className={styles.sectionHeaderRight}>
          {onRun && data.subdomainTakeoverEnabled && (
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
              title="运行子域名接管检测"
            >
              <Play size={10} /> 运行部分侦察
            </button>
          )}
          <div onClick={(e) => e.stopPropagation()}>
            <Toggle
              checked={data.subdomainTakeoverEnabled}
              onChange={(checked) => updateField('subdomainTakeoverEnabled', checked)}
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
            多层子域名接管检测：<strong>Subjack</strong>（DNS 优先、精度高）通过解析 CNAME/NS/MX 记录校验候选项；
            <strong>Nuclei 接管模板</strong>（<code style={codeStyle}>http/takeovers/</code> + <code style={codeStyle}>dns/</code>）
            为存活 URL 补充 HTTP 指纹覆盖。结果会跨工具去重、打分，并写入为 <code style={codeStyle}>Vulnerability</code> 节点，
            同时标记 <code style={codeStyle}>source=&quot;takeover_scan&quot;</code>。
          </p>

          {data.subdomainTakeoverEnabled && (
            <>
              {/* Scanner toggles */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>扫描器</label>

                <div className={styles.toggleRow}>
                  <div>
                    <div className={styles.toggleLabel}>Subjack (DNS-first)</div>
                    <div className={styles.toggleDescription}>
                      解析 CNAME 链并检查服务指纹。Apache-2.0 的 Go 二进制已内置到 recon 镜像中。
                    </div>
                  </div>
                  <Toggle
                    checked={data.subjackEnabled}
                    onChange={(checked) => updateField('subjackEnabled', checked)}
                  />
                </div>

                <div className={styles.toggleRow}>
                  <div>
                    <div className={styles.toggleLabel}>Nuclei 接管模板</div>
                    <div className={styles.toggleDescription}>
                      对 httpx 产出的存活 URL 执行 <code style={codeStyle}>-t http/takeovers/ -t dns/</code>。复用现有 Nuclei Docker 镜像。
                    </div>
                  </div>
                  <Toggle
                    checked={data.nucleiTakeoversEnabled}
                    onChange={(checked) => updateField('nucleiTakeoversEnabled', checked)}
                  />
                </div>

                <div className={styles.toggleRow}>
                  <div>
                    <div className={styles.toggleLabel}>BadDNS</div>
                    <div className={styles.toggleDescription}>
                      覆盖 CNAME / NS / MX / TXT / SPF / DMARC / wildcard / NSEC / zone-transfer 等模块的深度 DNS 分析。
                      运行在隔离的 Docker 镜像中（<code style={codeStyle}>redamon-baddns:latest</code>）。首次使用可通过
                      <code style={codeStyle}>docker compose --profile tools build baddns-scanner</code> 构建。
                    </div>
                  </div>
                  <Toggle
                    checked={data.baddnsEnabled}
                    onChange={(checked) => updateField('baddnsEnabled', checked)}
                  />
                </div>

                <div className={styles.toggleRow} style={{ alignItems: 'center' }}>
                  <AiToggleLabel
                    label='使用 AI 区分 WAF “No-Host” 页面'
                    tooltip={
                      'Subjack/Nuclei 的 body 指纹可能与 WAF 对“未知主机名”返回的拦截页发生碰撞。' +
                      '启用后，会对每个接管候选进行探测；若响应中不包含第三方厂商 token（Heroku-Request-Id、x-amz-bucket-region 等），' +
                      '则由 LLM 判定 body 是真实未认领服务页还是 WAF 拦截页。被 AI 判定为碰撞的候选会额外扣 40 分，进入 manual_review 而非 confirmed/likely。' +
                      (!data.aiInPipeline ? '要使用此功能，请先在 Target 页启用「流水线 AI」。' : '')
                    }
                  />
                  <Toggle
                    checked={data.takeoverAiClassifier}
                    disabled={!data.aiInPipeline}
                    onChange={(checked) => updateField('takeoverAiClassifier', checked)}
                  />
                </div>
              </div>

              {data.baddnsEnabled && (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>BadDNS 模块</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {BADDNS_MODULE_OPTIONS.map(mod => {
                      const active = (data.baddnsModules ?? []).includes(mod)
                      return (
                        <button
                          key={mod}
                          type="button"
                          onClick={() => {
                            const current = data.baddnsModules ?? []
                            updateField(
                              'baddnsModules',
                              active ? current.filter(m => m !== mod) : [...current, mod],
                            )
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            border: `1px solid ${active ? '#6366f1' : 'rgba(255,255,255,0.15)'}`,
                            backgroundColor: active ? 'rgba(99,102,241,0.15)' : 'transparent',
                            color: active ? '#a5b4fc' : '#a0aec0',
                            cursor: 'pointer',
                            fontSize: '12px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                          title={BADDNS_MODULE_DESCRIPTIONS[mod]}
                        >
                          {mod}
                        </button>
                      )
                    })}
                  </div>
                  <div className={styles.fieldHint}>
                    模块列表会传给 <code style={codeStyle}>baddns -m</code>。鼠标悬停可查看用途说明。
                    <code style={codeStyle}>nsec</code>、<code style={codeStyle}>zonetransfer</code> 等重模块在大型目标上可能较慢。
                  </div>
                </div>
              )}

              {/* Subjack extras */}
              {data.subjackEnabled && (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Subjack 检查项</label>

                  <div className={styles.toggleRow}>
                    <div>
                      <div className={styles.toggleLabel}>强制 HTTPS（-ssl）</div>
                      <div className={styles.toggleDescription}>使用 HTTPS 探测目标，可提升准确性。</div>
                    </div>
                    <Toggle checked={data.subjackSsl} onChange={(c) => updateField('subjackSsl', c)} />
                  </div>

                  <div className={styles.toggleRow}>
                    <div>
                      <div className={styles.toggleLabel}>测试所有 URL（-a）</div>
                      <div className={styles.toggleDescription}>探测没有明显 CNAME 的子域名。更慢但更全面。</div>
                    </div>
                    <Toggle checked={data.subjackAll} onChange={(c) => updateField('subjackAll', c)} />
                  </div>

                  <div className={styles.toggleRow}>
                    <div>
                      <div className={styles.toggleLabel}>检查 NS 接管（-ns）</div>
                      <div className={styles.toggleDescription}>检测过期的 nameserver 委派与悬空的云 DNS zone。</div>
                    </div>
                    <Toggle checked={data.subjackCheckNs} onChange={(c) => updateField('subjackCheckNs', c)} />
                  </div>

                  <div className={styles.toggleRow}>
                    <div>
                      <div className={styles.toggleLabel}>检查失效 A 记录（-ar）</div>
                      <div className={styles.toggleDescription}>标记指向失效云 IP 的 A 记录（可能存在 IP 复用风险，需人工验证）。</div>
                    </div>
                    <Toggle checked={data.subjackCheckAr} onChange={(c) => updateField('subjackCheckAr', c)} />
                  </div>

                  <div className={styles.toggleRow}>
                    <div>
                      <div className={styles.toggleLabel}>检查 SPF / MX 接管（-mail）</div>
                      <div className={styles.toggleDescription}>审计 SPF include 与 MX 记录，寻找引用失效基础设施的情况。</div>
                    </div>
                    <Toggle checked={data.subjackCheckMail} onChange={(c) => updateField('subjackCheckMail', c)} />
                  </div>
                </div>
              )}

              {/* Severity + scoring */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>严重性过滤（Nuclei 接管模板）</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {SEVERITY_OPTIONS.map(sev => {
                    const active = (data.takeoverSeverity ?? []).includes(sev)
                    return (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => toggleSeverity(sev)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          border: `1px solid ${active ? SEVERITY_COLORS[sev] : 'rgba(255,255,255,0.15)'}`,
                          backgroundColor: active ? SEVERITY_COLORS[sev] + '33' : 'transparent',
                          color: active ? SEVERITY_COLORS[sev] : '#a0aec0',
                          cursor: 'pointer',
                          fontSize: '12px',
                          textTransform: 'capitalize',
                        }}
                      >
                        {SEVERITY_LABELS[sev] ?? sev}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  置信度阈值（{data.takeoverConfidenceThreshold ?? 60}）
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={data.takeoverConfidenceThreshold ?? 60}
                  onChange={(e) =>
                    updateField('takeoverConfidenceThreshold', parseInt(e.target.value, 10) || 60)
                  }
                  style={{ width: '100%' }}
                />
                <div className={styles.fieldHint}>
                  分数达到或超过该阈值的结果标记为 <strong>confirmed</strong>；低 10 分标记为 <strong>likely</strong>；
                  更低则进入 <strong>manual_review</strong>。
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Nuclei 速率限制（req/s）</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.takeoverRateLimit ?? 50}
                    onChange={(e) => updateField('takeoverRateLimit', parseInt(e.target.value, 10) || 50)}
                    min={1}
                    max={500}
                  />
                  <span className={styles.fieldHint}>Nuclei 接管检测的速率上限。实际峰值可能会比设置值高约 15%（token-bucket）。</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Subjack 线程数</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.subjackThreads ?? 10}
                    onChange={(e) => updateField('subjackThreads', parseInt(e.target.value, 10) || 10)}
                    min={1}
                    max={100}
                  />
                  <span className={styles.fieldHint}>并行 DNS 探测线程。可安全提高 —— 不会给目标带来 HTTP 负载。</span>
                </div>
              </div>

              <div className={styles.toggleRow}>
                <div>
                  <div className={styles.toggleLabel}>自动发布 manual_review 结果</div>
                  <div className={styles.toggleDescription}>
                    将 <code style={codeStyle}>manual_review</code> 结果发布到主 Findings 表（默认：保留在单独的审核队列中，并标记 <code style={codeStyle}>severity=&quot;info&quot;</code>）。
                  </div>
                </div>
                <Toggle
                  checked={data.takeoverManualReviewAutoPublish}
                  onChange={(c) => updateField('takeoverManualReviewAutoPublish', c)}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
