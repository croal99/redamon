'use client'

import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface HydraSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
}

export function HydraSection({ data, updateField }: HydraSectionProps) {
  // Parse extra checks string into individual flags
  const extraChecks = (data.hydraExtraChecks ?? 'nsr') as string
  const hasNull = extraChecks.includes('n')
  const hasLoginAsPass = extraChecks.includes('s')
  const hasReversed = extraChecks.includes('r')

  const toggleExtraCheck = (flag: string) => {
    let current = extraChecks
    if (current.includes(flag)) {
      current = current.replace(flag, '')
    } else {
      current += flag
    }
    updateField('hydraExtraChecks', current)
  }

  return (
    <div style={{ padding: 'var(--space-3) var(--space-4)' }}>
      <p className={styles.sectionDescription}>
        配置 THC Hydra 的口令测试参数。Hydra 支持 50+ 协议，
        包括 SSH、FTP、RDP、SMB、HTTP 表单、数据库等。
      </p>

      {/* Threads + Wait Between Connections */}
      <div className={styles.fieldRow}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>线程数（-t）</label>
          <input
            type="number"
            className="textInput"
            value={data.hydraThreads ?? 16}
            onChange={(e) => updateField('hydraThreads', parseInt(e.target.value) || 16)}
            min={1}
            max={64}
          />
          <span className={styles.fieldHint}>
            每个目标的并行连接数。SSH 最大 4、RDP 最大 1。默认：16。
          </span>
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>连接间隔（-W）</label>
          <input
            type="number"
            className="textInput"
            value={data.hydraWaitBetweenConnections ?? 0}
            onChange={(e) => updateField('hydraWaitBetweenConnections', parseInt(e.target.value) || 0)}
            min={0}
            max={300}
          />
          <span className={styles.fieldHint}>
            每个任务的连接间隔秒数。0=不延迟。
          </span>
        </div>
      </div>

      {/* Connection Timeout + Max Wordlist Attempts */}
      <div className={styles.fieldRow}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>连接超时（-w）</label>
          <input
            type="number"
            className="textInput"
            value={data.hydraConnectionTimeout ?? 32}
            onChange={(e) => updateField('hydraConnectionTimeout', parseInt(e.target.value) || 32)}
            min={5}
            max={120}
          />
          <span className={styles.fieldHint}>
            等待目标响应的最长秒数。默认：32。
          </span>
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>最大字典尝试次数</label>
          <input
            type="number"
            className="textInput"
            value={data.hydraMaxWordlistAttempts ?? 3}
            onChange={(e) => updateField('hydraMaxWordlistAttempts', parseInt(e.target.value) || 3)}
            min={1}
            max={10}
          />
          <span className={styles.fieldHint}>
            放弃前最多尝试多少种字典策略。
          </span>
        </div>
      </div>

      {/* Stop On First Found + Verbose */}
      <div className={styles.fieldRow}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>
            <input
              type="checkbox"
              checked={data.hydraStopOnFirstFound ?? true}
              onChange={(e) => updateField('hydraStopOnFirstFound', e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            首次命中即停止（-f）
          </label>
          <span className={styles.fieldHint}>
            一旦发现有效凭据立即停止。
          </span>
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>
            <input
              type="checkbox"
              checked={data.hydraVerbose ?? true}
              onChange={(e) => updateField('hydraVerbose', e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            详细输出（-V）
          </label>
          <span className={styles.fieldHint}>
            输出每次登录尝试，用于观察进度。
          </span>
        </div>
      </div>

      {/* Extra Password Checks */}
      <div className={styles.fieldRow}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>额外口令检查（-e）</label>
          <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={hasNull}
                onChange={() => toggleExtraCheck('n')}
              />
              空口令（n）
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={hasLoginAsPass}
                onChange={() => toggleExtraCheck('s')}
              />
              用户名作为口令（s）
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={hasReversed}
                onChange={() => toggleExtraCheck('r')}
              />
              反转用户名（r）
            </label>
          </div>
          <span className={styles.fieldHint}>
            在跑字典前先尝试的额外口令变体，常见“秒出”选项。
          </span>
        </div>
      </div>
    </div>
  )
}
