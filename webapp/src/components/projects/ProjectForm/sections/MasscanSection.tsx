'use client'

import { useState } from 'react'
import { ChevronDown, Radar } from 'lucide-react'
import { Toggle } from '@/components/ui'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'
import { NodeInfoTooltip } from '../NodeInfoTooltip'
import { TimeEstimate } from '../TimeEstimate'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface MasscanSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
}

export function MasscanSection({ data, updateField }: MasscanSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Radar size={16} />
          Masscan 端口扫描
          <NodeInfoTooltip section="Masscan" />
          <span className={styles.badgeActive}>主动</span>
        </h2>
        <div className={styles.sectionHeaderRight}>
          <div onClick={(e) => e.stopPropagation()}>
            <Toggle
              checked={data.masscanEnabled}
              onChange={(checked) => updateField('masscanEnabled', checked)}
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
            面向大网段与 IP/CIDR 的高速 SYN 端口扫描器。
            使用原始报文以获得最高速度；需要 root 或 CAP_NET_RAW 权限。
            与 Tor 不兼容（原始 SYN 报文绕过 TCP 协议栈）。
          </p>

          {data.masscanEnabled && (
            <>
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Top 端口</label>
                  <input
                    type="text"
                    className="textInput"
                    value={data.masscanTopPorts}
                    onChange={(e) => updateField('masscanTopPorts', e.target.value)}
                    placeholder="1000"
                  />
                  <span className={styles.fieldHint}>可填 “100”、“1000” 或 “full”（扫描全部 65535 端口）</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>自定义端口</label>
                  <input
                    type="text"
                    className="textInput"
                    value={data.masscanCustomPorts}
                    onChange={(e) => updateField('masscanCustomPorts', e.target.value)}
                    placeholder="80,443,8080-8090"
                  />
                  <span className={styles.fieldHint}>设置后会覆盖 Top 端口；支持范围：8080-8090</span>
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>速率（包/秒）</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.masscanRate}
                    onChange={(e) => updateField('masscanRate', parseInt(e.target.value) || 1000)}
                    min={1}
                  />
                  <span className={styles.fieldHint}>包/秒。Masscan 可支持很高的速率（10k+）</span>
                  <TimeEstimate estimate="1000：相对安全的默认值 | 10000+：更快，但可能压垮目标" />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>等待（秒）</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.masscanWait}
                    onChange={(e) => updateField('masscanWait', parseInt(e.target.value) || 10)}
                    min={0}
                  />
                  <span className={styles.fieldHint}>扫描结束后等待延迟响应的秒数</span>
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>重试次数</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.masscanRetries}
                    onChange={(e) => updateField('masscanRetries', parseInt(e.target.value) || 1)}
                    min={0}
                    max={10}
                  />
                  <span className={styles.fieldHint}>对无响应端口的重试次数</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>排除目标</label>
                  <input
                    type="text"
                    className="textInput"
                    value={data.masscanExcludeTargets}
                    onChange={(e) => updateField('masscanExcludeTargets', e.target.value)}
                    placeholder="10.0.0.1, 192.168.0.0/24"
                  />
                  <span className={styles.fieldHint}>用逗号分隔要从扫描中排除的 IP/CIDR</span>
                </div>
              </div>

              <div className={styles.toggleRow}>
                <div>
                  <span className={styles.toggleLabel}>抓取 Banner</span>
                  <p className={styles.toggleDescription}>抓取服务 Banner（SSH/HTTP 等）。会增加耗时，但能提供更丰富的数据</p>
                </div>
                <Toggle
                  checked={data.masscanBanners}
                  onChange={(checked) => updateField('masscanBanners', checked)}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
