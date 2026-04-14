'use client'

import { useState } from 'react'
import { Bug, ChevronDown, Play } from 'lucide-react'
import { Toggle } from '@/components/ui'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'
import { NodeInfoTooltip } from '../NodeInfoTooltip'

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
              title="Run Hakrawler Web Crawler"
            >
              <Play size={10} /> Run partial recon
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
            基于 Go 的高速 Web 爬虫，用于发现 URL 与 JavaScript 文件位置。与 Katana 互补（不同爬取引擎可能发现更多端点）。通过 stdin 方式在 Docker 中执行。
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
                  <span className={styles.fieldHint}>跟随链接的层级深度</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>最大 URL 数</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.hakrawlerMaxUrls}
                    onChange={(e) => updateField('hakrawlerMaxUrls', parseInt(e.target.value) || 500)}
                    min={1}
                  />
                  <span className={styles.fieldHint}>最多收集的 URL 数量（达到上限后会终止进程）</span>
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
                  <span className={styles.fieldHint}>单个 URL 的爬取超时</span>
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Parallelism</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.hakrawlerParallelism ?? 4}
                    onChange={(e) => updateField('hakrawlerParallelism', parseInt(e.target.value) || 4)}
                    min={1}
                    max={10}
                  />
                  <span className={styles.fieldHint}>Number of URLs to crawl in parallel</span>
                </div>
              </div>

              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>选项</h3>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>包含子域名</span>
                    <p className={styles.toggleDescription}>允许跟随到目标子域名的链接（结果仍会按范围过滤）</p>
                  </div>
                  <Toggle
                    checked={data.hakrawlerIncludeSubs}
                    onChange={(checked) => updateField('hakrawlerIncludeSubs', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>忽略 TLS 校验</span>
                    <p className={styles.toggleDescription}>跳过 TLS 证书验证（适用于自签名证书）</p>
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
                  <textarea
                    className="textarea"
                    value={(data.hakrawlerCustomHeaders ?? []).join('\n')}
                    onChange={(e) => updateField('hakrawlerCustomHeaders', e.target.value.split('\n').filter(Boolean))}
                    placeholder="Cookie: session=abc123&#10;Authorization: Bearer token..."
                    rows={3}
                  />
                  <span className={styles.fieldHint}>每行一个请求头（例如：Cookie: value），会随每个请求发送</span>
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
