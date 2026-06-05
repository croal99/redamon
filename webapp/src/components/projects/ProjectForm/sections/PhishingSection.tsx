'use client'

import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface PhishingSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
}

export function PhishingSection({ data, updateField }: PhishingSectionProps) {
  return (
    <div style={{ padding: 'var(--space-3) var(--space-4)', position: 'relative' }}>
      <p className={styles.sectionDescription}>
        配置用于社工演练邮件投递的 SMTP 设置。智能体在通过邮件发送 Payload 或文档时会使用这些配置。留空则在运行时询问。
      </p>

      {/* SMTP Configuration Textarea */}
      <div className={styles.fieldRow}>
        <div className={styles.fieldGroup} style={{ flex: 1 }}>
          <label className={styles.fieldLabel}>SMTP 配置（可选）</label>
          <textarea
            className="textInput"
            value={data.phishingSmtpConfig ?? ''}
            onChange={(e) => updateField('phishingSmtpConfig', e.target.value)}
            placeholder={`SMTP_HOST: smtp.gmail.com\nSMTP_PORT: 587\nSMTP_USER: pentest@gmail.com\nSMTP_PASS: abcd efgh ijkl mnop\nSMTP_FROM: it-support@company.com\nUSE_TLS: true`}
            rows={6}
            style={{ fontFamily: 'monospace', fontSize: '13px', resize: 'vertical' }}
          />
          <span className={styles.fieldHint}>
            以纯文本形式注入到智能体提示词中的 SMTP 设置，用于社工演练邮件投递。启用社工演练技能时，智能体会按原样读取。
          </span>
        </div>
      </div>
    </div>
  )
}
