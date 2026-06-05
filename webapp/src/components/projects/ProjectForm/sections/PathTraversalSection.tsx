'use client'

import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface PathTraversalSectionProps {
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

export function PathTraversalSection({ data, updateField }: PathTraversalSectionProps) {
  return (
    <div style={{ padding: 'var(--space-3) var(--space-4)', position: 'relative' }}>
      <p className={styles.sectionDescription} style={{ marginBottom: 'var(--space-4)' }}>
        配置要注入到智能体提示词中的路径穿越 / LFI / RFI 子工作流，并调整探测参数。对于本次测试不希望使用的子模块，可在此关闭。
      </p>

      {/* === Sub-workflow toggles === */}
      <h3 style={FIRST_GROUP_HEADER_STYLE}>子工作流注入</h3>

      <div className={styles.fieldRow} style={ROW_STYLE}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} style={CHECKBOX_LABEL_STYLE}>
            <input
              type="checkbox"
              checked={data.pathTraversalOobCallbackEnabled ?? true}
              onChange={(e) => updateField('pathTraversalOobCallbackEnabled', e.target.checked)}
            />
            OOB 回连工作流（interactsh）
          </label>
          <span className={styles.fieldHint}>
            添加 RFI / 盲 LFI 子提示词，并向配置的 OOB 提供方发送 DNS/HTTP 探测请求。若禁止外部回连，请关闭。
          </span>
        </div>
      </div>

      <div className={styles.fieldRow} style={ROW_STYLE}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} style={CHECKBOX_LABEL_STYLE}>
            <input
              type="checkbox"
              checked={data.pathTraversalPhpWrappersEnabled ?? true}
              onChange={(e) => updateField('pathTraversalPhpWrappersEnabled', e.target.checked)}
            />
            PHP Wrapper + 日志投毒子模块
          </label>
          <span className={styles.fieldHint}>
            添加 php://filter、data://、expect://、zip:// 等 Payload 及日志投毒链。非 PHP 目标建议关闭以减少提示词体积。
          </span>
        </div>
      </div>

      <div className={styles.fieldRow} style={ROW_STYLE}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} style={CHECKBOX_LABEL_STYLE}>
            <input
              type="checkbox"
              checked={data.pathTraversalArchiveExtractionEnabled ?? false}
              onChange={(e) => updateField('pathTraversalArchiveExtractionEnabled', e.target.checked)}
            />
            解压写入测试（Zip Slip）
          </label>
          <span className={styles.fieldHint}>
            允许智能体上传特制 ZIP/TAR 压缩包，使条目逃逸目标解压目录。该操作会向目标文件系统写入文件——仅在明确授权的测试规则（RoE）下启用。
          </span>
        </div>
      </div>

      <div className={styles.fieldRow} style={ROW_STYLE}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} style={CHECKBOX_LABEL_STYLE}>
            <input
              type="checkbox"
              checked={data.pathTraversalPayloadReferenceEnabled ?? true}
              onChange={(e) => updateField('pathTraversalPayloadReferenceEnabled', e.target.checked)}
            />
            绕过与编码 Payload 参考表
          </label>
          <span className={styles.fieldHint}>
            注入编码 / 点号技巧 / wrapper / 解析差异等 Payload 参考，以及真实案例表（额外约 3KB）。如需更精简的提示词可关闭。
          </span>
        </div>
      </div>

      {/* === Probe parameters === */}
      <h3 style={GROUP_HEADER_STYLE}>探测参数</h3>

      <div className={styles.fieldRow} style={ROW_STYLE}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>请求超时（秒）</label>
          <input
            type="number"
            className="textInput"
            value={data.pathTraversalRequestTimeout ?? 10}
            onChange={(e) => updateField('pathTraversalRequestTimeout', parseInt(e.target.value) || 10)}
            min={1}
            max={120}
          />
          <span className={styles.fieldHint}>
            每次路径穿越探测使用的 curl --max-time / --connect-timeout。较低的值可加速 fuzz 循环，但可能漏掉响应较慢的文件读取入口。
          </span>
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>OOB 提供方</label>
          <input
            type="text"
            className="textInput"
            value={data.pathTraversalOobProvider ?? 'oast.fun'}
            onChange={(e) => updateField('pathTraversalOobProvider', e.target.value)}
            placeholder="oast.fun"
          />
          <span className={styles.fieldHint}>
            interactsh-client 服务端地址。若 oast.fun 被屏蔽，请使用自建实例。仅在启用 OOB 回连工作流时使用。
          </span>
        </div>
      </div>
    </div>
  )
}
