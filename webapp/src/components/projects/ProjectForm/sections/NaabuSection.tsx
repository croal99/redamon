'use client'

import { useState } from 'react'
import { ChevronDown, Play, Radio } from 'lucide-react'
import { Toggle } from '@/components/ui'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'
import { NodeInfoTooltip } from '../NodeInfoTooltip'
import { TimeEstimate } from '../TimeEstimate'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface NaabuSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  onRun?: () => void
}

export function NaabuSection({ data, updateField, onRun }: NaabuSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Radio size={16} />
          Naabu 端口扫描
          <NodeInfoTooltip section="Naabu" />
          <span className={styles.badgeActive}>主动</span>
          {data.naabuPassiveMode && <span className={styles.badgePassive}>被动</span>}
        </h2>
        <div className={styles.sectionHeaderRight}>
          {onRun && data.naabuEnabled && (
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
              title="Run Naabu Port Scanner"
            >
              <Play size={10} /> Run partial recon
            </button>
          )}
          <div onClick={(e) => e.stopPropagation()}>
            <Toggle
              checked={data.naabuEnabled}
              onChange={(checked) => updateField('naabuEnabled', checked)}
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
            使用 ProjectDiscovery 的 Naabu 进行快速端口扫描。识别已发现主机上的开放端口与服务，为后续 HTTP 探测与漏洞评估提供入口。
          </p>

          {data.naabuEnabled && (
            <>
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Top 端口</label>
                  <input
                    type="text"
                    className="textInput"
                    value={data.naabuTopPorts}
                    onChange={(e) => updateField('naabuTopPorts', e.target.value)}
                    placeholder="1000"
                  />
                  <span className={styles.fieldHint}>可填 “100”、“1000” 或 “full”（扫描全部 65535 端口）</span>
                  <TimeEstimate estimate="100：秒级 | 1000：约 15 秒/主机 | full：分钟到小时" />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>自定义端口</label>
                  <input
                    type="text"
                    className="textInput"
                    value={data.naabuCustomPorts}
                    onChange={(e) => updateField('naabuCustomPorts', e.target.value)}
                    placeholder="80,443,8080-8090"
                  />
                  <span className={styles.fieldHint}>设置后将覆盖 Top 端口；支持范围：8080-8090</span>
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>速率限制</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.naabuRateLimit}
                    onChange={(e) => updateField('naabuRateLimit', parseInt(e.target.value) || 1000)}
                    min={1}
                  />
                  <span className={styles.fieldHint}>包/秒。越高越快，但更容易触发限速</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>线程数</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.naabuThreads}
                    onChange={(e) => updateField('naabuThreads', parseInt(e.target.value) || 25)}
                    min={1}
                    max={100}
                  />
                  <span className={styles.fieldHint}>并发扫描线程数</span>
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>超时（ms）</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.naabuTimeout}
                    onChange={(e) => updateField('naabuTimeout', parseInt(e.target.value) || 10000)}
                    min={1000}
                  />
                  <span className={styles.fieldHint}>等待端口响应的时间（毫秒）</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>重试次数</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.naabuRetries}
                    onChange={(e) => updateField('naabuRetries', parseInt(e.target.value) || 1)}
                    min={0}
                    max={10}
                  />
                  <span className={styles.fieldHint}>端口探测失败时的重试次数</span>
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>扫描类型</label>
                <select
                  className="select"
                  value={data.naabuScanType}
                  onChange={(e) => updateField('naabuScanType', e.target.value)}
                >
                  <option value="s">SYN 扫描（s）- 更快，但需要 root/特权</option>
                  <option value="c">Connect 扫描（c）- 无需 root</option>
                </select>
                <span className={styles.fieldHint}>SYN 更隐蔽且更快，但需要更高权限</span>
              </div>

              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>选项</h3>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>排除 CDN</span>
                    <p className={styles.toggleDescription}>对 CDN 主机仅扫描 80/443；云上目标建议关闭此项</p>
                  </div>
                  <Toggle
                    checked={data.naabuExcludeCdn}
                    onChange={(checked) => updateField('naabuExcludeCdn', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>显示 CDN</span>
                    <p className={styles.toggleDescription}>在结果中展示 CDN 供应商信息（Cloudflare、Akamai 等）</p>
                  </div>
                  <Toggle
                    checked={data.naabuDisplayCdn}
                    onChange={(checked) => updateField('naabuDisplayCdn', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>跳过主机探测</span>
                    <p className={styles.toggleDescription}>默认所有主机存活；Web 目标推荐开启</p>
                  </div>
                  <Toggle
                    checked={data.naabuSkipHostDiscovery}
                    onChange={(checked) => updateField('naabuSkipHostDiscovery', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>验证端口</span>
                    <p className={styles.toggleDescription}>额外进行 TCP 握手确认端口真实开放</p>
                    <TimeEstimate estimate="预计额外 +10–20% 耗时" />
                  </div>
                  <Toggle
                    checked={data.naabuVerifyPorts}
                    onChange={(checked) => updateField('naabuVerifyPorts', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>被动模式</span>
                    <p className={styles.toggleDescription}>不进行主动扫描，改为查询 Shodan InternetDB；更隐蔽但可能过期</p>
                    <TimeEstimate estimate="被动（Shodan）：近乎即时 | 主动：每主机分钟级" />
                  </div>
                  <Toggle
                    checked={data.naabuPassiveMode}
                    onChange={(checked) => updateField('naabuPassiveMode', checked)}
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Docker 镜像</label>
                <input
                  type="text"
                  className="textInput"
                  value={data.naabuDockerImage}
                  disabled
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
