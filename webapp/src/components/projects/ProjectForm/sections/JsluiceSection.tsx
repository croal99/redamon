'use client'

import { useState } from 'react'
import { ChevronDown, Code, Play } from 'lucide-react'
import { Toggle } from '@/components/ui'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'
import { NodeInfoTooltip } from '../NodeInfoTooltip'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface JsluiceSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  onRun?: () => void
}

export function JsluiceSection({ data, updateField, onRun }: JsluiceSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Code size={16} />
          jsluice JS 分析器
          <NodeInfoTooltip section="Jsluice" />
          <span className={styles.badgeActive}>已启用</span>
        </h2>
        <div className={styles.sectionHeaderRight}>
          {onRun && data.jsluiceEnabled && (
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
              title="运行 jsluice JS 分析器"
            >
              <Play size={10} /> 运行局部侦察
            </button>
          )}
          <div onClick={(e) => e.stopPropagation()}>
            <Toggle
              checked={data.jsluiceEnabled}
              onChange={(checked) => updateField('jsluiceEnabled', checked)}
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
            使用 Bishop Fox 的 jsluice 对 JavaScript 文件进行静态分析。从 Katana/Hakrawler 发现的 JS 源码中提取隐藏的 API 端点、路径、查询参数与敏感信息（如 AWS Key、API Token）。除下载 JS 文件外，不会对目标产生额外流量。
          </p>

          {data.jsluiceEnabled && (
            <>
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>最大 JS 文件数</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.jsluiceMaxFiles}
                    onChange={(e) => updateField('jsluiceMaxFiles', parseInt(e.target.value) || 10000)}
                    min={1}
                    max={10000}
                  />
                  <span className={styles.fieldHint}>最多下载并分析的 .js 文件数量</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>超时（秒）</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.jsluiceTimeout}
                    onChange={(e) => updateField('jsluiceTimeout', parseInt(e.target.value) || 300)}
                    min={30}
                  />
                  <span className={styles.fieldHint}>整体分析超时时间</span>
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>并发数</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.jsluiceConcurrency}
                    onChange={(e) => updateField('jsluiceConcurrency', parseInt(e.target.value) || 5)}
                    min={1}
                    max={20}
                  />
                  <span className={styles.fieldHint}>jsluice 同时处理的文件数量</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>并行度</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.jsluiceParallelism ?? 3}
                    onChange={(e) => updateField('jsluiceParallelism', parseInt(e.target.value) || 3)}
                    min={1}
                    max={10}
                  />
                  <span className={styles.fieldHint}>并行处理的基础 URL 分析批次数</span>
                </div>
              </div>

              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>提取模式</h3>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>提取 URL</span>
                    <p className={styles.toggleDescription}>从 fetch() / XMLHttpRequest / jQuery.ajax / 字符串字面量中发现 API 端点、路径与参数</p>
                  </div>
                  <Toggle
                    checked={data.jsluiceExtractUrls}
                    onChange={(checked) => updateField('jsluiceExtractUrls', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>提取敏感信息</span>
                    <p className={styles.toggleDescription}>检测 AWS Key、GCP 凭证、GitHub Token 等内嵌敏感信息（附上下文）</p>
                  </div>
                  <Toggle
                    checked={data.jsluiceExtractSecrets}
                    onChange={(checked) => updateField('jsluiceExtractSecrets', checked)}
                  />
                </div>
              </div>

              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>URL 校验</h3>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>使用 httpx 校验提取的 URL</span>
                    <p className={styles.toggleDescription}>先用降噪过滤器丢弃打包库/SourceMap/静态资源路径，再用 httpx 探测其余 URL，确保只有存活端点进入图谱。关闭后将发布 jsluice 提取的全部 URL（旧行为）。</p>
                  </div>
                  <Toggle
                    checked={data.jsluiceVerifyUrls ?? true}
                    onChange={(checked) => updateField('jsluiceVerifyUrls', checked)}
                  />
                </div>

                {(data.jsluiceVerifyUrls ?? true) && (
                  <>
                    <div className={styles.fieldRow}>
                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>校验线程数</label>
                        <input
                          type="number"
                          className="textInput"
                          value={data.jsluiceVerifyThreads ?? 50}
                          onChange={(e) => updateField('jsluiceVerifyThreads', parseInt(e.target.value) || 50)}
                          min={1}
                          max={500}
                        />
                        <span className={styles.fieldHint}>httpx 工作线程数</span>
                      </div>
                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>校验速率限制（req/s）</label>
                        <input
                          type="number"
                          className="textInput"
                          value={data.jsluiceVerifyRateLimit ?? 50}
                          onChange={(e) => updateField('jsluiceVerifyRateLimit', parseInt(e.target.value) || 50)}
                          min={1}
                          max={1000}
                        />
                        <span className={styles.fieldHint}>限制每秒探测次数，避免对目标造成压力</span>
                      </div>
                    </div>
                    <div className={styles.fieldRow}>
                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>校验超时（秒）</label>
                        <input
                          type="number"
                          className="textInput"
                          value={data.jsluiceVerifyTimeout ?? 5}
                          onChange={(e) => updateField('jsluiceVerifyTimeout', parseInt(e.target.value) || 5)}
                          min={1}
                          max={60}
                        />
                        <span className={styles.fieldHint}>每次探测请求的超时时间</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
