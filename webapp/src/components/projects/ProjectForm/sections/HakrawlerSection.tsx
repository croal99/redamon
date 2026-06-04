'use client'

import { useState } from 'react'
import { Bug, ChevronDown, Play } from 'lucide-react'
import { Toggle, WikiInfoButton } from '@/components/ui'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'
import { NodeInfoTooltip } from '../NodeInfoTooltip'
import { FileImportButton } from '../FileImportButton'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface HakrawlerSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  onRun?: () => void
}

export function HakrawlerSection({ data, updateField, onRun }: HakrawlerSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Bug size={16} />
          Hakrawler Web 爬虫
          <NodeInfoTooltip section="Hakrawler" />
          <WikiInfoButton target="Hakrawler" />
          <span className={styles.badgeActive}>主动</span>
        </h2>
        <div className={styles.sectionHeaderRight}>
          {onRun && data.hakrawlerEnabled && (
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
              title="运行 Hakrawler Web 爬虫"
            >
              <Play size={10} /> 运行部分侦察
            </button>
          )}
          <div onClick={(e) => e.stopPropagation()}>
            <Toggle
              checked={data.hakrawlerEnabled}
              onChange={(checked) => updateField('hakrawlerEnabled', checked)}
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
            基于 Go 的快速 Web 爬虫，用于发现 URL 与 JavaScript 文件位置。作为 Katana 的补充，使用不同的爬虫引擎，可能发现额外端点。通过 stdin 方式在 Docker 中执行。
          </p>

          {data.hakrawlerEnabled && (
            <>
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>爬取深度</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.hakrawlerDepth}
                    onChange={(e) => updateField('hakrawlerDepth', parseInt(e.target.value) || 2)}
                    min={1}
                    max={10}
                  />
                  <span className={styles.fieldHint}>最多跟随多少层链接</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>最大 URL 数</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.hakrawlerMaxUrls}
                    onChange={(e) => updateField('hakrawlerMaxUrls', parseInt(e.target.value) || 50000)}
                    min={1}
                  />
                  <span className={styles.fieldHint}>最多收集的 URL 数（达到上限会终止进程）</span>
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>线程数</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.hakrawlerThreads}
                    onChange={(e) => updateField('hakrawlerThreads', parseInt(e.target.value) || 5)}
                    min={1}
                    max={20}
                  />
                  <span className={styles.fieldHint}>并发爬取线程数</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>超时（秒）</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.hakrawlerTimeout}
                    onChange={(e) => updateField('hakrawlerTimeout', parseInt(e.target.value) || 30)}
                    min={5}
                  />
                  <span className={styles.fieldHint}>每个 URL 的爬取超时</span>
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>并行度</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.hakrawlerParallelism ?? 4}
                    onChange={(e) => updateField('hakrawlerParallelism', parseInt(e.target.value) || 4)}
                    min={1}
                    max={10}
                  />
                  <span className={styles.fieldHint}>同时爬取的 URL 数量</span>
                </div>
              </div>

              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>选项</h3>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>包含子域</span>
                    <p className={styles.toggleDescription}>允许爬虫跟随指向目标子域的链接。结果仍会进行范围过滤。</p>
                  </div>
                  <Toggle
                    checked={data.hakrawlerIncludeSubs}
                    onChange={(checked) => updateField('hakrawlerIncludeSubs', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>不校验证书</span>
                    <p className={styles.toggleDescription}>跳过 TLS 证书校验（适用于自签名证书）</p>
                  </div>
                  <Toggle
                    checked={data.hakrawlerInsecure}
                    onChange={(checked) => updateField('hakrawlerInsecure', checked)}
                  />
                </div>
              </div>

              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>自定义请求头</h3>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>请求头</label>
                  <div className={styles.fileImportWrap}>
                    <textarea
                      className="textarea"
                      value={(data.hakrawlerCustomHeaders ?? []).join('\n')}
                      onChange={(e) => updateField('hakrawlerCustomHeaders', e.target.value.split('\n').filter(Boolean))}
                      placeholder="Cookie: session=abc123&#10;Authorization: Bearer token..."
                      rows={3}
                    />
                    <FileImportButton
                      variant="textarea"
                      fieldName="请求头"
                      onImport={(values) => updateField('hakrawlerCustomHeaders', values)}
                    />
                  </div>
                  <span className={styles.fieldHint}>每行一个请求头（例如 Cookie: value），每次请求都会携带</span>
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Docker 镜像</label>
                <input
                  type="text"
                  className="textInput"
                  value={data.hakrawlerDockerImage}
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
