'use client'

import { useState, type CSSProperties } from 'react'
import { ChevronDown, Network, Play } from 'lucide-react'
import { Toggle, WikiInfoButton } from '@/components/ui'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'
import { NodeInfoTooltip } from '../NodeInfoTooltip'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface VhostSniSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  onRun?: () => void
}

const codeStyle: CSSProperties = {
  fontSize: '0.85em',
  padding: '1px 4px',
  backgroundColor: 'rgba(255,255,255,0.06)',
  borderRadius: '3px',
}

export function VhostSniSection({ data, updateField, onRun }: VhostSniSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  const customWordlistLines = (data.vhostSniCustomWordlist || '')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#')).length

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Network size={16} />
          VHost 与 SNI 枚举
          <NodeInfoTooltip section="VhostSni" />
          <WikiInfoButton target="VhostSni" />
          <span className={styles.badgeActive}>主动</span>
        </h2>
        <div className={styles.sectionHeaderRight}>
          {onRun && data.vhostSniEnabled && (
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
              title="运行 VHost 与 SNI 枚举"
            >
              <Play size={10} /> 运行部分侦察
            </button>
          )}
          <div onClick={(e) => e.stopPropagation()}>
            <Toggle
              checked={data.vhostSniEnabled}
              onChange={(checked) => updateField('vhostSniEnabled', checked)}
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
            通过对每个候选 hostname 发送两种构造的 curl 请求，在每个目标 IP 上发现<strong>隐藏虚拟主机</strong>：
            <strong>L7 测试</strong>（覆盖 HTTP <code style={codeStyle}>Host:</code> 头）与 <strong>L4 测试</strong>（通过 <code style={codeStyle}>--resolve</code> 强制 TLS SNI）。
            与裸 IP 基线相比的异常会被写入为 <code style={codeStyle}>Vulnerability</code> 节点，并标记 <code style={codeStyle}>source=&quot;vhost_sni_enum&quot;</code>。
            L7 可捕获传统 Apache/Nginx vhost；L4 可捕获在 TLS 层路由的现代反向代理（k8s ingress、Traefik、Cloudflare 等）。
          </p>

          {data.vhostSniEnabled && (
            <>
              {/* Layer toggles */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>测试层</label>

                <div className={styles.toggleRow}>
                  <div>
                    <div className={styles.toggleLabel}>L7 测试（HTTP Host 头）</div>
                    <div className={styles.toggleDescription}>
                      发送 <code style={codeStyle}>curl -H &quot;Host: candidate&quot; https://IP</code>，捕获传统 vhost 路由。
                    </div>
                  </div>
                  <Toggle
                    checked={data.vhostSniTestL7}
                    onChange={(checked) => updateField('vhostSniTestL7', checked)}
                  />
                </div>

                <div className={styles.toggleRow}>
                  <div>
                    <div className={styles.toggleLabel}>L4 测试（TLS SNI）</div>
                    <div className={styles.toggleDescription}>
                      发送 <code style={codeStyle}>curl --resolve candidate:port:IP https://candidate</code>，捕获 ingress/CDN 路由。
                    </div>
                  </div>
                  <Toggle
                    checked={data.vhostSniTestL4}
                    onChange={(checked) => updateField('vhostSniTestL4', checked)}
                  />
                </div>
              </div>

              {/* Candidate sources */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>候选来源</label>

                <div className={styles.toggleRow}>
                  <div>
                    <div className={styles.toggleLabel}>使用图谱候选（推荐）</div>
                    <div className={styles.toggleDescription}>
                      从已有的 Subdomain、ExternalDomain、TLS SAN 列表、CNAME 目标以及解析到目标 IP 的反向 DNS PTR 记录中提取 hostname。信号强度最高。
                    </div>
                  </div>
                  <Toggle
                    checked={data.vhostSniUseGraphCandidates}
                    onChange={(checked) => updateField('vhostSniUseGraphCandidates', checked)}
                  />
                </div>

                <div className={styles.toggleRow}>
                  <div>
                    <div className={styles.toggleLabel}>使用默认字典</div>
                    <div className={styles.toggleDescription}>
                      使用 <code style={codeStyle}>recon/wordlists/vhost-common.txt</code> 中约 2,300 个精选前缀（admin/dev/staging/internal/现代技术栈等）。每个前缀会扩展为 <code style={codeStyle}>{`{prefix}.{target_apex}`}</code>。
                    </div>
                  </div>
                  <Toggle
                    checked={data.vhostSniUseDefaultWordlist}
                    onChange={(checked) => updateField('vhostSniUseDefaultWordlist', checked)}
                  />
                </div>
              </div>

              {/* Custom wordlist upload */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  自定义字典（每行一条，共 {customWordlistLines} 条）
                </label>
                <textarea
                  className="textInput"
                  rows={8}
                  placeholder={'# 每行一个前缀或完整 hostname。\n# 以 # 开头的行会被忽略。\nadmin\nstaging\nhidden.acme.com'}
                  value={data.vhostSniCustomWordlist || ''}
                  onChange={(e) => updateField('vhostSniCustomWordlist', e.target.value)}
                  style={{ width: '100%', minHeight: '160px', fontFamily: 'monospace', fontSize: '12px' }}
                />
                <div className={styles.fieldHint}>
                  仅前缀（如 <code style={codeStyle}>admin</code>）会扩展为 <code style={codeStyle}>{`admin.{target_apex}`}</code>；包含点的完整 hostname 会原样使用。
                  最终会与图谱候选及默认字典合并并去重。
                </div>
              </div>

              {/* Performance / behavior */}
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>单请求超时（秒）</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.vhostSniTimeout ?? 3}
                    onChange={(e) => updateField('vhostSniTimeout', parseInt(e.target.value, 10) || 3)}
                    min={1}
                    max={30}
                  />
                  <span className={styles.fieldHint}>对应 curl <code style={codeStyle}>--connect-timeout</code>。单请求总预算约为该值的 3 倍。</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>并发数</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.vhostSniConcurrency ?? 20}
                    onChange={(e) => updateField('vhostSniConcurrency', parseInt(e.target.value, 10) || 20)}
                    min={1}
                    max={100}
                  />
                  <span className={styles.fieldHint}>每个 IP/端口并行执行的 curl 探测数。越高越快，但对目标越“吵”。</span>
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>基线大小容差（字节）</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.vhostSniBaselineSizeTolerance ?? 50}
                    onChange={(e) => updateField('vhostSniBaselineSizeTolerance', parseInt(e.target.value, 10) || 50)}
                    min={0}
                    max={10000}
                  />
                  <span className={styles.fieldHint}>Body 大小差异在该字节数以内不标记异常（用于抑制 Set-Cookie/时间戳抖动）。</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>每个 IP 最大候选数</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.vhostSniMaxCandidatesPerIp ?? 2000}
                    onChange={(e) => updateField('vhostSniMaxCandidatesPerIp', parseInt(e.target.value, 10) || 2000)}
                    min={10}
                    max={50000}
                  />
                  <span className={styles.fieldHint}>用于限制运行时间的硬上限。默认字典 + 图谱候选通常每个 IP 不会超过 2,500。</span>
                </div>
              </div>

              <div className={styles.toggleRow}>
                <div>
                  <div className={styles.toggleLabel}>将发现的隐藏 vhost 注入为 BaseURL</div>
                  <div className={styles.toggleDescription}>
                    当确认隐藏 vhost 后，创建对应的 <code style={codeStyle}>BaseURL</code> 节点，方便后续部分侦察（Katana、Nuclei）继续扫描。推荐开启。
                  </div>
                </div>
                <Toggle
                  checked={data.vhostSniInjectDiscovered}
                  onChange={(c) => updateField('vhostSniInjectDiscovered', c)}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
