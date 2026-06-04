'use client'

import { useState } from 'react'
import { ChevronDown, Braces, Play } from 'lucide-react'
import { Toggle, WikiInfoButton } from '@/components/ui'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'
import { NodeInfoTooltip } from '../NodeInfoTooltip'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface GraphqlScanSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  projectId?: string
  mode?: 'create' | 'edit'
  onRun?: () => void
}

export function GraphqlScanSection({ data, updateField, projectId, mode, onRun }: GraphqlScanSectionProps) {
  const [isOpen, setIsOpen] = useState(true)
  const enabled = (data as any).graphqlSecurityEnabled ?? false
  const authType = (data as any).graphqlAuthType ?? ''

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Braces size={16} />
          GraphQL 安全扫描器
          <NodeInfoTooltip section="GraphqlScan" />
          <WikiInfoButton target="GraphqlScan" />
          <span className={styles.badgeActive}>主动</span>
        </h2>
        <div className={styles.sectionHeaderRight}>
          {onRun && enabled && (
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
              title="运行 GraphQL 安全扫描器"
            >
              <Play size={10} /> 运行部分侦察
            </button>
          )}
          <div onClick={(e) => e.stopPropagation()}>
            <Toggle
              checked={enabled}
              onChange={(checked) => updateField('graphqlSecurityEnabled' as any, checked)}
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
            主动式 GraphQL 安全扫描器：从爬取的 BaseURLs + Endpoints 中发现 GraphQL 端点，测试 introspection 暴露、提取 schema、检测敏感字段，并标记 mutation / proxy-path 类漏洞。会为已有 Endpoint 节点补充 <code> is_graphql</code> 与 schema 元数据，并为发现创建 Vulnerability 节点。
          </p>

          {enabled && (
            <>
              {/* Test Modules */}
              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>安全测试</h3>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>Introspection 测试</span>
                    <p className={styles.toggleDescription}>探测 <code>__schema</code> 以检测 introspection 是否暴露（低流量、偏被动）。</p>
                  </div>
                  <Toggle
                    checked={(data as any).graphqlIntrospectionTest ?? true}
                    onChange={(checked) => updateField('graphqlIntrospectionTest' as any, checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>校验 SSL</span>
                    <p className={styles.toggleDescription}>拒绝目标端点上的无效/自签名 TLS 证书。</p>
                  </div>
                  <Toggle
                    checked={(data as any).graphqlVerifySsl ?? true}
                    onChange={(checked) => updateField('graphqlVerifySsl' as any, checked)}
                  />
                </div>
              </div>

              {/* Execution Limits */}
              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>执行限制</h3>
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>超时（秒）</label>
                    <input
                      type="number"
                      className="textInput"
                      value={(data as any).graphqlTimeout ?? 30}
                      onChange={(e) => updateField('graphqlTimeout' as any, parseInt(e.target.value) || 30)}
                      min={1}
                      max={600}
                    />
                    <span className={styles.fieldHint}>每个端点的请求超时</span>
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>速率限制（req/s）</label>
                    <input
                      type="number"
                      className="textInput"
                      value={(data as any).graphqlRateLimit ?? 10}
                      onChange={(e) => updateField('graphqlRateLimit' as any, parseInt(e.target.value) || 10)}
                      min={0}
                      max={100}
                    />
                    <span className={styles.fieldHint}>0 = 不限。上限受 ROE_GLOBAL_MAX_RPS 约束。</span>
                  </div>
                </div>
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>并发数</label>
                    <input
                      type="number"
                      className="textInput"
                      value={(data as any).graphqlConcurrency ?? 5}
                      onChange={(e) => updateField('graphqlConcurrency' as any, parseInt(e.target.value) || 5)}
                      min={1}
                      max={20}
                    />
                    <span className={styles.fieldHint}>并行测试的端点数量</span>
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>查询深度上限</label>
                    <input
                      type="number"
                      className="textInput"
                      value={(data as any).graphqlDepthLimit ?? 10}
                      onChange={(e) => updateField('graphqlDepthLimit' as any, parseInt(e.target.value) || 10)}
                      min={1}
                      max={50}
                    />
                    <span className={styles.fieldHint}>Introspection 的最大嵌套深度</span>
                  </div>
                </div>
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>重试次数</label>
                    <input
                      type="number"
                      className="textInput"
                      value={(data as any).graphqlRetryCount ?? 3}
                      onChange={(e) => updateField('graphqlRetryCount' as any, parseInt(e.target.value) || 3)}
                      min={0}
                      max={10}
                    />
                    <span className={styles.fieldHint}>对 429/5xx 与网络错误进行重试（更适配 Cloudflare）</span>
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>重试退避（秒）</label>
                    <input
                      type="number"
                      step="0.1"
                      className="textInput"
                      value={(data as any).graphqlRetryBackoff ?? 2.0}
                      onChange={(e) => updateField('graphqlRetryBackoff' as any, parseFloat(e.target.value) || 2.0)}
                      min={0}
                    />
                    <span className={styles.fieldHint}>重试之间指数退避的基准值</span>
                  </div>
                </div>
              </div>

              {/* Custom Endpoints */}
              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>目标覆盖</h3>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>自定义端点</label>
                  <textarea
                    className="textInput"
                    rows={3}
                    placeholder="https://api.target.com/graphql, https://api.target.com/v1/graphql"
                    value={(data as any).graphqlEndpoints ?? ''}
                    onChange={(e) => updateField('graphqlEndpoints' as any, e.target.value)}
                  />
                  <span className={styles.fieldHint}>
                    逗号分隔的 GraphQL 端点 URL。留空则从爬取的 BaseURLs/Endpoints 自动发现（推荐）。
                  </span>
                </div>
              </div>

              {/* Authentication */}
              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>鉴权</h3>
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>鉴权类型</label>
                    <select
                      className="textInput"
                      value={authType}
                      onChange={(e) => updateField('graphqlAuthType' as any, e.target.value)}
                    >
                      <option value="">无</option>
                      <option value="bearer">Bearer Token</option>
                      <option value="basic">Basic（user:pass）</option>
                      <option value="cookie">Cookie</option>
                      <option value="custom">自定义 Header</option>
                    </select>
                    <span className={styles.fieldHint}>请求头会附加到每个 GraphQL 请求</span>
                  </div>
                  {authType && (
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>鉴权值</label>
                      <input
                        type="password"
                        className="textInput"
                        value={(data as any).graphqlAuthValue ?? ''}
                        onChange={(e) => updateField('graphqlAuthValue' as any, e.target.value)}
                        placeholder={
                          authType === 'bearer' ? 'eyJhbGci...' :
                          authType === 'basic' ? 'user:password' :
                          authType === 'cookie' ? 'session=abc123; csrf=xyz' :
                          authType === 'custom' ? 'secret-token-value' : ''
                        }
                      />
                      <span className={styles.fieldHint}>
                        {authType === 'basic' && '将自动进行 base64 编码'}
                        {authType !== 'basic' && '该值会按原样写入请求头'}
                      </span>
                    </div>
                  )}
                </div>
                {authType === 'custom' && (
                  <div className={styles.fieldRow}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>自定义 Header 名称</label>
                      <input
                        type="text"
                        className="textInput"
                        value={(data as any).graphqlAuthHeader ?? ''}
                        onChange={(e) => updateField('graphqlAuthHeader' as any, e.target.value)}
                        placeholder="X-Api-Key"
                      />
                      <span className={styles.fieldHint}>用于承载上方鉴权值的 Header 名称</span>
                    </div>
                  </div>
                )}
              </div>

              {/* graphql-cop External Scanner (Phase 2 §17) */}
              <GraphqlCopSubSection data={data} updateField={updateField} />
            </>
          )}
        </div>
      )}
    </div>
  )
}

interface GraphqlCopSubSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
}

function GraphqlCopSubSection({ data, updateField }: GraphqlCopSubSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const copEnabled = (data as any).graphqlCopEnabled ?? false

  return (
    <div className={styles.subSection}>
      <h3
        className={styles.subSectionTitle}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        onClick={() => setExpanded(!expanded)}
      >
        <ChevronDown
          size={14}
          style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 150ms' }}
        />
        graphql-cop 外部扫描器
        <span className={styles.badgeActive} style={{ fontSize: '9px' }}>主动</span>
        <span style={{
          fontSize: '9px', padding: '1px 6px', borderRadius: '3px',
          backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', fontWeight: 500,
        }}>
          12 项检查
        </span>
        {copEnabled && (
          <span style={{ fontSize: '9px', color: '#22c55e', fontWeight: 500 }}>已启用</span>
        )}
      </h3>

      {expanded && (
        <>
          <p className={styles.sectionDescription} style={{ marginTop: '8px' }}>
            基于 Docker 的外部配置错误扫描器（<code>dolevf/graphql-cop:1.14</code>）。对每个端点执行 12 项检查，包含 alias/batch/directive 的 DoS 探测、GraphiQL 检测、trace/debug 信息泄露、GET 方法 CSRF、未处理错误、字段建议等。流量为<strong>主动</strong> &mdash; 在 stealth 模式下会自动禁用 DoS 探测。Introspection 默认关闭，用于与上方原生扫描器去重。
          </p>

          <div className={styles.toggleRow}>
            <div>
              <span className={styles.toggleLabel}>启用 graphql-cop</span>
              <p className={styles.toggleDescription}>对每个端点执行一次 Docker-in-Docker 调用。默认关闭（需手动开启）。</p>
            </div>
            <Toggle
              checked={copEnabled}
              onChange={(checked) => updateField('graphqlCopEnabled' as any, checked)}
            />
          </div>

          {copEnabled && (
            <>
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Docker 镜像</label>
                  <input
                    type="text"
                    className="textInput"
                    value={(data as any).graphqlCopDockerImage ?? 'dolevf/graphql-cop:1.14'}
                    onChange={(e) => updateField('graphqlCopDockerImage' as any, e.target.value)}
                  />
                  <span className={styles.fieldHint}>默认固定为 1.14（DockerHub tag）。如使用自定义 fork 可在此覆盖。</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>超时（秒）</label>
                  <input
                    type="number"
                    className="textInput"
                    value={(data as any).graphqlCopTimeout ?? 120}
                    onChange={(e) => updateField('graphqlCopTimeout' as any, parseInt(e.target.value) || 120)}
                    min={10}
                    max={600}
                  />
                  <span className={styles.fieldHint}>每个端点的超时</span>
                </div>
              </div>

              <div className={styles.toggleRow}>
                <div>
                  <span className={styles.toggleLabel}>强制扫描</span>
                  <p className={styles.toggleDescription}>即使端点看起来不像 GraphQL 也执行检查（graphql-cop 的 <code>-f</code> 参数）。</p>
                </div>
                <Toggle
                  checked={(data as any).graphqlCopForceScan ?? false}
                  onChange={(checked) => updateField('graphqlCopForceScan' as any, checked)}
                />
              </div>
              <div className={styles.toggleRow}>
                <div>
                  <span className={styles.toggleLabel}>调试模式</span>
                  <p className={styles.toggleDescription}>每次请求添加 <code>X-GraphQL-Cop-Test</code> 请求头（graphql-cop 的 <code>-d</code> 参数）。</p>
                </div>
                <Toggle
                  checked={(data as any).graphqlCopDebug ?? false}
                  onChange={(checked) => updateField('graphqlCopDebug' as any, checked)}
                />
              </div>

              <h4 className={styles.subSectionTitle} style={{ marginTop: '16px', fontSize: '12px' }}>
                要运行的检查项
              </h4>
              <p className={styles.fieldHint} style={{ marginBottom: '8px' }}>
                每个开关对应 graphql-cop 的一个测试项。{' '}
                <strong>这些开关只会过滤报告中的发现 &mdash; DoS 流量仍会发出</strong>{' '}
                直到 graphql-cop 在 DockerHub 发布支持 <code>-e</code> 的版本（git main v1.15 已修补，尚未发布）。如需完全抑制某项测试的流量，请关闭上方的主开关 <em>启用 graphql-cop</em>。
              </p>

              {/* Info-leak + CSRF checks (low-noise) */}
              <div className={styles.toggleRow}>
                <div>
                  <span className={styles.toggleLabel}>字段建议（低 &mdash; 信息泄露）</span>
                  <p className={styles.toggleDescription}>&quot;Did you mean X?&quot; 错误即使在关闭 introspection 时也可能泄露 schema 字段。</p>
                </div>
                <Toggle
                  checked={(data as any).graphqlCopTestFieldSuggestions ?? true}
                  onChange={(checked) => updateField('graphqlCopTestFieldSuggestions' as any, checked)}
                />
              </div>
              <div className={styles.toggleRow}>
                <div>
                  <span className={styles.toggleLabel}>Introspection（高 &mdash; 信息泄露）</span>
                  <p className={styles.toggleDescription}>默认关闭 &mdash; 上方原生扫描器已覆盖该项。若需要去重验证可开启。</p>
                </div>
                <Toggle
                  checked={(data as any).graphqlCopTestIntrospection ?? false}
                  onChange={(checked) => updateField('graphqlCopTestIntrospection' as any, checked)}
                />
              </div>
              <div className={styles.toggleRow}>
                <div>
                  <span className={styles.toggleLabel}>GraphQL IDE / Playground（低）</span>
                  <p className={styles.toggleDescription}>检测暴露的 GraphiQL/Playground UI。</p>
                </div>
                <Toggle
                  checked={(data as any).graphqlCopTestGraphiql ?? true}
                  onChange={(checked) => updateField('graphqlCopTestGraphiql' as any, checked)}
                />
              </div>
              <div className={styles.toggleRow}>
                <div>
                  <span className={styles.toggleLabel}>GET 查询支持（中 &mdash; CSRF）</span>
                  <p className={styles.toggleDescription}>允许通过 GET 执行查询会带来 CSRF 风险。</p>
                </div>
                <Toggle
                  checked={(data as any).graphqlCopTestGetMethod ?? true}
                  onChange={(checked) => updateField('graphqlCopTestGetMethod' as any, checked)}
                />
              </div>
              <div className={styles.toggleRow}>
                <div>
                  <span className={styles.toggleLabel}>GET Mutation（中 &mdash; CSRF）</span>
                  <p className={styles.toggleDescription}>Mutation 可通过 GET 请求执行。</p>
                </div>
                <Toggle
                  checked={(data as any).graphqlCopTestGetMutation ?? true}
                  onChange={(checked) => updateField('graphqlCopTestGetMutation' as any, checked)}
                />
              </div>
              <div className={styles.toggleRow}>
                <div>
                  <span className={styles.toggleLabel}>POST url-encoded CSRF（中）</span>
                  <p className={styles.toggleDescription}>GraphQL 接受 <code>application/x-www-form-urlencoded</code> POST 请求。</p>
                </div>
                <Toggle
                  checked={(data as any).graphqlCopTestPostCsrf ?? true}
                  onChange={(checked) => updateField('graphqlCopTestPostCsrf' as any, checked)}
                />
              </div>
              <div className={styles.toggleRow}>
                <div>
                  <span className={styles.toggleLabel}>Trace Mode（信息 &mdash; 信息泄露）</span>
                  <p className={styles.toggleDescription}>Apollo tracing 扩展信息泄露。</p>
                </div>
                <Toggle
                  checked={(data as any).graphqlCopTestTraceMode ?? true}
                  onChange={(checked) => updateField('graphqlCopTestTraceMode' as any, checked)}
                />
              </div>
              <div className={styles.toggleRow}>
                <div>
                  <span className={styles.toggleLabel}>未处理错误（信息 &mdash; 信息泄露）</span>
                  <p className={styles.toggleDescription}>异常堆栈回显给客户端。</p>
                </div>
                <Toggle
                  checked={(data as any).graphqlCopTestUnhandledError ?? true}
                  onChange={(checked) => updateField('graphqlCopTestUnhandledError' as any, checked)}
                />
              </div>

              <div style={{
                marginTop: '12px', padding: '8px 12px', borderRadius: '4px',
                backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
                fontSize: '11px', color: '#f87171',
              }}>
                <strong>下方为 DoS 探测 &mdash; 流量噪声较大。</strong>关闭这些开关只会隐藏其发现，但探测流量仍会发出（见上方说明）。仅在 stealth 模式下会自动禁用。
              </div>

              <div className={styles.toggleRow}>
                <div>
                  <span className={styles.toggleLabel}>Alias Overloading（高 &mdash; DoS）</span>
                  <p className={styles.toggleDescription}>单次查询发送 101 个 alias 以绕过速率限制。</p>
                </div>
                <Toggle
                  checked={(data as any).graphqlCopTestAliasOverloading ?? true}
                  onChange={(checked) => updateField('graphqlCopTestAliasOverloading' as any, checked)}
                />
              </div>
              <div className={styles.toggleRow}>
                <div>
                  <span className={styles.toggleLabel}>数组批量查询（高 &mdash; DoS）</span>
                  <p className={styles.toggleDescription}>在一次 POST 中批量发送 10+ 个查询。</p>
                </div>
                <Toggle
                  checked={(data as any).graphqlCopTestBatchQuery ?? true}
                  onChange={(checked) => updateField('graphqlCopTestBatchQuery' as any, checked)}
                />
              </div>
              <div className={styles.toggleRow}>
                <div>
                  <span className={styles.toggleLabel}>Directive Overloading（高 &mdash; DoS）</span>
                  <p className={styles.toggleDescription}>发送 10+ 个重复 directive 以耗尽解析资源。</p>
                </div>
                <Toggle
                  checked={(data as any).graphqlCopTestDirectiveOverloading ?? true}
                  onChange={(checked) => updateField('graphqlCopTestDirectiveOverloading' as any, checked)}
                />
              </div>
              <div className={styles.toggleRow}>
                <div>
                  <span className={styles.toggleLabel}>Introspection 循环查询（高 &mdash; DoS）</span>
                  <p className={styles.toggleDescription}>深度嵌套 introspection 以触发递归 DoS。</p>
                </div>
                <Toggle
                  checked={(data as any).graphqlCopTestCircularIntrospection ?? true}
                  onChange={(checked) => updateField('graphqlCopTestCircularIntrospection' as any, checked)}
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
