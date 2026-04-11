'use client'

import { useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { Toggle } from '@/components/ui'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'
import { NodeInfoTooltip } from '../NodeInfoTooltip'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface ParamSpiderSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
}

export function ParamSpiderSection({ data, updateField }: ParamSpiderSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Search size={16} />
          ParamSpider 参数发现
          <NodeInfoTooltip section="ParamSpider" />
          <span className={styles.badgePassive}>被动</span>
        </h2>
        <div className={styles.sectionHeaderRight}>
          <div onClick={(e) => e.stopPropagation()}>
            <Toggle
              checked={data.paramspiderEnabled}
              onChange={(checked) => updateField('paramspiderEnabled', checked)}
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
            使用 ParamSpider 进行被动 URL 参数发现。通过查询 Wayback Machine 获取历史记录中包含查询参数的 URL。仅返回带参数的 URL（?key=value），可直接用于 fuzz 与漏洞测试。相较 GAU 更聚焦“带参数端点”。无需 API Key。
          </p>

          {data.paramspiderEnabled && (
            <>
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>占位符</label>
                  <input
                    type="text"
                    className="textInput"
                    value={data.paramspiderPlaceholder}
                    onChange={(e) => updateField('paramspiderPlaceholder', e.target.value || 'FUZZ')}
                  />
                  <span className={styles.fieldHint}>用于替换参数值的占位符（例如给 fuzz 工具使用的 FUZZ）</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>超时（秒）</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.paramspiderTimeout}
                    onChange={(e) => updateField('paramspiderTimeout', parseInt(e.target.value) || 120)}
                    min={10}
                  />
                  <span className={styles.fieldHint}>每个域名的查询超时</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
