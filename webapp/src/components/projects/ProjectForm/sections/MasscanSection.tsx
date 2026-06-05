'use client'

import { useState } from 'react'
import { ChevronDown, Play, Radar } from 'lucide-react'
import { Toggle } from '@/components/ui'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'
import { NodeInfoTooltip } from '../NodeInfoTooltip'
import { TimeEstimate } from '../TimeEstimate'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface MasscanSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  onRun?: () => void
}

export function MasscanSection({ data, updateField, onRun }: MasscanSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Radar size={16} />
          Masscan 端口扫描器
          <NodeInfoTooltip section="Masscan" />
          <span className={styles.badgeActive}>已启用</span>
        </h2>
        <div className={styles.sectionHeaderRight}>
          {onRun && data.masscanEnabled && (
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
              title="运行 Masscan 端口扫描器"
            >
              <Play size={10} /> 运行局部侦察
            </button>
          )}
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
            面向大型网络与 IP/CIDR 范围优化的高速 SYN 端口扫描器。
            使用原始数据包以获得最高速度，需要 root 或 CAP_NET_RAW 权限。
            与 Tor 不兼容（原始 SYN 包绕过 TCP 协议栈）。
          </p>

          {data.masscanEnabled && (
            <>
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>常用端口</label>
                  <input
                    type="text"
                    className="textInput"
                    value={data.masscanTopPorts}
                    onChange={(e) => updateField('masscanTopPorts', e.target.value)}
                    placeholder="1000"
                  />
                  <span className={styles.fieldHint}>可用 &ldquo;100&rdquo;、&ldquo;1000&rdquo;，或 &ldquo;full&rdquo; 扫描全部 65535 端口</span>
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
                  <span className={styles.fieldHint}>设置后将覆盖“常用端口”。支持范围：8080-8090</span>
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
                  <span className={styles.fieldHint}>每秒发包数。Masscan 可支持非常高的速率（10k+）</span>
                  <TimeEstimate estimate="1000：安全默认值 | 10000+：更快，但可能压垮目标" />
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
                  <span className={styles.fieldHint}>用逗号分隔要排除的 IP/CIDR</span>
                </div>
              </div>

              <div className={styles.toggleRow}>
                <div>
                  <span className={styles.toggleLabel}>Banner 抓取</span>
                  <p className={styles.toggleDescription}>抓取服务 Banner（SSH/HTTP 等）。会增加扫描时间，但数据更丰富。</p>
                </div>
                <Toggle
                  checked={data.masscanBanners}
                  onChange={(checked) => updateField('masscanBanners', checked)}
                />
              </div>
              <div className={styles.toggleRow}>
                <div>
                  <span className={styles.toggleLabel}>AI 端口目录</span>
                  <p className={styles.toggleDescription}>对 masscan 输出中的 AI 相关端口进行标注（与 Naabu 使用同一目录）。会生成 category=ai-* 的 Technology 节点并关联到 Service。</p>
                </div>
                <Toggle
                  checked={data.masscanAiPortCatalogEnabled ?? true}
                  onChange={(checked) => updateField('masscanAiPortCatalogEnabled', checked)}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
