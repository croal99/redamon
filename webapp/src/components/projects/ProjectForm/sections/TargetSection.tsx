'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, Target, ShieldAlert } from 'lucide-react'
import { Toggle } from '@/components/ui'
import type { Project } from '@prisma/client'
import { isHardBlockedDomain } from '@/lib/hard-guardrail'
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
            定义本次安全评估的主要目标。可在域名模式与 IP 模式之间切换。
          </p>

          {/* IP Mode Toggle - locked in edit mode */}
          <div className={styles.toggleRow}>
            <div>
              <span className={styles.toggleLabel}>从 IP 开始</span>
              <p className={styles.toggleDescription}>
                使用 IP 地址或 CIDR 网段作为目标（而非域名）。流程会尝试进行反向 DNS 解析以发现主机名。
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
                  title={isLocked ? '项目创建后无法修改目标域名。如需更换，请创建新项目。' : undefined}
                />
              </div>
            )}
          </div>

          {/* Hard guardrail warning for government/public domains */}
          {hardBlockResult.blocked && (
            <div className={styles.shodanWarning} style={{ borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.08)' }}>
              <ShieldAlert size={14} style={{ color: '#ef4444' }} />
              <span>
                <strong>目标已被永久拦截：</strong>政府、军队、教育与国际组织等网站（.gov、.mil、.edu、.int 等）始终禁止作为目标，
                与目标防护规则（Guardrail）设置无关，且无法关闭该限制。
              </span>
            </div>
          )}

          {/* IP Mode: Target IPs textarea */}
          {ipMode && (
            <div className={styles.fieldGroup}>
              <label className={`${styles.fieldLabel} ${styles.fieldLabelRequired}`}>
                目标 IP / CIDR
              </label>
              <textarea
                className="textarea"
                value={displayIps}
                onChange={(e) => handleIpsChange(e.target.value)}
                placeholder={"192.168.1.1\n10.0.0.0/24\n2001:db8::1"}
                rows={4}
                disabled={isLocked}
                title={isLocked ? '项目创建后无法修改目标 IP。' : undefined}
              />
              <span className={styles.fieldHint}>
                {isLocked
                  ? '项目创建后目标 IP 会被锁定。如需更换，请创建新项目。'
                  : '每行输入一个 IP 或 CIDR，也可用逗号分隔。支持 IPv4/IPv6/CIDR，最大 /24（256 主机）。'}
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
                <input
                  type="text"
                  className="textInput"
                  value={displayPrefixes}
                  onChange={(e) => handlePrefixesChange(e.target.value)}
                  placeholder="www, api, admin（逗号分隔）"
                  disabled={isLocked}
                  title={isLocked ? '项目创建后无法修改子域名列表。如需更换，请创建新项目。' : undefined}
                />
                <span className={styles.fieldHint}>
                  {isLocked
                    ? '为保持图谱数据一致性，项目创建后目标域名与子域名将被锁定。如需更换，请创建新项目。'
                    : '留空表示发现全部子域名；填写时请输入不带点的前缀（例如“www, api, admin”）。'}
                </span>
                {!isLocked && displayPrefixes.trim().length > 0 && (
                  <span className={styles.fieldHintWarning}>
                    指定前缀会关闭全量子域名发现（Subfinder/Amass），仅扫描所列前缀。
                  </span>
                )}
              </div>

              <div className={styles.toggleRow}>
                <div>
                  <span className={styles.toggleLabel}>包含根域名</span>
                  <p className={styles.toggleDescription}>
                    同时扫描根域名（例如不带子域的 example.com）
                  </p>
                </div>
                <Toggle
                  checked={includesRootDomain}
                  onChange={handleRootDomainToggle}
                  disabled={isLocked}
                />
              </div>

              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>域名验证</h3>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>验证域名所有权</span>
                    <p className={styles.toggleDescription}>
                      扫描前要求通过 DNS TXT 记录验证
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
                  强制整个流程只使用被动与低噪声技术。
                  将禁用主动扫描器（Kiterunner、Banner 抓取等）；端口扫描切换为被动模式；
                  Nuclei 会关闭 DAST 与 interactsh；AI 代理仅使用隐蔽方法，若某个动作无法隐蔽完成则停止。
                </p>
              </div>
              <Toggle
                checked={data.stealthMode}
                onChange={(checked) => updateField('stealthMode', checked)}
              />
            </div>
          </div>

          {/* Target Guardrail */}
          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>目标防护规则（Guardrail）</h3>
            <div className={styles.toggleRow} style={{ gap: 'var(--space-4)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className={styles.toggleLabel}>启用目标防护规则（Guardrail）</span>
                <p className={styles.toggleDescription}>
                  保存项目时拦截知名公共目标（大型科技公司、云服务商、金融机构等），避免误扫未授权域名。
                  政府/军队/教育/国际组织域名（.gov/.mil/.edu/.int）无论该开关如何设置都会被永久拦截。
                </p>
              </div>
              <Toggle
                checked={data.targetGuardrailEnabled ?? true}
                onChange={(checked) => updateField('targetGuardrailEnabled', checked)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
