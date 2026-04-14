'use client'

import { useState } from 'react'
import { ChevronDown, Play, Search } from 'lucide-react'
import { Toggle } from '@/components/ui'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'
import { NodeInfoTooltip } from '../NodeInfoTooltip'
import { TimeEstimate } from '../TimeEstimate'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface SubdomainDiscoverySectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  onRun?: () => void
}

export function SubdomainDiscoverySection({ data, updateField, onRun }: SubdomainDiscoverySectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Search size={16} />
          子域名发现
          <NodeInfoTooltip section="SubdomainDiscovery" />
        </h2>
        <div className={styles.sectionHeaderRight}>
          {onRun && data.subdomainDiscoveryEnabled && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRun() }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '4px',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                color: '#22c55e',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 500,
              }}
              title="Run Subdomain Discovery"
            >
              <Play size={10} /> Run partial recon
            </button>
          )}
          <div onClick={(e) => e.stopPropagation()}>
            <Toggle
              checked={data.subdomainDiscoveryEnabled}
              onChange={(checked) => updateField('subdomainDiscoveryEnabled', checked)}
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
            配置要使用的子域名发现来源。被动来源查询外部数据库，不触达目标；主动发现会直接向目标发起 DNS 查询。
          </p>

          {data.subdomainDiscoveryEnabled && (
          <>
          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>数据来源 <span className={styles.badgePassive}>被动</span></h3>

            <div className={styles.toggleRowCompact}>
              <div className={styles.toggleRowCompactInfo}>
                <span className={styles.toggleLabelLg}>crt.sh</span>
                <p className={styles.toggleDescription}>
                  证书透明日志——从 SSL/TLS 证书中发现子域名
                </p>
              </div>
              {data.crtshEnabled && (
                <>
                  <span className={styles.toggleRowCompactLabel}>上限</span>
                  <input
                    type="number"
                    className={`textInput ${styles.toggleRowCompactInput}`}
                    value={data.crtshMaxResults}
                    onChange={(e) => updateField('crtshMaxResults', parseInt(e.target.value) || 5000)}
                    min={1}
                    max={50000}
                  />
                </>
              )}
              <Toggle
                checked={data.crtshEnabled}
                onChange={(checked) => updateField('crtshEnabled', checked)}
              />
            </div>

            <div className={styles.toggleRowCompact}>
              <div className={styles.toggleRowCompactInfo}>
                <span className={styles.toggleLabelLg}>HackerTarget</span>
                <p className={styles.toggleDescription}>
                  DNS 查询数据库——通过 HackerTarget 的 host search API 发现子域名
                </p>
              </div>
              {data.hackerTargetEnabled && (
                <>
                  <span className={styles.toggleRowCompactLabel}>上限</span>
                  <input
                    type="number"
                    className={`textInput ${styles.toggleRowCompactInput}`}
                    value={data.hackerTargetMaxResults}
                    onChange={(e) => updateField('hackerTargetMaxResults', parseInt(e.target.value) || 5000)}
                    min={1}
                    max={50000}
                  />
                </>
              )}
              <Toggle
                checked={data.hackerTargetEnabled}
                onChange={(checked) => updateField('hackerTargetEnabled', checked)}
              />
            </div>

            <div className={styles.toggleRowCompact}>
              <div className={styles.toggleRowCompactInfo}>
                <span className={styles.toggleLabelLg}>Subfinder</span>
                <p className={styles.toggleDescription}>
                  使用 50+ 在线数据源进行被动子域名枚举（证书日志、DNS 数据库、Web 存档等）
                </p>
              </div>
              {data.subfinderEnabled && (
                <>
                  <span className={styles.toggleRowCompactLabel}>上限</span>
                  <input
                    type="number"
                    className={`textInput ${styles.toggleRowCompactInput}`}
                    value={data.subfinderMaxResults}
                    onChange={(e) => updateField('subfinderMaxResults', parseInt(e.target.value) || 5000)}
                    min={1}
                    max={50000}
                  />
                </>
              )}
              <Toggle
                checked={data.subfinderEnabled}
                onChange={(checked) => updateField('subfinderEnabled', checked)}
              />
            </div>

            <div className={styles.toggleRowCompact}>
              <div className={styles.toggleRowCompactInfo}>
                <span className={styles.toggleLabelLg}>Knockpy Recon</span>
                <p className={styles.toggleDescription}>
                  使用 Knockpy 的 recon 模式进行基于字典的被动子域名枚举
                </p>
              </div>
              {data.knockpyReconEnabled && (
                <>
                  <span className={styles.toggleRowCompactLabel}>上限</span>
                  <input
                    type="number"
                    className={`textInput ${styles.toggleRowCompactInput}`}
                    value={data.knockpyReconMaxResults}
                    onChange={(e) => updateField('knockpyReconMaxResults', parseInt(e.target.value) || 5000)}
                    min={1}
                    max={50000}
                  />
                </>
              )}
              <Toggle
                checked={data.knockpyReconEnabled}
                onChange={(checked) => updateField('knockpyReconEnabled', checked)}
              />
            </div>

            <div className={styles.toggleRowCompact}>
              <div className={styles.toggleRowCompactInfo}>
                <span className={styles.toggleLabelLg}>Amass</span>
                <p className={styles.toggleDescription}>
                  OWASP Amass——使用 50+ 数据源进行子域名枚举（证书日志、DNS 数据库、Web 存档、WHOIS 等）
                </p>
              </div>
              {data.amassEnabled && (
                <>
                  <span className={styles.toggleRowCompactLabel}>上限</span>
                  <input
                    type="number"
                    className={`textInput ${styles.toggleRowCompactInput}`}
                    value={data.amassMaxResults}
                    onChange={(e) => updateField('amassMaxResults', parseInt(e.target.value) || 5000)}
                    min={1}
                    max={50000}
                  />
                </>
              )}
              <Toggle
                checked={data.amassEnabled}
                onChange={(checked) => updateField('amassEnabled', checked)}
              />
            </div>
          </div>

          {data.amassEnabled && (
            <div className={styles.subSection}>
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Amass 超时（分钟）</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.amassTimeout}
                    onChange={(e) => updateField('amassTimeout', parseInt(e.target.value) || 10)}
                    min={1}
                    max={120}
                  />
                </div>
              </div>
            </div>
          )}

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>主动发现 <span className={styles.badgeActive}>主动</span></h3>

            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>Knockpy Bruteforce Mode</span>
                <p className={styles.toggleDescription}>
                  使用字典对候选子域名进行爆破——会发送大量 DNS 查询
                </p>
                <TimeEstimate estimate="预计额外 +5–30 分钟（取决于字典大小）" />
              </div>
              <Toggle
                checked={data.useBruteforceForSubdomains}
                onChange={(checked) => updateField('useBruteforceForSubdomains', checked)}
              />
            </div>

            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>Amass Active Mode</span>
                <p className={styles.toggleDescription}>
                  启用区域传送与证书名称抓取——会直接向目标发起 DNS 查询
                </p>
              </div>
              <Toggle
                checked={data.amassActive}
                onChange={(checked) => updateField('amassActive', checked)}
                disabled={!data.amassEnabled}
              />
            </div>

            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>Amass Bruteforce</span>
                <p className={styles.toggleDescription}>
                  被动枚举后进行 DNS 爆破——会显著增加扫描耗时
                </p>
                <TimeEstimate estimate="预计额外 +10–60 分钟（取决于目标规模）" />
              </div>
              <Toggle
                checked={data.amassBrute}
                onChange={(checked) => updateField('amassBrute', checked)}
                disabled={!data.amassEnabled}
              />
            </div>

            {data.amassBrute && data.amassEnabled && (
              <div style={{ marginLeft: 'var(--space-6)', marginTop: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                <span className={styles.toggleLabel}>爆破字典</span>
                <p className={styles.toggleDescription}>
                  选择要使用的字典。Amass 默认字典始终启用。
                </p>

                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)', opacity: 0.6 }}>
                  <input type="checkbox" checked disabled />
                  <span>Amass Default (~8K entries)</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>始终启用</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                  <input
                    type="checkbox"
                    checked={(Array.isArray(data.amassBruteWordlists) ? data.amassBruteWordlists as string[] : ['default']).includes('jhaddix-all')}
                    onChange={(e) => {
                      const current = (Array.isArray(data.amassBruteWordlists) ? data.amassBruteWordlists as string[] : ['default']).filter((w: string) => w !== 'jhaddix-all')
                      if (e.target.checked) current.push('jhaddix-all')
                      if (!current.includes('default')) current.unshift('default')
                      updateField('amassBruteWordlists', current as any)
                    }}
                  />
                  <span>jhaddix all.txt (~2.18M entries)</span>
                </label>
                <TimeEstimate estimate="预计额外 +30–60 分钟" />
              </div>
            )}
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>泛解析过滤 <span className={styles.badgeActive}>主动</span></h3>

            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>Puredns Wildcard Filtering</span>
                <p className={styles.toggleDescription}>
                  使用公共 DNS 解析器验证已发现的子域名，移除泛解析条目与 DNS 污染结果——在所有发现工具结束后执行
                </p>
              </div>
              <Toggle
                checked={data.purednsEnabled}
                onChange={(checked) => updateField('purednsEnabled', checked)}
              />
            </div>

            {data.purednsEnabled && (
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>线程数（0=自动）</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.purednsThreads}
                    onChange={(e) => updateField('purednsThreads', parseInt(e.target.value) || 0)}
                    min={0}
                    max={1000}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>速率限制（0=不限）</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.purednsRateLimit}
                    onChange={(e) => updateField('purednsRateLimit', parseInt(e.target.value) || 0)}
                    min={0}
                  />
                </div>
              </div>
            )}
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>DNS Performance</h3>

            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>DNS Max Workers</label>
                <input
                  type="number"
                  className="textInput"
                  value={data.dnsMaxWorkers ?? 50}
                  onChange={(e) => updateField('dnsMaxWorkers', parseInt(e.target.value) || 50)}
                  min={1}
                  max={200}
                />
                <span className={styles.fieldHint}>Parallel DNS resolution workers</span>
              </div>
            </div>

            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>DNS Record Parallelism</span>
                <p className={styles.toggleDescription}>Query all DNS record types in parallel per hostname</p>
              </div>
              <Toggle
                checked={data.dnsRecordParallelism ?? true}
                onChange={(checked) => updateField('dnsRecordParallelism', checked)}
              />
            </div>
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>DNS &amp; WHOIS <span className={styles.badgePassive}>Passive</span></h3>

            <div className={styles.toggleRowCompact}>
              <div className={styles.toggleRowCompactInfo}>
                <span className={styles.toggleLabelLg}>WHOIS Lookup</span>
                <p className={styles.toggleDescription}>
                  查询公开 WHOIS 数据库获取域名注册信息（注册商、日期、联系人等）
                </p>
              </div>
              {data.whoisEnabled && (
                <>
                  <span className={styles.toggleRowCompactLabel}>重试</span>
                  <input
                    type="number"
                    className={`textInput ${styles.toggleRowCompactInput}`}
                    value={data.whoisMaxRetries}
                    onChange={(e) => updateField('whoisMaxRetries', parseInt(e.target.value) || 6)}
                    min={1}
                    max={20}
                  />
                </>
              )}
              <Toggle
                checked={data.whoisEnabled}
                onChange={(checked) => updateField('whoisEnabled', checked)}
              />
            </div>

            <div className={styles.toggleRowCompact}>
              <div className={styles.toggleRowCompactInfo}>
                <span className={styles.toggleLabelLg}>DNS Resolution</span>
                <p className={styles.toggleDescription}>
                  解析 DNS 记录（A/AAAA/MX/NS/TXT）并对发现的主机进行反向 DNS
                </p>
              </div>
              {data.dnsEnabled && (
                <>
                  <span className={styles.toggleRowCompactLabel}>重试</span>
                  <input
                    type="number"
                    className={`textInput ${styles.toggleRowCompactInput}`}
                    value={data.dnsMaxRetries}
                    onChange={(e) => updateField('dnsMaxRetries', parseInt(e.target.value) || 3)}
                    min={1}
                    max={10}
                  />
                </>
              )}
              <Toggle
                checked={data.dnsEnabled}
                onChange={(checked) => updateField('dnsEnabled', checked)}
              />
            </div>
          </div>
          </>
          )}
        </div>
      )}
    </div>
  )
}
