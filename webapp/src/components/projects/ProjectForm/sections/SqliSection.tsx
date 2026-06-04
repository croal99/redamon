'use client'

import type { Project } from '@prisma/client'
import { WikiInfoButton } from '@/components/ui/WikiInfoButton'
import styles from '../ProjectForm.module.css'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface SqliSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
}

export function SqliSection({ data, updateField }: SqliSectionProps) {
  return (
    <div style={{ padding: 'var(--space-3) var(--space-4)', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 8, right: 16 }}>
        <WikiInfoButton target="https://github.com/samugit83/redamon/wiki/Agent-Skills" title="打开智能体技能 Wiki 页面" />
      </div>
      <p className={styles.sectionDescription}>
        配置 SQLMap 扫描强度与 WAF 绕过相关设置。
      </p>

      {/* Level + Risk */}
      <div className={styles.fieldRow}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>SQLMap Level（1-5）</label>
          <input
            type="number"
            className="textInput"
            value={data.sqliLevel ?? 1}
            onChange={(e) => updateField('sqliLevel', parseInt(e.target.value) || 1)}
            min={1}
            max={5}
          />
          <span className={styles.fieldHint}>
            Level 越高，会测试更多注入点（Header、Cookie 等）。默认：1。
          </span>
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>SQLMap Risk（1-3）</label>
          <input
            type="number"
            className="textInput"
            value={data.sqliRisk ?? 1}
            onChange={(e) => updateField('sqliRisk', parseInt(e.target.value) || 1)}
            min={1}
            max={3}
          />
          <span className={styles.fieldHint}>
            Risk 越高，会使用更激进的 Payload（例如基于 OR 的注入）。默认：1。
          </span>
        </div>
      </div>

      {/* Tamper Scripts */}
      <div className={styles.fieldRow}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Tamper 脚本</label>
          <input
            type="text"
            className="textInput"
            value={data.sqliTamperScripts ?? ''}
            onChange={(e) => updateField('sqliTamperScripts', e.target.value)}
            placeholder="例如 space2comment,randomcase"
          />
          <span className={styles.fieldHint}>
            用于 WAF 绕过的 SQLMap tamper 脚本列表（逗号分隔）。留空则自动检测。
          </span>
        </div>
      </div>
    </div>
  )
}
