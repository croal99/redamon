'use client'

import { useState } from 'react'
import { ChevronDown, Network } from 'lucide-react'
import { Toggle } from '@/components/ui'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface MitreSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
}

export function MitreSection({ data, updateField }: MitreSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Network size={16} />
          MITRE ATT&CK / CWE / CAPEC
          <span className={styles.badgePassive}>被动</span>
        </h2>
        <div className={styles.sectionHeaderRight}>
          <div onClick={(e) => e.stopPropagation()}>
            <Toggle
              checked={data.mitreEnabled}
              onChange={(checked) => updateField('mitreEnabled', checked)}
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
            将已发现漏洞映射到 MITRE ATT&CK 技术、CWE 弱点与 CAPEC 攻击模式。用于理解漏洞可能的利用路径，并帮助确定修复优先级。
          </p>
          {data.mitreEnabled && (
          <>
          <div className={styles.toggleRow}>
            <div>
              <span className={styles.toggleLabel}>自动更新数据库</span>
              <p className={styles.toggleDescription}>自动保持 MITRE 数据为最新</p>
            </div>
            <Toggle
              checked={data.mitreAutoUpdateDb}
              onChange={(checked) => updateField('mitreAutoUpdateDb', checked)}
            />
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>数据源</h3>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>包含 CWE</span>
                <p className={styles.toggleDescription}>通用弱点枚举（Common Weakness Enumeration）</p>
              </div>
              <Toggle
                checked={data.mitreIncludeCwe}
                onChange={(checked) => updateField('mitreIncludeCwe', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>包含 CAPEC</span>
                <p className={styles.toggleDescription}>通用攻击模式枚举（Common Attack Pattern Enumeration）</p>
              </div>
              <Toggle
                checked={data.mitreIncludeCapec}
                onChange={(checked) => updateField('mitreIncludeCapec', checked)}
              />
            </div>
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>增强</h3>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>增强侦察结果</span>
                <p className={styles.toggleDescription}>为侦察发现补充 MITRE 数据</p>
              </div>
              <Toggle
                checked={data.mitreEnrichRecon}
                onChange={(checked) => updateField('mitreEnrichRecon', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>增强 GVM 结果</span>
                <p className={styles.toggleDescription}>为 GVM 发现补充 MITRE 数据</p>
              </div>
              <Toggle
                checked={data.mitreEnrichGvm}
                onChange={(checked) => updateField('mitreEnrichGvm', checked)}
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>缓存 TTL（小时）</label>
            <input
              type="number"
              className="textInput"
              value={data.mitreCacheTtlHours}
              onChange={(e) => updateField('mitreCacheTtlHours', parseInt(e.target.value) || 24)}
              min={1}
              max={168}
            />
          </div>
          </>
          )}
        </div>
      )}
    </div>
  )
}
