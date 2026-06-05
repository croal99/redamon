'use client'

import type { Project } from '@prisma/client'
import { FileImportButton } from '../FileImportButton'
import styles from '../ProjectForm.module.css'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface SsrfSectionProps {
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

export function SsrfSection({ data, updateField }: SsrfSectionProps) {
  return (
    <div style={{ padding: 'var(--space-3) var(--space-4)', position: 'relative' }}>
      <p className={styles.sectionDescription} style={{ marginBottom: 'var(--space-4)' }}>
        配置要注入到智能体提示词中的 SSRF 子工作流，并调整探测参数。对于本次测试不希望智能体使用的能力，可在此关闭。
      </p>

      {/* === Sub-workflow toggles === */}
      <h3 style={FIRST_GROUP_HEADER_STYLE}>子工作流注入</h3>

      <div className={styles.fieldRow} style={ROW_STYLE}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} style={CHECKBOX_LABEL_STYLE}>
            <input
              type="checkbox"
              checked={data.ssrfOobCallbackEnabled ?? true}
              onChange={(e) => updateField('ssrfOobCallbackEnabled', e.target.checked)}
            />
            OOB 回连工作流（interactsh）
          </label>
          <span className={styles.fieldHint}>
            添加盲 SSRF / OOB 子提示词，并向配置的 OOB 提供方发送 DNS/HTTP 探测请求。
          </span>
        </div>
      </div>

      <div className={styles.fieldRow} style={ROW_STYLE}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} style={CHECKBOX_LABEL_STYLE}>
            <input
              type="checkbox"
              checked={data.ssrfCloudMetadataEnabled ?? true}
              onChange={(e) => updateField('ssrfCloudMetadataEnabled', e.target.checked)}
            />
            云元数据跳板
          </label>
          <span className={styles.fieldHint}>
            允许探测 169.254.169.254、metadata.google.internal 等云元数据地址与其等价项。若测试规则禁止访问云元数据，请关闭。
          </span>
        </div>
      </div>

      <div className={styles.fieldRow} style={ROW_STYLE}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} style={CHECKBOX_LABEL_STYLE}>
            <input
              type="checkbox"
              checked={data.ssrfGopherEnabled ?? true}
              onChange={(e) => updateField('ssrfGopherEnabled', e.target.checked)}
            />
            Gopher / RCE 链 Payload
          </label>
          <span className={styles.fieldHint}>
            添加 gopher://、dict://、file:// 以及 Redis/FastCGI/Docker 的 RCE 链子提示词。若测试规则禁止进行 RCE 升级，请关闭。
          </span>
        </div>
      </div>

      <div className={styles.fieldRow} style={ROW_STYLE}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} style={CHECKBOX_LABEL_STYLE}>
            <input
              type="checkbox"
              checked={data.ssrfDnsRebindingEnabled ?? true}
              onChange={(e) => updateField('ssrfDnsRebindingEnabled', e.target.checked)}
            />
            DNS Rebinding 绕过
          </label>
          <span className={styles.fieldHint}>
            添加通过 1u.ms、nip.io、rbndr.us 等实现的绕过方式。若外部 DNS Rebind 服务不可使用，请关闭。
          </span>
        </div>
      </div>

      <div className={styles.fieldRow} style={ROW_STYLE}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} style={CHECKBOX_LABEL_STYLE}>
            <input
              type="checkbox"
              checked={data.ssrfPayloadReferenceEnabled ?? true}
              onChange={(e) => updateField('ssrfPayloadReferenceEnabled', e.target.checked)}
            />
            高级 Payload 参考 + HackerOne 案例
          </label>
          <span className={styles.fieldHint}>
            注入 URL 解析器混淆类 Payload、编码变体，以及 HackerOne 案例表（额外约 3KB）。如需更精简的提示词可关闭。
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
            value={data.ssrfRequestTimeout ?? 10}
            onChange={(e) => updateField('ssrfRequestTimeout', parseInt(e.target.value) || 10)}
            min={1}
            max={120}
          />
          <span className={styles.fieldHint}>
            每次 SSRF 探测使用的 curl --max-time / --connect-timeout。较低的值可加速端口扫描循环，但可能漏掉较慢的内网服务。
          </span>
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>OOB 提供方</label>
          <input
            type="text"
            className="textInput"
            value={data.ssrfOobProvider ?? 'oast.fun'}
            onChange={(e) => updateField('ssrfOobProvider', e.target.value)}
            placeholder="oast.fun"
          />
          <span className={styles.fieldHint}>
            interactsh-client 服务端地址。若 oast.fun 被屏蔽，请使用自建实例。
          </span>
        </div>
      </div>

      <div className={styles.fieldRow} style={ROW_STYLE}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>端口扫描端口列表</label>
          <div className={styles.fileImportWrap}>
            <input
              type="text"
              className="textInput"
              value={data.ssrfPortScanPorts ?? ''}
              onChange={(e) => updateField('ssrfPortScanPorts', e.target.value)}
              placeholder="22,80,443,2375,3306,5432,6379,8080,8500,9200,27017"
            />
            <FileImportButton
              fieldName="端口"
              validator={(t) => /^\d+$/.test(t)}
              onImport={(values) => updateField('ssrfPortScanPorts', values.join(','))}
            />
          </div>
          <span className={styles.fieldHint}>
            通过 SSRF 探测的端口（逗号分隔）。精简可降低噪声，扩充可提高覆盖度。
          </span>
        </div>
      </div>

      <div className={styles.fieldRow} style={ROW_STYLE}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>内网 CIDR 范围</label>
          <div className={styles.fileImportWrap}>
            <input
              type="text"
              className="textInput"
              value={data.ssrfInternalRanges ?? ''}
              onChange={(e) => updateField('ssrfInternalRanges', e.target.value)}
              placeholder="127.0.0.0/8,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,169.254.0.0/16"
            />
            <FileImportButton
              fieldName="CIDR 范围"
              onImport={(values) => updateField('ssrfInternalRanges', values.join(','))}
            />
          </div>
          <span className={styles.fieldHint}>
            智能体视为“内网”的 CIDR 块（逗号分隔）。如组织使用非标准内网地址（例如 100.64.0.0/10 CGNAT），请按需调整。
          </span>
        </div>
      </div>

      <div className={styles.fieldRow} style={ROW_STYLE}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>纳入范围的云厂商</label>
          <div className={styles.fileImportWrap}>
            <input
              type="text"
              className="textInput"
              value={data.ssrfCloudProviders ?? ''}
              onChange={(e) => updateField('ssrfCloudProviders', e.target.value)}
              placeholder="aws,gcp,azure,digitalocean,alibaba"
            />
            <FileImportButton
              fieldName="云厂商"
              onImport={(values) => updateField('ssrfCloudProviders', values.join(','))}
            />
          </div>
          <span className={styles.fieldHint}>
            在“云元数据跳板”部分纳入的云厂商（逗号分隔）。用于筛选提示词中包含的厂商端点表；当禁用云元数据时会被忽略。
          </span>
        </div>
      </div>

      {/* === Site-specific targets === */}
      <h3 style={GROUP_HEADER_STYLE}>站点内网目标（可选）</h3>

      <div className={styles.fieldRow} style={ROW_STYLE}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>自定义内网目标</label>
          <div className={styles.fileImportWrap}>
            <textarea
              className="textInput"
              rows={4}
              value={data.ssrfCustomInternalTargets ?? ''}
              onChange={(e) => updateField('ssrfCustomInternalTargets', e.target.value)}
              placeholder={'admin.internal.example.com\n10.20.30.40:8500\njumphost.corp.local'}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', resize: 'vertical' }}
            />
            <FileImportButton
              variant="textarea"
              fieldName="内网目标"
              onImport={(values) => updateField('ssrfCustomInternalTargets', values.join('\n'))}
            />
          </div>
          <span className={styles.fieldHint}>
            每行一个 hostname 或 IP[:port]。会注入到提示词中，使智能体在通用的 loopback / RFC1918 扫描之外优先关注这些目标。
          </span>
        </div>
      </div>
    </div>
  )
}
