'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, ShieldCheck, Info, Play } from 'lucide-react'
import { Toggle } from '@/components/ui'
import type { Project } from '@prisma/client'
import { useProject } from '@/providers/ProjectProvider'
import styles from '../ProjectForm.module.css'
import { NodeInfoTooltip } from '../NodeInfoTooltip'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface OsintEnrichmentSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  onRun?: () => void
  onRunUncover?: () => void
}

interface KeyStatus {
  censys: boolean
  fofa: boolean
  otx: boolean
  netlas: boolean
  virusTotal: boolean
  zoomEye: boolean
  criminalIp: boolean
}

export function OsintEnrichmentSection({ data, updateField, onRun, onRunUncover }: OsintEnrichmentSectionProps) {
  const [isOpen, setIsOpen] = useState(true)
  const { userId } = useProject()
  const [keyStatus, setKeyStatus] = useState<KeyStatus | null>(null)

  const checkApiKeys = useCallback(() => {
    if (!userId) return
    fetch(`/api/users/${userId}/settings`)
      .then(r => r.ok ? r.json() : null)
      .then(settings => {
        if (settings) {
          setKeyStatus({
            censys:     !!(settings.censysApiToken && settings.censysOrgId),
            fofa:       !!settings.fofaApiKey,
            otx:        !!settings.otxApiKey,
            netlas:     !!settings.netlasApiKey,
            virusTotal: !!settings.virusTotalApiKey,
            zoomEye:    !!settings.zoomEyeApiKey,
            criminalIp: !!settings.criminalIpApiKey,
          })
        }
      })
      .catch(() => setKeyStatus({ censys: false, fofa: false, otx: false, netlas: false, virusTotal: false, zoomEye: false, criminalIp: false }))
  }, [userId])

  useEffect(() => { checkApiKeys() }, [checkApiKeys])

  const noKey = (tool: keyof KeyStatus) => !keyStatus || !keyStatus[tool]

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <ShieldCheck size={16} />
          OSINT 与威胁情报增强
          <NodeInfoTooltip section="OsintEnrichment" />
          <span className={styles.badgePassive}>被动</span>
        </h2>
        <div className={styles.sectionHeaderRight}>
          {onRun && data.osintEnrichmentEnabled && (
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
              title="Run OSINT Enrichment"
            >
              <Play size={10} /> Run partial recon
            </button>
          )}
          <div onClick={(e) => e.stopPropagation()}>
            <Toggle
              checked={data.osintEnrichmentEnabled}
              onChange={(checked) => updateField('osintEnrichmentEnabled', checked)}
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
            使用外部威胁情报 API 进行被动 OSINT 增强。所有工具会在域名发现后并行运行，
            不会向目标发送任何流量。各数据源通常需要在全局设置中配置 API Key，可在项目内独立启用或禁用。
          </p>

          {data.osintEnrichmentEnabled && (
          <>
          {/* Censys */}
          <div className={styles.subSection}>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>Censys</span>
                <p className={styles.toggleDescription}>
                  调用 Censys Search API v2 获取主机记录：服务、地理位置、ASN 与操作系统等元数据（针对已发现 IP）。
                  需要配置 API Token 与 Organization ID。
                </p>
                {noKey('censys') && (
                  <div className={styles.shodanWarning}>
                    <Info size={13} />
                    未配置 Censys 凭据——请在全局设置中填写 API Token 与 Organization ID 后启用。
                  </div>
                )}
              </div>
              <Toggle
                checked={data.censysEnabled}
                onChange={(checked) => updateField('censysEnabled', checked)}
                disabled={noKey('censys')}
              />
            </div>
            {data.censysEnabled && !noKey('censys') && (
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Workers</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.censysWorkers ?? 5}
                    onChange={(e) => updateField('censysWorkers', parseInt(e.target.value) || 5)}
                    min={1}
                    max={20}
                  />
                  <span className={styles.fieldHint}>Parallel Censys IP enrichment workers (1-20)</span>
                </div>
              </div>
            )}
          </div>

          {/* FOFA */}
          <div className={styles.subSection}>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>FOFA</span>
                <p className={styles.toggleDescription}>
                  查询 FOFA（互联网空间测绘）以匹配目标域名或已发现 IP，返回 Banner、端口、技术栈与 TLS 证书等信息。
                </p>
                {noKey('fofa') && (
                  <div className={styles.shodanWarning}>
                    <Info size={13} />
                    未配置 FOFA API Key——请在全局设置中填写后启用。
                  </div>
                )}
              </div>
              <Toggle
                checked={data.fofaEnabled}
                onChange={(checked) => updateField('fofaEnabled', checked)}
                disabled={noKey('fofa')}
              />
            </div>
            {data.fofaEnabled && !noKey('fofa') && (
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>最大结果数</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.fofaMaxResults}
                    onChange={(e) => updateField('fofaMaxResults', parseInt(e.target.value) || 1000)}
                    min={1}
                    max={10000}
                  />
                  <span className={styles.fieldHint}>从 FOFA API 拉取的最大结果数（1-10,000）</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Workers</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.fofaWorkers ?? 5}
                    onChange={(e) => updateField('fofaWorkers', parseInt(e.target.value) || 5)}
                    min={1}
                    max={20}
                  />
                  <span className={styles.fieldHint}>Parallel FOFA IP enrichment workers (1-20)</span>
                </div>
              </div>
            )}
          </div>

          {/* AlienVault OTX */}
          <div className={styles.subSection}>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>AlienVault OTX</span>
                <p className={styles.toggleDescription}>
                  从 AlienVault OTX 获取威胁情报脉冲（pulses）、被动 DNS 记录与信誉数据（针对目标域名与已发现 IP）。
                  {noKey('otx') && <em> 无 API Key 时仅能使用有限的公共数据；如需完整 pulses 数据请在全局设置中配置 API Key。</em>}
                </p>
              </div>
              <Toggle
                checked={data.otxEnabled}
                onChange={(checked) => updateField('otxEnabled', checked)}
              />
            </div>
            {data.otxEnabled && (
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Workers</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.otxWorkers ?? 5}
                    onChange={(e) => updateField('otxWorkers', parseInt(e.target.value) || 5)}
                    min={1}
                    max={20}
                  />
                  <span className={styles.fieldHint}>Parallel OTX IP enrichment workers (1-20)</span>
                </div>
              </div>
            )}
          </div>

          {/* Netlas */}
          <div className={styles.subSection}>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>Netlas</span>
                <p className={styles.toggleDescription}>
                  查询 Netlas 获取主机数据、开放端口与服务 Banner（针对目标域名与已发现 IP）。
                </p>
                {noKey('netlas') && (
                  <div className={styles.shodanWarning}>
                    <Info size={13} />
                    未配置 Netlas API Key——请在全局设置中填写后启用。
                  </div>
                )}
              </div>
              <Toggle
                checked={data.netlasEnabled}
                onChange={(checked) => updateField('netlasEnabled', checked)}
                disabled={noKey('netlas')}
              />
            </div>
            {data.netlasEnabled && !noKey('netlas') && (
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Workers</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.netlasWorkers ?? 5}
                    onChange={(e) => updateField('netlasWorkers', parseInt(e.target.value) || 5)}
                    min={1}
                    max={20}
                  />
                  <span className={styles.fieldHint}>Parallel Netlas IP enrichment workers (1-20)</span>
                </div>
              </div>
            )}
          </div>

          {/* VirusTotal */}
          <div className={styles.subSection}>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>VirusTotal</span>
                <p className={styles.toggleDescription}>
                  获取目标域名与已发现 IP 的多引擎信誉评分、恶意检测数量与分类标签。免费额度约 4 次/分钟。
                  需要在全局设置中配置 API Key 后启用。
                </p>
                {noKey('virusTotal') && (
                  <div className={styles.shodanWarning}>
                    <Info size={13} />
                    未配置 VirusTotal API Key——请在全局设置中填写后启用。
                  </div>
                )}
              </div>
              <Toggle
                checked={data.virusTotalEnabled}
                onChange={(checked) => updateField('virusTotalEnabled', checked)}
                disabled={noKey('virusTotal')}
              />
            </div>
            {data.virusTotalEnabled && !noKey('virusTotal') && (
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Workers</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.virusTotalWorkers ?? 3}
                    onChange={(e) => updateField('virusTotalWorkers', parseInt(e.target.value) || 3)}
                    min={1}
                    max={10}
                  />
                  <span className={styles.fieldHint}>Parallel VirusTotal IP enrichment workers (1-10)</span>
                </div>
              </div>
            )}
          </div>

          {/* ZoomEye */}
          <div className={styles.subSection}>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>ZoomEye</span>
                <p className={styles.toggleDescription}>
                  查询 ZoomEye 空间搜索引擎，获取与目标域名/已发现 IP 相关的开放端口、服务 Banner 与技术栈信息。
                </p>
                {noKey('zoomEye') && (
                  <div className={styles.shodanWarning}>
                    <Info size={13} />
                    未配置 ZoomEye API Key——请在全局设置中填写后启用。
                  </div>
                )}
              </div>
              <Toggle
                checked={data.zoomEyeEnabled}
                onChange={(checked) => updateField('zoomEyeEnabled', checked)}
                disabled={noKey('zoomEye')}
              />
            </div>
            {data.zoomEyeEnabled && !noKey('zoomEye') && (
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>最大结果数</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.zoomEyeMaxResults}
                    onChange={(e) => updateField('zoomEyeMaxResults', parseInt(e.target.value) || 1000)}
                    min={1}
                    max={10000}
                  />
                  <span className={styles.fieldHint}>从 ZoomEye API 拉取的最大结果数（1-10,000）</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Workers</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.zoomEyeWorkers ?? 5}
                    onChange={(e) => updateField('zoomEyeWorkers', parseInt(e.target.value) || 5)}
                    min={1}
                    max={20}
                  />
                  <span className={styles.fieldHint}>Parallel ZoomEye IP enrichment workers (1-20)</span>
                </div>
              </div>
            )}
          </div>

          {/* Criminal IP */}
          <div className={styles.subSection}>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>Criminal IP</span>
                <p className={styles.toggleDescription}>
                  从 Criminal IP 获取已发现 IP 的入/出站风险评分，以及 VPN/代理/Tor 标记等信息。
                </p>
                {noKey('criminalIp') && (
                  <div className={styles.shodanWarning}>
                    <Info size={13} />
                    未配置 Criminal IP API Key——请在全局设置中填写后启用。
                  </div>
                )}
              </div>
              <Toggle
                checked={data.criminalIpEnabled}
                onChange={(checked) => updateField('criminalIpEnabled', checked)}
                disabled={noKey('criminalIp')}
              />
            </div>
            {data.criminalIpEnabled && !noKey('criminalIp') && (
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Workers</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.criminalIpWorkers ?? 5}
                    onChange={(e) => updateField('criminalIpWorkers', parseInt(e.target.value) || 5)}
                    min={1}
                    max={20}
                  />
                  <span className={styles.fieldHint}>Parallel CriminalIP IP enrichment workers (1-20)</span>
                </div>
              </div>
            )}
          </div>

          {/* Uncover */}
          <div className={styles.subSection}>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>Uncover（多引擎搜索）</span>
                <p className={styles.toggleDescription}>
                  ProjectDiscovery Uncover——同时搜索 Shodan、Censys、FOFA、ZoomEye、Netlas、CriminalIP、Quake、Hunter 等多引擎以扩展目标。
                  在端口扫描前发现更多 IP、子域名与开放端口。各引擎的 API Key 请在全局设置中配置。
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {onRunUncover && data.uncoverEnabled && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onRunUncover() }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '3px 8px', borderRadius: '4px',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      backgroundColor: 'rgba(34, 197, 94, 0.1)',
                      color: '#22c55e', cursor: 'pointer', fontSize: '11px', fontWeight: 500,
                    }}
                    title="Run Uncover"
                  >
                    <Play size={10} /> Run partial recon
                  </button>
                )}
                <Toggle
                  checked={data.uncoverEnabled}
                  onChange={(checked) => updateField('uncoverEnabled', checked)}
                />
              </div>
            </div>
            {data.uncoverEnabled && (
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>最大结果数</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.uncoverMaxResults}
                    onChange={(e) => updateField('uncoverMaxResults', parseInt(e.target.value) || 500)}
                    min={1}
                    max={10000}
                  />
                  <span className={styles.fieldHint}>所有引擎累计的最大结果数（1–10,000）</span>
                </div>
              </div>
            )}
          </div>


          </>
          )}
        </div>
      )}
    </div>
  )
}
