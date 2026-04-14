'use client'

import { useState } from 'react'
import { ChevronDown, Search, Play } from 'lucide-react'
import { Toggle } from '@/components/ui'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'
import { NodeInfoTooltip } from '../NodeInfoTooltip'
import { TimeEstimate } from '../TimeEstimate'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface ArjunSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  onRun?: () => void
}

const METHOD_OPTIONS = ['GET', 'POST', 'JSON', 'XML']

const METHOD_LABELS: Record<string, string> = {
  GET: 'GET — 查询参数',
  POST: 'POST — 表单 Body',
  JSON: 'JSON — JSON Body',
  XML: 'XML — XML Body',
}

export function ArjunSection({ data, updateField, onRun }: ArjunSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  const toggleMethod = (method: string) => {
    const current = data.arjunMethods ?? ['GET']
    if (current.includes(method)) {
      // Don't allow deselecting the last method
      if (current.length <= 1) return
      updateField('arjunMethods', current.filter(m => m !== method))
    } else {
      updateField('arjunMethods', [...current, method])
    }
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Search size={16} />
          Arjun（参数发现）
          <NodeInfoTooltip section="Arjun" />
          <span className={styles.badgeActive}>主动</span>
          {data.arjunPassive && <span className={styles.badgePassive}>被动</span>}
        </h2>
        <div className={styles.sectionHeaderRight}>
          {onRun && data.arjunEnabled && (
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
              title="Run Arjun"
            >
              <Play size={10} /> Run partial recon
            </button>
          )}
          <div onClick={(e) => e.stopPropagation()}>
            <Toggle
              checked={data.arjunEnabled}
              onChange={(checked) => updateField('arjunEnabled', checked)}
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
            通过对已发现端点测试约 25,000 个常见参数名，发现隐藏的 HTTP 查询/请求体参数。可找到调试参数、后台功能入口与未在表单或 JavaScript 中显式出现的 API 输入点。多种方法可并行运行。
          </p>

          {data.arjunEnabled && (
            <>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>HTTP 方法</label>
                <p className={styles.fieldHint} style={{ marginBottom: '0.5rem' }}>选择要测试的参数位置；多个方法可并行执行。</p>
                <div className={styles.checkboxGroup}>
                  {METHOD_OPTIONS.map(method => (
                    <label key={method} className="checkboxLabel">
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={(data.arjunMethods ?? ['GET']).includes(method)}
                        onChange={() => toggleMethod(method)}
                      />
                      {METHOD_LABELS[method]}
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>最大端点数</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.arjunMaxEndpoints}
                    onChange={(e) => updateField('arjunMaxEndpoints', parseInt(e.target.value) || 50)}
                    min={1}
                    max={500}
                  />
                  <span className={styles.fieldHint}>最多测试的已发现端点数量（优先选择 API/动态端点）</span>
                  <TimeEstimate estimate="每个端点每种方法约 10 秒" />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>线程数</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.arjunThreads}
                    onChange={(e) => updateField('arjunThreads', parseInt(e.target.value) || 2)}
                    min={1}
                    max={20}
                  />
                  <span className={styles.fieldHint}>并发参数测试线程数</span>
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>请求超时（秒）</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.arjunTimeout}
                    onChange={(e) => updateField('arjunTimeout', parseInt(e.target.value) || 15)}
                    min={1}
                  />
                  <span className={styles.fieldHint}>单次请求超时</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>扫描超时（秒）</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.arjunScanTimeout}
                    onChange={(e) => updateField('arjunScanTimeout', parseInt(e.target.value) || 600)}
                    min={60}
                  />
                  <span className={styles.fieldHint}>每种方法的整体扫描超时</span>
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>分片大小</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.arjunChunkSize}
                    onChange={(e) => updateField('arjunChunkSize', parseInt(e.target.value) || 500)}
                    min={10}
                    max={5000}
                  />
                  <span className={styles.fieldHint}>每批请求测试的参数数量。越小请求越多、准确性越高</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>限速</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.arjunRateLimit}
                    onChange={(e) => updateField('arjunRateLimit', parseInt(e.target.value) || 0)}
                    min={0}
                  />
                  <span className={styles.fieldHint}>每秒最大请求数（0=不限）</span>
                </div>
              </div>

              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>选项</h3>

                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>稳定模式</span>
                    <p className={styles.toggleDescription}>在请求之间增加随机延迟，降低 WAF 识别风险</p>
                  </div>
                  <Toggle
                    checked={data.arjunStable}
                    onChange={(checked) => updateField('arjunStable', checked)}
                  />
                </div>

                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>被动模式</span>
                    <p className={styles.toggleDescription}>仅使用 CommonCrawl/OTX/WaybackMachine —— 不对目标发起主动请求</p>
                  </div>
                  <Toggle
                    checked={data.arjunPassive}
                    onChange={(checked) => updateField('arjunPassive', checked)}
                  />
                </div>

                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>禁用重定向</span>
                    <p className={styles.toggleDescription}>参数测试期间不跟随 HTTP 重定向</p>
                  </div>
                  <Toggle
                    checked={data.arjunDisableRedirects}
                    onChange={(checked) => updateField('arjunDisableRedirects', checked)}
                  />
                </div>
              </div>

              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>自定义请求头</h3>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>请求头</label>
                  <textarea
                    className="textarea"
                    value={(data.arjunCustomHeaders ?? []).join('\n')}
                    onChange={(e) => updateField('arjunCustomHeaders', e.target.value.split('\n').filter(Boolean))}
                    placeholder="Authorization: Bearer token123&#10;X-API-Key: key123"
                    rows={3}
                  />
                  <span className={styles.fieldHint}>用于携带鉴权 Token 或自定义请求头，以测试需要登录的接口</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
