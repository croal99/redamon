'use client'

import { useState } from 'react'
import { ChevronDown, Link } from 'lucide-react'
import { Toggle } from '@/components/ui'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'
import { NodeInfoTooltip } from '../NodeInfoTooltip'
import { TimeEstimate } from '../TimeEstimate'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface GauSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
}

const PROVIDER_OPTIONS = ['wayback', 'commoncrawl', 'otx', 'urlscan']
const PROVIDER_LABELS: Record<string, string> = {
  wayback: 'Wayback（互联网档案馆）',
  commoncrawl: 'Common Crawl（公共爬取库）',
  otx: 'OTX（AlienVault）',
  urlscan: 'URLScan',
}

export function GauSection({ data, updateField }: GauSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  const toggleProvider = (provider: string) => {
    const current = data.gauProviders ?? []
    if (current.includes(provider)) {
      updateField('gauProviders', current.filter(p => p !== provider))
    } else {
      updateField('gauProviders', [...current, provider])
    }
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Link size={16} />
          GAU（GetAllUrls）被动发现
          <NodeInfoTooltip section="Gau" />
          <span className={styles.badgePassive}>被动</span>
        </h2>
        <div className={styles.sectionHeaderRight}>
          <div onClick={(e) => e.stopPropagation()}>
            <Toggle
              checked={data.gauEnabled}
              onChange={(checked) => updateField('gauEnabled', checked)}
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
            使用 GetAllUrls（GAU）进行被动 URL 发现。通过 Web 存档与威胁情报数据源检索历史 URL，不会直接触碰目标。可用归档数据补充 Katana 的主动爬取结果。
            GAU 本身无需任何 API Key。如需从 URLScan 获取更高限速与更多结果，可在 <strong>设置 &gt; 工具 API Keys</strong> 中配置 URLScan API Key。
          </p>

          {data.gauEnabled && (
            <>
              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>数据源</h3>
                <p className={styles.fieldHint} style={{ marginBottom: '0.5rem' }}>用于查询归档 URL 的数据来源</p>
                <div className={styles.checkboxGroup}>
                  {PROVIDER_OPTIONS.map(provider => (
                    <label key={provider} className="checkboxLabel">
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={(data.gauProviders ?? []).includes(provider)}
                        onChange={() => toggleProvider(provider)}
                      />
                      {PROVIDER_LABELS[provider] ?? provider}
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>最大 URL 数</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.gauMaxUrls}
                    onChange={(e) => updateField('gauMaxUrls', parseInt(e.target.value) || 1000)}
                    min={1}
                  />
                  <span className={styles.fieldHint}>每个域名最多拉取的 URL 数（0=不限）</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>超时（秒）</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.gauTimeout}
                    onChange={(e) => updateField('gauTimeout', parseInt(e.target.value) || 60)}
                    min={10}
                  />
                  <span className={styles.fieldHint}>每个数据源的请求超时</span>
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>线程数</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.gauThreads}
                    onChange={(e) => updateField('gauThreads', parseInt(e.target.value) || 5)}
                    min={1}
                    max={20}
                  />
                  <span className={styles.fieldHint}>并行拉取线程数</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>年份范围</label>
                  <input
                    type="text"
                    className="textInput"
                    value={(data.gauYearRange ?? []).join(', ')}
                    onChange={(e) => updateField('gauYearRange', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder="2020, 2024（留空=所有年份）"
                  />
                  <span className={styles.fieldHint}>按年份过滤 Wayback Machine（例如：2020, 2024）</span>
                </div>
              </div>

              <div className={styles.toggleRow}>
                <div>
                  <span className={styles.toggleLabel}>详细输出</span>
                  <p className={styles.toggleDescription}>启用详细日志，便于调试</p>
                </div>
                <Toggle
                  checked={data.gauVerbose}
                  onChange={(checked) => updateField('gauVerbose', checked)}
                />
              </div>

              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>黑名单扩展名</h3>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>要排除的文件扩展名</label>
                  <input
                    type="text"
                    className="textInput"
                    value={(data.gauBlacklistExtensions ?? []).join(', ')}
                    onChange={(e) => updateField('gauBlacklistExtensions', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder="png, jpg, css, pdf, zip"
                  />
                  <span className={styles.fieldHint}>跳过图片、字体与文档等静态资源</span>
                </div>
              </div>

              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>URL 验证</h3>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>验证 URL</span>
                    <p className={styles.toggleDescription}>通过 HTTP 检查确认归档 URL 是否仍存在，并过滤失效链接</p>
                    <TimeEstimate estimate="耗时约为 GAU 的 2–3 倍" />
                  </div>
                  <Toggle
                    checked={data.gauVerifyUrls}
                    onChange={(checked) => updateField('gauVerifyUrls', checked)}
                  />
                </div>

                {data.gauVerifyUrls && (
                  <>
                    <div className={styles.fieldRow}>
                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>验证超时</label>
                        <input
                          type="number"
                          className="textInput"
                          value={data.gauVerifyTimeout}
                          onChange={(e) => updateField('gauVerifyTimeout', parseInt(e.target.value) || 5)}
                          min={1}
                        />
                        <span className={styles.fieldHint}>每个 URL 检查的秒数</span>
                      </div>
                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>验证限速</label>
                        <input
                          type="number"
                          className="textInput"
                          value={data.gauVerifyRateLimit}
                          onChange={(e) => updateField('gauVerifyRateLimit', parseInt(e.target.value) || 100)}
                          min={1}
                        />
                        <span className={styles.fieldHint}>请求/秒</span>
                      </div>
                    </div>

                    <div className={styles.fieldRow}>
                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>验证线程数</label>
                        <input
                          type="number"
                          className="textInput"
                          value={data.gauVerifyThreads}
                          onChange={(e) => updateField('gauVerifyThreads', parseInt(e.target.value) || 50)}
                          min={1}
                          max={100}
                        />
                        <span className={styles.fieldHint}>并发验证线程数</span>
                      </div>
                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>验证 Docker 镜像</label>
                        <input
                          type="text"
                          className="textInput"
                          value={data.gauVerifyDockerImage}
                          disabled
                        />
                      </div>
                    </div>

                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>接受状态码</label>
                      <input
                        type="text"
                        className="textInput"
                        value={(data.gauVerifyAcceptStatus ?? []).join(', ')}
                        onChange={(e) => updateField('gauVerifyAcceptStatus', e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)))}
                        placeholder="200, 201, 301, 302, 307, 308, 401, 403"
                      />
                      <span className={styles.fieldHint}>用于判断 URL 存活的状态码。包含 401/403 以覆盖鉴权保护的端点</span>
                    </div>

                    <div className={styles.toggleRow}>
                      <div>
                        <span className={styles.toggleLabel}>探测 HTTP 方法</span>
                        <p className={styles.toggleDescription}>发送 OPTIONS 请求以发现允许的方法（GET/POST/PUT/DELETE）</p>
                        <TimeEstimate estimate="在验证耗时基础上 +30–50%" />
                      </div>
                      <Toggle
                        checked={data.gauDetectMethods}
                        onChange={(checked) => updateField('gauDetectMethods', checked)}
                      />
                    </div>

                    {data.gauDetectMethods && (
                      <div className={styles.fieldRow}>
                        <div className={styles.fieldGroup}>
                          <label className={styles.fieldLabel}>方法探测超时</label>
                          <input
                            type="number"
                            className="textInput"
                            value={data.gauMethodDetectTimeout}
                            onChange={(e) => updateField('gauMethodDetectTimeout', parseInt(e.target.value) || 5)}
                            min={1}
                          />
                          <span className={styles.fieldHint}>每个 OPTIONS 请求的秒数</span>
                        </div>
                        <div className={styles.fieldGroup}>
                          <label className={styles.fieldLabel}>方法探测限速</label>
                          <input
                            type="number"
                            className="textInput"
                            value={data.gauMethodDetectRateLimit}
                            onChange={(e) => updateField('gauMethodDetectRateLimit', parseInt(e.target.value) || 50)}
                            min={1}
                          />
                          <span className={styles.fieldHint}>请求/秒</span>
                        </div>
                        <div className={styles.fieldGroup}>
                          <label className={styles.fieldLabel}>方法探测线程数</label>
                          <input
                            type="number"
                            className="textInput"
                            value={data.gauMethodDetectThreads}
                            onChange={(e) => updateField('gauMethodDetectThreads', parseInt(e.target.value) || 25)}
                            min={1}
                          />
                          <span className={styles.fieldHint}>并发线程数</span>
                        </div>
                      </div>
                    )}

                    <div className={styles.toggleRow}>
                      <div>
                        <span className={styles.toggleLabel}>过滤失效端点</span>
                        <p className={styles.toggleDescription}>将返回 404/500/超时的 URL 从最终结果中剔除</p>
                      </div>
                      <Toggle
                        checked={data.gauFilterDeadEndpoints}
                        onChange={(checked) => updateField('gauFilterDeadEndpoints', checked)}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Docker 镜像</label>
                <input
                  type="text"
                  className="textInput"
                  value={data.gauDockerImage}
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
