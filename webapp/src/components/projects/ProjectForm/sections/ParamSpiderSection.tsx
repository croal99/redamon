'use client'

import { useState } from 'react'
import { ChevronDown, Search, Play } from 'lucide-react'
import { Toggle } from '@/components/ui'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'
import { NodeInfoTooltip } from '../NodeInfoTooltip'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface ParamSpiderSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  onRun?: () => void
}

export function ParamSpiderSection({ data, updateField, onRun }: ParamSpiderSectionProps) {
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
          {onRun && data.paramspiderEnabled && (
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
              title="运行 ParamSpider"
            >
              <Play size={10} /> 运行局部侦察
            </button>
          )}
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
            使用 ParamSpider 进行被动 URL 参数发现。查询 Wayback Machine 获取历史记录中包含查询参数的 URL。只返回带参数的 URL（?key=value），可直接用于 fuzz 与漏洞测试。与 GAU 互补，专注于“带参数”的端点。无需 API Key。
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
                  <span className={styles.fieldHint}>用于替换参数值的内容（例如给 fuzz 工具用的 FUZZ）</span>
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
                  <span className={styles.fieldHint}>每个域名的查询超时时间</span>
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Worker 数</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.paramspiderWorkers ?? 5}
                    onChange={(e) => updateField('paramspiderWorkers', parseInt(e.target.value) || 5)}
                    min={1}
                    max={10}
                  />
                  <span className={styles.fieldHint}>并行处理的域名 worker 数</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
