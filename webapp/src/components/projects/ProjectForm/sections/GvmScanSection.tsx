'use client'

import { useState } from 'react'
import { ChevronDown, Shield } from 'lucide-react'
import { Toggle } from '@/components/ui'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'
import { NodeInfoTooltip } from '../NodeInfoTooltip'
import { TimeEstimate } from '../TimeEstimate'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface GvmScanSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
}

export function GvmScanSection({ data, updateField }: GvmScanSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Shield size={16} />
          GVM 漏洞扫描
          <NodeInfoTooltip section="GvmScan" />
          <span className={styles.badgeActive}>主动</span>
        </h2>
        <ChevronDown
          size={16}
          className={`${styles.sectionIcon} ${isOpen ? styles.sectionIconOpen : ''}`}
        />
      </div>

      {isOpen && (
        <div className={styles.sectionContent}>
          <p className={styles.sectionDescription}>
            配置 GVM/OpenVAS 的网络层漏洞扫描。这些设置用于控制 Greenbone 扫描器的扫描深度、目标策略与超时等参数。
          </p>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>扫描配置</h3>
            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>扫描配置文件</label>
                <select
                  className="select"
                  value={data.gvmScanConfig}
                  onChange={(e) => updateField('gvmScanConfig', e.target.value)}
                >
                  <option value="Full and fast">Full and fast — 覆盖全面，性能较好（推荐）</option>
                  <option value="Full and fast ultimate">Full and fast ultimate — 最全面，较慢</option>
                  <option value="Full and very deep">Full and very deep — 深度扫描，非常慢</option>
                  <option value="Full and very deep ultimate">Full and very deep ultimate — 最大覆盖，非常慢</option>
                  <option value="Discovery">Discovery — 仅网络发现，不做漏洞检测</option>
                  <option value="Host Discovery">Host Discovery — 基础主机枚举</option>
                  <option value="System Discovery">System Discovery — 系统枚举</option>
                </select>
                <span className={styles.fieldHint}>GVM 扫描预设。“Full and fast” 适用于大多数目标。</span>
                <TimeEstimate estimate="Discovery：约 5–10 分钟 | Full and fast：约 30–60 分钟 | Deep：小时级" />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>目标策略</label>
                <select
                  className="select"
                  value={data.gvmScanTargets}
                  onChange={(e) => updateField('gvmScanTargets', e.target.value)}
                >
                  <option value="both">Both — IP 与主机名分别扫描</option>
                  <option value="ips_only">IPs Only — 仅扫描 IP 地址</option>
                  <option value="hostnames_only">Hostnames Only — 仅扫描主机名/子域名</option>
                </select>
                <span className={styles.fieldHint}>从侦察数据中选择哪些目标参与扫描。“Both” 覆盖最全面。</span>
                <TimeEstimate estimate="“Both” 相比单一策略会使目标数量约翻倍" />
              </div>
            </div>
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>超时与轮询</h3>
            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>任务超时（秒）</label>
                <input
                  type="number"
                  className="textInput"
                  value={data.gvmTaskTimeout}
                  onChange={(e) => updateField('gvmTaskTimeout', parseInt(e.target.value) || 0)}
                  min={0}
                />
                <span className={styles.fieldHint}>单个扫描任务最大等待时间。0=不限。默认：14400（4 小时）。</span>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>轮询间隔（秒）</label>
                <input
                  type="number"
                  className="textInput"
                  value={data.gvmPollInterval}
                  onChange={(e) => updateField('gvmPollInterval', parseInt(e.target.value) || 5)}
                  min={5}
                  max={300}
                />
                <span className={styles.fieldHint}>扫描状态检查间隔。越小日志更新越快。</span>
              </div>
            </div>
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>扫描后</h3>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>扫描后清理</span>
                <p className={styles.toggleDescription}>结果提取后从 GVM 内部数据库移除扫描目标与任务，便于多次扫描保持实例整洁。无论此项是否开启，结果都会保存到 JSON 与 Neo4j。</p>
              </div>
              <Toggle
                checked={data.gvmCleanupAfterScan}
                onChange={(checked) => updateField('gvmCleanupAfterScan', checked)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
