'use client'

import type { Project } from '@prisma/client'
import { Toggle } from '@/components/ui/Toggle/Toggle'
import styles from '../ProjectForm.module.css'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface DosSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
}

export function DosSection({ data, updateField }: DosSectionProps) {
  return (
    <div style={{ padding: 'var(--space-3) var(--space-4)' }}>
      <p className={styles.sectionDescription}>
        配置可用性测试参数：控制测试强度、时长上限，以及是否仅进行评估（非破坏性）检查。
      </p>

      {/* Max Duration + Max Attempts */}
      <div className={styles.fieldRow}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>最长时长（秒）</label>
          <input
            type="number"
            className="textInput"
            value={data.dosMaxDuration ?? 60}
            onChange={(e) => updateField('dosMaxDuration', parseInt(e.target.value) || 60)}
            min={10}
            max={300}
          />
          <span className={styles.fieldHint}>
            单次可用性测试的最长秒数。用于限制 hping3、MSF 模块与 slowhttptest 等工具。
          </span>
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>最大尝试次数</label>
          <input
            type="number"
            className="textInput"
            value={data.dosMaxAttempts ?? 3}
            onChange={(e) => updateField('dosMaxAttempts', parseInt(e.target.value) || 3)}
            min={1}
            max={10}
          />
          <span className={styles.fieldHint}>
            在判定服务具备抗压能力之前，最多尝试多少种不同攻击向量。
          </span>
        </div>
      </div>

      {/* Concurrent Connections */}
      <div className={styles.fieldRow}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>并发连接数</label>
          <input
            type="number"
            className="textInput"
            value={data.dosConcurrentConnections ?? 1000}
            onChange={(e) => updateField('dosConcurrentConnections', parseInt(e.target.value) || 1000)}
            min={10}
            max={10000}
          />
          <span className={styles.fieldHint}>
            用于应用层测试的连接数（slowloris socket、slowhttptest -c），用于控制强度。
          </span>
        </div>
      </div>

      {/* Assessment Only toggle */}
      <div className={styles.fieldRow} style={{ marginTop: 'var(--space-4)' }}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>
            <input
              type="checkbox"
              checked={data.dosAssessmentOnly ?? false}
              onChange={(e) => updateField('dosAssessmentOnly', e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            仅评估（不主动施压）
          </label>
          <span className={styles.fieldHint}>
            仅检查可用性相关风险（如 nmap 脚本、nuclei），不进行主动压力测试。
          </span>
        </div>
      </div>
    </div>
  )
}
