'use client'

import { useState } from 'react'
import { Bug, ChevronDown, Play } from 'lucide-react'
import { Toggle } from '@/components/ui'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'
import { NodeInfoTooltip } from '../NodeInfoTooltip'
import { TimeEstimate } from '../TimeEstimate'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface KatanaSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  onRun?: () => void
}

export function KatanaSection({ data, updateField, onRun }: KatanaSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Bug size={16} />
          Katana Web 爬虫（DAST）
          <NodeInfoTooltip section="Katana" />
          <span className={styles.badgeActive}>主动</span>
        </h2>
        <div className={styles.sectionHeaderRight}>
          {onRun && data.katanaEnabled && (
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
              title="Run Katana Web Crawler"
            >
              <Play size={10} /> Run partial recon
            </button>
          )}
          <div onClick={(e) => e.stopPropagation()}>
            <Toggle
              checked={data.katanaEnabled}
              onChange={(checked) => updateField('katanaEnabled', checked)}
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
            使用 ProjectDiscovery Katana 进行主动 Web 爬取。通过跟随链接并解析 JavaScript 来发现 URL、端点与参数。带参数的 URL 会输入到 Nuclei DAST 模式用于漏洞 fuzz。
          </p>

          {data.katanaEnabled && (
            <>
          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>爬取深度</label>
              <input
                type="number"
                className="textInput"
                value={data.katanaDepth}
                onChange={(e) => updateField('katanaDepth', parseInt(e.target.value) || 2)}
                min={1}
                max={10}
              />
              <span className={styles.fieldHint}>跟随链接的层级深度。越大 URL 越多，但越慢</span>
              <TimeEstimate estimate="每增加 1 层约增加 50% 耗时（深度 3 约为深度 2 的 2 倍）" />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>最大 URL 数</label>
              <input
                type="number"
                className="textInput"
                value={data.katanaMaxUrls}
                onChange={(e) => updateField('katanaMaxUrls', parseInt(e.target.value) || 300)}
                min={1}
              />
              <span className={styles.fieldHint}>每个域名最多收集的 URL 数量</span>
              <TimeEstimate estimate="300 URLs：约 1–2 分钟/域名 | 1000+：近似线性增长" />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>限速</label>
              <input
                type="number"
                className="textInput"
                value={data.katanaRateLimit}
                onChange={(e) => updateField('katanaRateLimit', parseInt(e.target.value) || 50)}
                min={1}
              />
              <span className={styles.fieldHint}>请求/秒，用于避免给目标造成过大压力</span>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>超时（秒）</label>
              <input
                type="number"
                className="textInput"
                value={data.katanaTimeout}
                onChange={(e) => updateField('katanaTimeout', parseInt(e.target.value) || 3600)}
                min={60}
              />
              <span className={styles.fieldHint}>整体爬取超时（默认：60 分钟）</span>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Parallelism</label>
              <input
                type="number"
                className="textInput"
                value={data.katanaParallelism ?? 5}
                onChange={(e) => updateField('katanaParallelism', parseInt(e.target.value) || 5)}
                min={1}
                max={50}
              />
              <span className={styles.fieldHint}>Number of target URLs to crawl simultaneously</span>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Concurrency</label>
              <input
                type="number"
                className="textInput"
                value={data.katanaConcurrency ?? 10}
                onChange={(e) => updateField('katanaConcurrency', parseInt(e.target.value) || 10)}
                min={1}
                max={50}
              />
              <span className={styles.fieldHint}>Concurrent fetchers per target URL</span>
            </div>
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>选项</h3>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>JavaScript 爬取</span>
                <p className={styles.toggleDescription}>解析 JS 文件以发现隐藏端点与 API 调用。更慢，但能找到更多 URL</p>
                <TimeEstimate estimate="耗时 +50–100%（使用无头浏览器）" />
              </div>
              <Toggle
                checked={data.katanaJsCrawl}
                onChange={(checked) => updateField('katanaJsCrawl', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>仅保留带参数 URL</span>
                <p className={styles.toggleDescription}>仅保留包含查询参数（?key=value）的 URL，用于 DAST fuzz</p>
              </div>
              <Toggle
                checked={data.katanaParamsOnly}
                onChange={(checked) => updateField('katanaParamsOnly', checked)}
              />
            </div>
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>排除规则</h3>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>要排除的 URL 规则</label>
              <textarea
                className="textarea"
                value={(data.katanaExcludePatterns ?? []).join('\n')}
                onChange={(e) => updateField('katanaExcludePatterns', e.target.value.split('\n').filter(Boolean))}
                placeholder="/_next/static&#10;.png&#10;.css&#10;/images/"
                rows={5}
              />
              <span className={styles.fieldHint}>
                跳过静态资源、图片与 CDN URL。它们通常不易受注入类攻击影响
              </span>
            </div>
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>自定义请求头</h3>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>请求头</label>
              <textarea
                className="textarea"
                value={(data.katanaCustomHeaders ?? []).join('\n')}
                onChange={(e) => updateField('katanaCustomHeaders', e.target.value.split('\n').filter(Boolean))}
                placeholder="User-Agent: Mozilla/5.0...&#10;Accept: text/html..."
                rows={3}
              />
              <span className={styles.fieldHint}>更接近浏览器的请求头有助于降低 DAST 爬取时的识别/拦截风险</span>
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Docker 镜像</label>
            <input
              type="text"
              className="textInput"
              value={data.katanaDockerImage}
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
