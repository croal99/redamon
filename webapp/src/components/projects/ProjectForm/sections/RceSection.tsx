'use client'

import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface RceSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
}

const ROW_STYLE: React.CSSProperties = {
  marginBottom: 'var(--space-4)',
}

const GROUP_HEADER_STYLE: React.CSSProperties = {
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--font-semibold)',
  color: 'var(--text-primary)',
  marginTop: 'var(--space-5)',
  marginBottom: 'var(--space-3)',
  paddingBottom: 'var(--space-2)',
  borderBottom: '1px solid var(--border-subtle, var(--border-default))',
}

const FIRST_GROUP_HEADER_STYLE: React.CSSProperties = {
  ...GROUP_HEADER_STYLE,
  marginTop: 'var(--space-3)',
}

const CHECKBOX_LABEL_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
}

export function RceSection({ data, updateField }: RceSectionProps) {
  return (
    <div style={{ padding: 'var(--space-3) var(--space-4)', position: 'relative' }}>
      <p className={styles.sectionDescription} style={{ marginBottom: 'var(--space-4)' }}>
        配置智能体如何测试 RCE / 命令注入。可关闭不希望注入到提示词中的子工作流，并通过“激进模式”开关对破坏性 Payload 进行显式门禁控制。
      </p>

      <h3 style={FIRST_GROUP_HEADER_STYLE}>子工作流注入</h3>

      <div className={styles.fieldRow} style={ROW_STYLE}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} style={CHECKBOX_LABEL_STYLE}>
            <input
              type="checkbox"
              checked={data.rceOobCallbackEnabled ?? true}
              onChange={(e) => updateField('rceOobCallbackEnabled', e.target.checked)}
            />
            OOB 回连工作流（interactsh）
          </label>
          <span className={styles.fieldHint}>
            添加盲 RCE / OOB 子提示词。智能体会注册 oast.fun 域名，并将 DNS 或 HTTP 回连作为命令执行的“静默判据”。若外部 OOB 提供方不可使用，请关闭。
          </span>
        </div>
      </div>

      <div className={styles.fieldRow} style={ROW_STYLE}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} style={CHECKBOX_LABEL_STYLE}>
            <input
              type="checkbox"
              checked={data.rceDeserializationEnabled ?? true}
              onChange={(e) => updateField('rceDeserializationEnabled', e.target.checked)}
            />
            反序列化 Gadget 工作流（ysoserial）
          </label>
          <span className={styles.fieldHint}>
            添加 Java / PHP / Python / Ruby / .NET 反序列化子提示词，并提供 ysoserial Gadget 链指导（URLDNS、CommonsCollections、Spring 等）。当目标技术栈不存在对不可信输入的反序列化，或你希望提示词更精简时可关闭。
          </span>
        </div>
      </div>

      <div className={styles.fieldRow} style={ROW_STYLE}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} style={CHECKBOX_LABEL_STYLE}>
            <input
              type="checkbox"
              checked={data.rceAggressivePayloads ?? false}
              onChange={(e) => updateField('rceAggressivePayloads', e.target.checked)}
            />
            激进 Payload（写文件 / WebShell / 容器逃逸）
          </label>
          <span className={styles.fieldHint}>
            <strong>默认关闭。</strong>开启后，工作流的第 7 步允许在 /tmp 之外写文件、持久化 WebShell / cron / systemd hook、反弹 shell handler，以及容器 / Kubernetes 逃逸探测。若仅需只读证明（id、whoami、/etc/passwd）即可产出 Level 3 结论，请保持关闭。仅在明确授权演示关键影响（Level 4）时开启。
          </span>
        </div>
      </div>
    </div>
  )
}
