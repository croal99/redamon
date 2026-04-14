'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, Radar, AlertTriangle, Info, Play } from 'lucide-react'
import { Toggle } from '@/components/ui'
import type { Project } from '@prisma/client'
import { useProject } from '@/providers/ProjectProvider'
import styles from '../ProjectForm.module.css'
import { NodeInfoTooltip } from '../NodeInfoTooltip'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface ShodanSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  onRun?: () => void
}

export function ShodanSection({ data, updateField, onRun }: ShodanSectionProps) {
  const [isOpen, setIsOpen] = useState(true)
  const { userId } = useProject()
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null) // null = loading

  const checkApiKey = useCallback(() => {
    if (!userId) return
    fetch(`/api/users/${userId}/settings`)
      .then(r => r.ok ? r.json() : null)
      .then(settings => {
        if (settings) {
          setHasApiKey(!!settings.shodanApiKey)
        }
      })
      .catch(() => setHasApiKey(false))
  }, [userId])

  useEffect(() => { checkApiKey() }, [checkApiKey])

  const noKey = hasApiKey === false || hasApiKey === null

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Radar size={16} />
          Shodan 情报增强
          <NodeInfoTooltip section="Shodan" />
          <span className={styles.badgePassive}>被动</span>
        </h2>
        <div className={styles.sectionHeaderRight}>
          {onRun && data.shodanEnabled && (
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
              title="Run Shodan Enrichment"
            >
              <Play size={10} /> Run partial recon
            </button>
          )}
          <div onClick={(e) => e.stopPropagation()}>
            <Toggle
              checked={data.shodanEnabled}
              onChange={(checked) => updateField('shodanEnabled', checked)}
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
            使用 Shodan API 进行全网被动 OSINT 情报增强。执行顺序位于域名发现之后、端口扫描之前。
            在不向目标发送任何流量的情况下，为 IP 节点补充地理位置、服务信息与已知漏洞。
            若未配置 API Key 或 Key 为免费额度，主机查询/反向 DNS/被动 CVE 将自动回退到 Shodan InternetDB（免费、无需 Key），
            可提供端口、主机名、CPE、CVE 与标签等信息。
          </p>

          {data.shodanEnabled && (
          <>
          {noKey && (
            <div className={styles.shodanWarning}>
              <Info size={14} />
              未配置 Shodan API Key——主机查询/反向 DNS/被动 CVE 将使用 InternetDB（免费回退：端口、主机名、CPE、CVE、标签）。
              如需完整数据（地理位置、Banner、服务详情）以及域名 DNS 功能，请在全局设置中配置 Key。
            </div>
          )}

          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Workers</label>
              <input
                type="number"
                className="textInput"
                value={data.shodanWorkers ?? 5}
                onChange={(e) => updateField('shodanWorkers', parseInt(e.target.value) || 5)}
                min={1}
                max={20}
              />
              <span className={styles.fieldHint}>Parallel IP lookup workers</span>
            </div>
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>流程能力</h3>

            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>Host Lookup</span>
                <p className={styles.toggleDescription}>
                  查询每个发现的 IP：操作系统、ISP/组织、地理位置、开放端口、服务 Banner 与已知漏洞。
                  {noKey && <em>（InternetDB 回退：端口、主机名、CPE、CVE、标签——不含地理位置/Banner）</em>}
                </p>
              </div>
              <Toggle
                checked={data.shodanHostLookup}
                onChange={(checked) => updateField('shodanHostLookup', checked)}
              />
            </div>

            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>Reverse DNS</span>
                <p className={styles.toggleDescription}>
                  发现解析到已知 IP 的主机名，可能补充标准枚举未发现的子域名。
                  {noKey && <em>（InternetDB 回退）</em>}
                </p>
              </div>
              <Toggle
                checked={data.shodanReverseDns}
                onChange={(checked) => updateField('shodanReverseDns', checked)}
              />
            </div>

            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>Domain DNS</span>
                <p className={styles.toggleDescription}>
                  通过 Shodan DNS 数据库枚举子域名与 DNS 记录。<em>（需要付费套餐 + API Key）</em>
                </p>
              </div>
              <Toggle
                checked={data.shodanDomainDns}
                onChange={(checked) => updateField('shodanDomainDns', checked)}
                disabled={noKey}
              />
            </div>

            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>Passive CVEs</span>
                <p className={styles.toggleDescription}>
                  从 Shodan 漏洞数据库提取与已发现 IP 相关的 CVE，无需主动扫描。
                  {noKey && <em>（InternetDB 回退）</em>}
                </p>
              </div>
              <Toggle
                checked={data.shodanPassiveCves}
                onChange={(checked) => updateField('shodanPassiveCves', checked)}
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
