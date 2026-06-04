'use client'

import { useState } from 'react'
import { ChevronDown, Play, Radio } from 'lucide-react'
import { Toggle, WikiInfoButton } from '@/components/ui'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'
import { NodeInfoTooltip } from '../NodeInfoTooltip'
import { TimeEstimate } from '../TimeEstimate'
import { FileImportButton } from '../FileImportButton'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface NaabuSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  onRun?: () => void
}

export function NaabuSection({ data, updateField, onRun }: NaabuSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Radio size={16} />
          Naabu 端口扫描器
          <NodeInfoTooltip section="Naabu" />
          <WikiInfoButton target="Naabu" />
          <span className={styles.badgeActive}>已启用</span>
          {data.naabuPassiveMode && <span className={styles.badgePassive}>被动</span>}
        </h2>
        <div className={styles.sectionHeaderRight}>
          {onRun && data.naabuEnabled && (
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
              title="运行 Naabu 端口扫描器"
            >
              <Play size={10} /> 运行局部侦察
            </button>
          )}
          <div onClick={(e) => e.stopPropagation()}>
            <Toggle
              checked={data.naabuEnabled}
              onChange={(checked) => updateField('naabuEnabled', checked)}
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
            使用 ProjectDiscovery 的 Naabu 进行快速端口扫描。识别已发现主机的开放端口与服务，从而对活动端点进行定向 HTTP 探测与漏洞评估。
          </p>

          {data.naabuEnabled && (
            <>
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>常用端口</label>
                  <input
                    type="text"
                    className="textInput"
                    value={data.naabuTopPorts}
                    onChange={(e) => updateField('naabuTopPorts', e.target.value)}
                    placeholder="1000"
                  />
                  <span className={styles.fieldHint}>可用 &ldquo;100&rdquo;、&ldquo;1000&rdquo;，或 &ldquo;full&rdquo; 扫描全部 65535 端口</span>
                  <TimeEstimate estimate="100：秒级 | 1000：约 15 秒/主机 | full：分钟到数小时" />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>自定义端口</label>
                  <div className={styles.fileImportWrap}>
                    <input
                      type="text"
                      className="textInput"
                      value={data.naabuCustomPorts}
                      onChange={(e) => updateField('naabuCustomPorts', e.target.value)}
                      placeholder="80,443,8080-8090"
                    />
                    <FileImportButton
                      fieldName="自定义端口"
                      onImport={(values) => updateField('naabuCustomPorts', values.join(','))}
                    />
                  </div>
                  <span className={styles.fieldHint}>设置后将覆盖“常用端口”。支持范围：8080-8090</span>
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>速率限制</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.naabuRateLimit}
                    onChange={(e) => updateField('naabuRateLimit', parseInt(e.target.value) || 1000)}
                    min={1}
                  />
                  <span className={styles.fieldHint}>每秒发包数。越高越快，但可能触发限流</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>线程数</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.naabuThreads}
                    onChange={(e) => updateField('naabuThreads', parseInt(e.target.value) || 25)}
                    min={1}
                    max={100}
                  />
                  <span className={styles.fieldHint}>并发扫描线程数</span>
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>超时（毫秒）</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.naabuTimeout}
                    onChange={(e) => updateField('naabuTimeout', parseInt(e.target.value) || 10000)}
                    min={1000}
                  />
                  <span className={styles.fieldHint}>等待端口响应的时间（毫秒）</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>重试次数</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.naabuRetries}
                    onChange={(e) => updateField('naabuRetries', parseInt(e.target.value) || 1)}
                    min={0}
                    max={10}
                  />
                  <span className={styles.fieldHint}>端口探测失败时的重试次数</span>
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>扫描类型</label>
                <select
                  className="select"
                  value={data.naabuScanType}
                  onChange={(e) => updateField('naabuScanType', e.target.value)}
                >
                  <option value="s">SYN 扫描（s）- 更快，需要 root 权限</option>
                  <option value="c">Connect 扫描（c）- 无需 root 权限</option>
                </select>
                <span className={styles.fieldHint}>SYN 更隐蔽且更快，但需要更高权限</span>
              </div>

              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>选项</h3>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>排除 CDN</span>
                    <p className={styles.toggleDescription}>对 CDN 主机仅扫描 80/443。若目标托管在云上，建议关闭</p>
                  </div>
                  <Toggle
                    checked={data.naabuExcludeCdn}
                    onChange={(checked) => updateField('naabuExcludeCdn', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>显示 CDN</span>
                    <p className={styles.toggleDescription}>在结果中包含 CDN 提供商信息（Cloudflare、Akamai 等）</p>
                  </div>
                  <Toggle
                    checked={data.naabuDisplayCdn}
                    onChange={(checked) => updateField('naabuDisplayCdn', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>跳过主机存活探测</span>
                    <p className={styles.toggleDescription}>假设所有主机都存活。对 Web 目标推荐</p>
                  </div>
                  <Toggle
                    checked={data.naabuSkipHostDiscovery}
                    onChange={(checked) => updateField('naabuSkipHostDiscovery', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>校验端口</span>
                    <p className={styles.toggleDescription}>额外进行一次 TCP 握手以确认端口确实开放</p>
                    <TimeEstimate estimate="扫描时间约 +10-20%" />
                  </div>
                  <Toggle
                    checked={data.naabuVerifyPorts}
                    onChange={(checked) => updateField('naabuVerifyPorts', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>被动模式</span>
                    <p className={styles.toggleDescription}>使用 Shodan InternetDB 查询替代主动扫描。更隐蔽但可能过时</p>
                    <TimeEstimate estimate="被动（Shodan）：几乎即时 | 主动：每主机数分钟" />
                  </div>
                  <Toggle
                    checked={data.naabuPassiveMode}
                    onChange={(checked) => updateField('naabuPassiveMode', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>AI 端口目录</span>
                    <p className={styles.toggleDescription}>标注 AI 相关端口（Ollama 11434、Qdrant 6333、Open WebUI 8080、vLLM、LiteLLM、Triton、Milvus、Gradio、ComfyUI…），并生成 category=ai-* 的 Technology 节点关联到 Service</p>
                  </div>
                  <Toggle
                    checked={data.portScanAiPortCatalogEnabled ?? true}
                    onChange={(checked) => updateField('portScanAiPortCatalogEnabled', checked)}
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Docker 镜像</label>
                <input
                  type="text"
                  className="textInput"
                  value={data.naabuDockerImage}
                  disabled
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
