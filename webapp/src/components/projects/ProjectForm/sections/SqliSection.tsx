'use client'

import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface SqliSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
}

export function SqliSection({ data, updateField }: SqliSectionProps) {
  return (
    <div style={{ padding: 'var(--space-3) var(--space-4)' }}>
      <p className={styles.sectionDescription}>
        配置 SQLMap 扫描强度与 WAF 绕过参数。
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
            Level 越高会测试更多注入点（请求头、Cookie 等）。默认：1。
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
            Risk 越高会使用更激进的 payload（例如基于 OR 的探测）。默认：1。
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
            placeholder="例如：space2comment,randomcase"
          />
          <span className={styles.fieldHint}>
            用于 WAF 绕过的 SQLMap tamper 脚本（逗号分隔）。留空则自动检测。
          </span>
        </div>
      </div>
    </div>
  )
}
