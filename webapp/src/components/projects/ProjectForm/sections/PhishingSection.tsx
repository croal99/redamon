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
    <div style={{ padding: 'var(--space-3) var(--space-4)' }}>
      <p className={styles.sectionDescription}>
        配置用于社会工程模拟邮件投递的 SMTP 设置。代理在通过邮件发送 payload 或文档时会使用这些配置。留空则在运行时再询问。
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
            该处为自由文本 SMTP 配置，会注入到代理提示词中用于社会工程邮件投递。
            当社会工程模拟技能启用时，代理将按原样读取此内容。
          </span>
        </div>
      </div>
    </div>
  )
}
