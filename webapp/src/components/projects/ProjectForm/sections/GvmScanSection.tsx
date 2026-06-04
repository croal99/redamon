'use client'

import { useState } from 'react'
import { ChevronDown, Shield } from 'lucide-react'
import { Toggle, WikiInfoButton } from '@/components/ui'
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
          <WikiInfoButton target="GvmScan" />
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
            配置 GVM/OpenVAS 的网络层漏洞扫描。这些设置用于控制扫描深度、目标策略与 Greenbone 扫描器的超时参数。
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
                  <option value="Full and fast">Full and fast — 全面且性能良好（推荐）</option>
                  <option value="Full and fast ultimate">Full and fast ultimate — 最彻底，更慢</option>
                  <option value="Full and very deep">Full and very deep — 深度扫描，非常慢</option>
                  <option value="Full and very deep ultimate">Full and very deep ultimate — 最大覆盖，非常慢</option>
                  <option value="Discovery">Discovery — 仅网络发现，不做漏洞测试</option>
                  <option value="Host Discovery">Host Discovery — 基础主机枚举</option>
                  <option value="System Discovery">System Discovery — 系统枚举</option>
                </select>
                <span className={styles.fieldHint}>GVM 扫描预设配置。多数目标推荐 &ldquo;Full and fast&rdquo;。</span>
                <TimeEstimate estimate="Discovery：约 5-10 分钟 | Full and fast：约 30-60 分钟 | Deep：数小时" />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>扫描目标策略</label>
                <select
                  className="select"
                  value={data.gvmScanTargets}
                  onChange={(e) => updateField('gvmScanTargets', e.target.value)}
                >
                  <option value="both">Both — IP 与主机名分别扫描</option>
                  <option value="ips_only">IPs Only — 仅扫描 IP 地址</option>
                  <option value="hostnames_only">Hostnames Only — 仅扫描主机名/子域</option>
                </select>
                <span className={styles.fieldHint}>选择要从侦察数据中扫描哪些目标。&ldquo;Both&rdquo; 覆盖最全面。</span>
                <TimeEstimate estimate="选择 &ldquo;Both&rdquo; 的目标数量约为单策略的 2 倍" />
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
                <span className={styles.fieldHint}>等待单个扫描任务的最大秒数。0 = 不限。默认：14400（4 小时）。</span>
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
                <span className={styles.fieldHint}>扫描状态检查间隔秒数。越小日志更新越快。</span>
              </div>
            </div>
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>扫描后处理</h3>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>扫描后清理</span>
                <p className={styles.toggleDescription}>提取结果后，从 GVM 内部数据库中移除扫描目标与任务，保持多次扫描后的实例整洁。无论该开关如何，结果都会保存到 JSON 与 Neo4j。</p>
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
