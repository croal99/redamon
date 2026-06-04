'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, Radar, AlertTriangle, Info, Play } from 'lucide-react'
import { Toggle, WikiInfoButton } from '@/components/ui'
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
          Shodan 增强
          <NodeInfoTooltip section="Shodan" />
          <WikiInfoButton target="Shodan" />
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
              title="运行 Shodan 增强"
            >
              <Play size={10} /> 运行部分侦察
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
            使用 Shodan API 进行被动的互联网级 OSINT 增强。流程位于域名发现之后、端口扫描之前。
            在不向目标发送任何流量的前提下，为 IP 节点补充地理位置、服务与已知漏洞等信息。
            若未配置 API key 或 key 为免费档位，Host Lookup、Reverse DNS 与 Passive CVEs 会自动回退到
            Shodan 的 InternetDB（免费且无需 key），可提供 ports、hostnames、CPEs、CVEs 与 tags。
          </p>

          {data.shodanEnabled && (
          <>
          {noKey && (
            <div className={styles.shodanWarning}>
              <Info size={14} />
              未配置 Shodan API key —— Host Lookup、Reverse DNS 与 Passive CVEs 将使用 InternetDB（免费回退：ports、hostnames、CPEs、CVEs、tags）。若需完整数据（地理位置、banner、服务）以及 Domain DNS，请在 Global Settings 中添加 key。
            </div>
          )}

          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>并发数</label>
              <input
                type="number"
                className="textInput"
                value={data.shodanWorkers ?? 5}
                onChange={(e) => updateField('shodanWorkers', parseInt(e.target.value) || 5)}
                min={1}
                max={20}
              />
              <span className={styles.fieldHint}>并行执行 IP 查询的 worker 数</span>
            </div>
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>流水线功能</h3>

            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>Host Lookup</span>
                <p className={styles.toggleDescription}>
                  查询每个已发现 IP 的 OS、ISP、组织、地理位置、开放端口、服务 banner 与已知漏洞。
                  {noKey && <em>（InternetDB 回退：ports、hostnames、CPEs、CVEs、tags —— 不包含 geo/banner）</em>}
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
                  发现解析到已知 IP 的 hostnames，可揭示标准枚举未找到的额外子域名。
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
                  通过 Shodan 的 DNS 数据库枚举子域名与 DNS 记录。<em>（需要 Shodan 付费计划 + API key）</em>
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
                  从 Shodan 漏洞数据库中提取与已发现 IP 相关的已知 CVE，无需主动扫描。
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
