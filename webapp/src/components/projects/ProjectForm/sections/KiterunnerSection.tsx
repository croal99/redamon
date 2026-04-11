'use client'

import { useState } from 'react'
import { ChevronDown, Zap } from 'lucide-react'
import { Toggle } from '@/components/ui'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'
import { NodeInfoTooltip } from '../NodeInfoTooltip'
import { TimeEstimate } from '../TimeEstimate'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface KiterunnerSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
}

export function KiterunnerSection({ data, updateField }: KiterunnerSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Zap size={16} />
          Kiterunner API 发现
          <NodeInfoTooltip section="Kiterunner" />
          <span className={styles.badgeActive}>主动</span>
        </h2>
        <div className={styles.sectionHeaderRight}>
          <div onClick={(e) => e.stopPropagation()}>
            <Toggle
              checked={data.kiterunnerEnabled}
              onChange={(checked) => updateField('kiterunnerEnabled', checked)}
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
            使用 Assetnote 的 Kiterunner 对 API 端点进行爆破。通过基于真实世界 Swagger/OpenAPI 规范生成的综合字典测试，发现隐藏的 REST API 路由。
          </p>

          {data.kiterunnerEnabled && (
            <>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>字典</label>
                <select
                  className="select"
                  value={data.kiterunnerWordlists[0] || 'routes-large'}
                  onChange={(e) => updateField('kiterunnerWordlists', [e.target.value])}
                >
                  <option value="routes-large">routes-large（约 10 万 API 路由）</option>
                  <option value="routes-small">routes-small（约 2 万 API 路由）</option>
                </select>
                <span className={styles.fieldHint}>来自 Assetnote CDN 的 API 路由字典。自定义 .kite 文件可通过 CLI 使用</span>
                <TimeEstimate estimate="routes-large：约 10–30 分钟/端点 | routes-small：约 5–10 分钟" />
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>限速</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.kiterunnerRateLimit}
                    onChange={(e) => updateField('kiterunnerRateLimit', parseInt(e.target.value) || 100)}
                    min={1}
                  />
                  <span className={styles.fieldHint}>请求/秒。越低越隐蔽</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>连接数</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.kiterunnerConnections}
                    onChange={(e) => updateField('kiterunnerConnections', parseInt(e.target.value) || 100)}
                    min={1}
                  />
                  <span className={styles.fieldHint}>每个目标的并发连接数</span>
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>超时（秒）</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.kiterunnerTimeout}
                    onChange={(e) => updateField('kiterunnerTimeout', parseInt(e.target.value) || 10)}
                    min={1}
                  />
                  <span className={styles.fieldHint}>单次请求超时</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>扫描超时（秒）</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.kiterunnerScanTimeout}
                    onChange={(e) => updateField('kiterunnerScanTimeout', parseInt(e.target.value) || 1000)}
                    min={60}
                  />
                  <span className={styles.fieldHint}>整体扫描超时。大字典需要更长时间</span>
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>线程数</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.kiterunnerThreads}
                    onChange={(e) => updateField('kiterunnerThreads', parseInt(e.target.value) || 50)}
                    min={1}
                  />
                  <span className={styles.fieldHint}>并行扫描线程数</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>最小内容长度</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.kiterunnerMinContentLength}
                    onChange={(e) => updateField('kiterunnerMinContentLength', parseInt(e.target.value) || 0)}
                    min={0}
                  />
                  <span className={styles.fieldHint}>忽略小于该值（字节）的响应</span>
                </div>
              </div>

              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>状态码过滤</h3>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>忽略状态码</label>
                  <input
                    type="text"
                    className="textInput"
                    value={(data.kiterunnerIgnoreStatus ?? []).join(', ')}
                    onChange={(e) => updateField('kiterunnerIgnoreStatus', e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)))}
                    placeholder="（留空=仅使用白名单）"
                  />
                  <span className={styles.fieldHint}>黑名单：过滤常见错误带来的噪声</span>
                </div>
                <div className={styles.fieldGroup} style={{ marginTop: '1rem' }}>
                  <label className={styles.fieldLabel}>匹配状态码</label>
                  <input
                    type="text"
                    className="textInput"
                    value={(data.kiterunnerMatchStatus ?? []).join(', ')}
                    onChange={(e) => updateField('kiterunnerMatchStatus', e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)))}
                    placeholder="200, 201, 204, 301, 302, 401, 403, 405"
                  />
                  <span className={styles.fieldHint}>白名单：仅显示这些状态码的端点（包含鉴权保护的 401/403）</span>
                </div>
              </div>

              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>自定义请求头</h3>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>请求头</label>
                  <textarea
                    className="textarea"
                    value={(data.kiterunnerHeaders ?? []).join('\n')}
                    onChange={(e) => updateField('kiterunnerHeaders', e.target.value.split('\n').filter(Boolean))}
                    placeholder="Authorization: Bearer token123&#10;X-API-Key: key123"
                    rows={3}
                  />
                  <span className={styles.fieldHint}>用于携带鉴权 Token，便于扫描需要登录的 API</span>
                </div>
              </div>

              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>方法探测</h3>
                <p className={styles.fieldHint} style={{ marginBottom: '0.5rem' }}>Kiterunner 字典通常只包含 GET 路由。对已发现端点进一步探测 POST/PUT/DELETE 方法</p>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>探测方法</span>
                    <p className={styles.toggleDescription}>发现除 GET 之外的其他 HTTP 方法</p>
                    <TimeEstimate estimate="扫描耗时 +30–50%" />
                  </div>
                  <Toggle
                    checked={data.kiterunnerDetectMethods}
                    onChange={(checked) => updateField('kiterunnerDetectMethods', checked)}
                  />
                </div>

                {data.kiterunnerDetectMethods && (
                  <>
                    <div className={styles.fieldGroup} style={{ marginTop: '0.75rem' }}>
                      <label className={styles.fieldLabel}>探测模式</label>
                      <select
                        className="select"
                        value={data.kiterunnerMethodDetectionMode}
                        onChange={(e) => updateField('kiterunnerMethodDetectionMode', e.target.value)}
                      >
                        <option value="bruteforce">暴力枚举：逐个尝试方法（更慢，更准确）</option>
                        <option value="options">OPTIONS：解析 Allow 头（更快）</option>
                      </select>
                      <span className={styles.fieldHint}>用于发现允许的 HTTP 方法</span>
                    </div>
                    <div className={styles.fieldGroup} style={{ marginTop: '0.75rem' }}>
                      <label className={styles.fieldLabel}>暴力枚举方法列表</label>
                      <input
                        type="text"
                        className="textInput"
                        value={(data.kiterunnerBruteforceMethods ?? []).join(', ')}
                        onChange={(e) =>
                          updateField(
                            'kiterunnerBruteforceMethods',
                            e.target.value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
                          )
                        }
                        placeholder="POST, PUT, DELETE, PATCH"
                      />
                      <span className={styles.fieldHint}>暴力模式下要尝试的 HTTP 方法</span>
                    </div>
                    <div className={styles.fieldRow} style={{ marginTop: '0.75rem' }}>
                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>方法探测超时</label>
                        <input
                          type="number"
                          className="textInput"
                          value={data.kiterunnerMethodDetectTimeout}
                          onChange={(e) => updateField('kiterunnerMethodDetectTimeout', parseInt(e.target.value) || 5)}
                          min={1}
                        />
                        <span className={styles.fieldHint}>单次请求秒数</span>
                      </div>
                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>方法探测限速</label>
                        <input
                          type="number"
                          className="textInput"
                          value={data.kiterunnerMethodDetectRateLimit}
                          onChange={(e) => updateField('kiterunnerMethodDetectRateLimit', parseInt(e.target.value) || 50)}
                          min={1}
                        />
                        <span className={styles.fieldHint}>请求/秒</span>
                      </div>
                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>方法探测线程数</label>
                        <input
                          type="number"
                          className="textInput"
                          value={data.kiterunnerMethodDetectThreads}
                          onChange={(e) => updateField('kiterunnerMethodDetectThreads', parseInt(e.target.value) || 25)}
                          min={1}
                        />
                        <span className={styles.fieldHint}>并发线程数</span>
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
