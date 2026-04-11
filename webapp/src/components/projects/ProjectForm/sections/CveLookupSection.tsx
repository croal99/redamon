'use client'

import { useState } from 'react'
import { ChevronDown, Database } from 'lucide-react'
import { Toggle } from '@/components/ui'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'
import { NodeInfoTooltip } from '../NodeInfoTooltip'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface CveLookupSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
}

export function CveLookupSection({ data, updateField }: CveLookupSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Database size={16} />
          CVE 查询
          <NodeInfoTooltip section="CveLookup" />
          <span className={styles.badgePassive}>被动</span>
        </h2>
        <div className={styles.sectionHeaderRight}>
          <div onClick={(e) => e.stopPropagation()}>
            <Toggle
              checked={data.cveLookupEnabled}
              onChange={(checked) => updateField('cveLookupEnabled', checked)}
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
            使用 NVD 等数据源的详细 CVE 信息增强漏洞发现结果，提供 CVSS 评分、影响版本、利用状态与修复建议。
          </p>

          {data.cveLookupEnabled && (
            <>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>CVE 数据源</label>
                <select
                  className="select"
                  value={data.cveLookupSource}
                  onChange={(e) => updateField('cveLookupSource', e.target.value)}
                >
                  <option value="nvd">NVD (National Vulnerability Database)</option>
                  <option value="vulners">Vulners</option>
                </select>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>每条发现最多 CVE 数</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.cveLookupMaxCves}
                    onChange={(e) => updateField('cveLookupMaxCves', parseInt(e.target.value) || 20)}
                    min={1}
                    max={100}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>最低 CVSS 分数</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.cveLookupMinCvss}
                    onChange={(e) => updateField('cveLookupMinCvss', parseFloat(e.target.value) || 0)}
                    min={0}
                    max={10}
                    step={0.1}
                  />
                </div>
              </div>

              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>API Key</h3>
                <p className={styles.fieldHint} style={{ marginTop: 0 }}>
                  NVD 与 Vulners 的 API Key 在{' '}
                  <a href="/settings" style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}>
                    全局设置 &rarr; 工具 API Keys
                  </a>
                  中配置。该处设置的 Key 会自动应用于所有项目。
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
