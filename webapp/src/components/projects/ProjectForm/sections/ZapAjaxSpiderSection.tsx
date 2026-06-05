'use client'

import { useState } from 'react'
import { ChevronDown, Play, Radar } from 'lucide-react'
import { Toggle } from '@/components/ui'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'
import { NodeInfoTooltip } from '../NodeInfoTooltip'
import { TimeEstimate } from '../TimeEstimate'
import { FileImportButton } from '../FileImportButton'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface ZapAjaxSpiderSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  onRun?: () => void
}

export function ZapAjaxSpiderSection({ data, updateField, onRun }: ZapAjaxSpiderSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Radar size={16} />
          ZAP Ajax Spider
          <NodeInfoTooltip section="ZapAjaxSpider" />
          <span className={styles.badgeActive}>主动</span>
        </h2>
        <div className={styles.sectionHeaderRight}>
          {onRun && data.zapAjaxSpiderEnabled && (
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
              title="运行 ZAP Ajax Spider"
            >
              <Play size={10} /> 运行部分侦察
            </button>
          )}
          <div onClick={(e) => e.stopPropagation()}>
            <Toggle
              checked={data.zapAjaxSpiderEnabled}
              onChange={(checked) => updateField('zapAjaxSpiderEnabled', checked)}
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
            使用 OWASP ZAP 的浏览器驱动 Ajax Spider 进行爬取。可发现仅在执行 JavaScript、SPA 路由变化以及认证态浏览器请求之后才出现的 API 端点。
          </p>

          {data.zapAjaxSpiderEnabled && (
            <>
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>种子模式</label>
                  <select
                    className="select"
                    value={data.zapAjaxSpiderSeedMode}
                    onChange={(e) => updateField('zapAjaxSpiderSeedMode', e.target.value)}
                  >
                    <option value="base_urls">仅 BaseURL</option>
                    <option value="base_urls_and_endpoints">BaseURL + Endpoint</option>
                  </select>
                  <span className={styles.fieldHint}>若前置爬虫已发现路由，启用 Endpoint 作为种子可提升 SPA/API 覆盖率</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>浏览器</label>
                  <select
                    className="select"
                    value={data.zapAjaxSpiderBrowserId}
                    onChange={(e) => updateField('zapAjaxSpiderBrowserId', e.target.value)}
                  >
                    <option value="firefox-headless">firefox-headless</option>
                    <option value="chrome-headless">chrome-headless</option>
                    <option value="firefox">firefox</option>
                  </select>
                  <span className={styles.fieldHint}>容器化侦察建议使用 headless 浏览器</span>
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>最大时长（分钟）</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.zapAjaxSpiderMaxDuration}
                    onChange={(e) => updateField('zapAjaxSpiderMaxDuration', parseInt(e.target.value) || 10)}
                    min={1}
                  />
                  <span className={styles.fieldHint}>每个种子 URL 的 Ajax Spider 最大运行时间</span>
                  <TimeEstimate estimate="对 SPA 而言，10 分钟/种子是常用默认值；认证应用通常需要更久" />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>并行度</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.zapAjaxSpiderParallelism}
                    onChange={(e) => updateField('zapAjaxSpiderParallelism', parseInt(e.target.value) || 3)}
                    min={1}
                    max={10}
                  />
                  <span className={styles.fieldHint}>同时爬取的种子 URL 数量</span>
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>最大爬取深度</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.zapAjaxSpiderMaxCrawlDepth}
                    onChange={(e) => updateField('zapAjaxSpiderMaxCrawlDepth', parseInt(e.target.value) || 5)}
                    min={1}
                  />
                  <span className={styles.fieldHint}>ZAP 从每个种子出发沿浏览器交互路径跟随的深度</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>最大爬取状态数</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.zapAjaxSpiderMaxCrawlStates}
                    onChange={(e) => updateField('zapAjaxSpiderMaxCrawlStates', parseInt(e.target.value) || 0)}
                    min={0}
                  />
                  <span className={styles.fieldHint}>每个种子最多发现的浏览器状态数（0 = 不限制）</span>
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>浏览器数量</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.zapAjaxSpiderNumberOfBrowsers}
                    onChange={(e) => updateField('zapAjaxSpiderNumberOfBrowsers', parseInt(e.target.value) || 1)}
                    min={1}
                    max={10}
                  />
                  <span className={styles.fieldHint}>ZAP 内部并行运行的浏览器实例数</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>最大 URL 数</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.zapAjaxSpiderMaxUrls}
                    onChange={(e) => updateField('zapAjaxSpiderMaxUrls', parseInt(e.target.value) || 5000)}
                    min={1}
                  />
                  <span className={styles.fieldHint}>写入图谱的最大范围内 URL 数量</span>
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>事件等待（ms）</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.zapAjaxSpiderEventWait}
                    onChange={(e) => updateField('zapAjaxSpiderEventWait', parseInt(e.target.value) || 1000)}
                    min={0}
                  />
                  <span className={styles.fieldHint}>浏览器事件后等待，以便 JavaScript 请求完成</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>刷新等待（ms）</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.zapAjaxSpiderReloadWait}
                    onChange={(e) => updateField('zapAjaxSpiderReloadWait', parseInt(e.target.value) || 1000)}
                    min={0}
                  />
                  <span className={styles.fieldHint}>页面刷新与导航切换后等待</span>
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>范围检查</label>
                <select
                  className="select"
                  value={data.zapAjaxSpiderScopeCheck}
                  onChange={(e) => updateField('zapAjaxSpiderScopeCheck', e.target.value)}
                >
                  <option value="Strict">严格</option>
                  <option value="Flexible">灵活</option>
                </select>
                <span className={styles.fieldHint}>严格：尽量贴近配置的 BaseURL；灵活：允许更广的范围内跳转</span>
              </div>

              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>浏览器交互</h3>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>点击默认元素</span>
                    <p className={styles.toggleDescription}>在浏览器爬取过程中点击常见链接、按钮与交互控件</p>
                  </div>
                  <Toggle
                    checked={data.zapAjaxSpiderClickDefaultElems}
                    onChange={(checked) => updateField('zapAjaxSpiderClickDefaultElems', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>元素仅点击一次</span>
                    <p className={styles.toggleDescription}>避免重复点击同一元素，减少循环与重复流量</p>
                  </div>
                  <Toggle
                    checked={data.zapAjaxSpiderClickElemsOnce}
                    onChange={(checked) => updateField('zapAjaxSpiderClickElemsOnce', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>随机输入</span>
                    <p className={styles.toggleDescription}>为基础表单输入填充生成值，以暴露更多请求路径</p>
                  </div>
                  <Toggle
                    checked={data.zapAjaxSpiderRandomInputs}
                    onChange={(checked) => updateField('zapAjaxSpiderRandomInputs', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>避免退出登录</span>
                    <p className={styles.toggleDescription}>在认证态浏览器爬取中尽量避免触发退出登录操作</p>
                  </div>
                  <Toggle
                    checked={data.zapAjaxSpiderLogoutAvoidance}
                    onChange={(checked) => updateField('zapAjaxSpiderLogoutAvoidance', checked)}
                  />
                </div>
              </div>

              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>自定义 Header 与 Cookie</h3>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>请求 Header 行</label>
                  <div className={styles.fileImportWrap}>
                    <textarea
                      className="textarea"
                      value={(data.zapAjaxSpiderCustomHeaders ?? []).join('\n')}
                      onChange={(e) => updateField('zapAjaxSpiderCustomHeaders', e.target.value.split('\n').filter(Boolean))}
                      placeholder="Authorization: Bearer token123&#10;Cookie: session=abc; csrftoken=xyz"
                      rows={4}
                    />
                    <FileImportButton
                      variant="textarea"
                      fieldName="headers"
                      onImport={(values) => updateField('zapAjaxSpiderCustomHeaders', values)}
                    />
                  </div>
                  <span className={styles.fieldHint}>每行一个原始 header。内容仅在此显示，并会发送给 ZAP 用于认证态爬取。</span>
                </div>
              </div>

              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>排除模式</h3>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>要排除的 URL 模式</label>
                  <div className={styles.fileImportWrap}>
                    <textarea
                      className="textarea"
                      value={(data.zapAjaxSpiderExcludePatterns ?? []).join('\n')}
                      onChange={(e) => updateField('zapAjaxSpiderExcludePatterns', e.target.value.split('\n').filter(Boolean))}
                      placeholder="/logout&#10;/signout&#10;\\.png$&#10;\\.css$"
                      rows={5}
                    />
                    <FileImportButton
                      variant="textarea"
                      fieldName="exclude patterns"
                      onImport={(values) => updateField('zapAjaxSpiderExcludePatterns', values)}
                    />
                  </div>
                  <span className={styles.fieldHint}>用于排除登出路由、静态资源与噪声较大的浏览器路径的正则</span>
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Docker 镜像</label>
                <input
                  type="text"
                  className="textInput"
                  value={data.zapAjaxSpiderDockerImage}
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
