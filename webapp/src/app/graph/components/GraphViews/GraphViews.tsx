'use client'

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { Loader2, Sparkles, RefreshCw, Save, ListFilter } from 'lucide-react'
import { GraphCanvas } from '../GraphCanvas'
import { useDimensions } from '../../hooks'
import { useGraphViews } from '../../hooks/useGraphViews'
import type { GraphData, GraphNode } from '../../types'
import styles from './GraphViews.module.css'

interface GraphViewsProps {
  projectId: string
  userId: string
  modelConfigured: boolean
  is3D: boolean
  showLabels: boolean
  isDark: boolean
  onFilterCreated?: () => void
  onFilterCreatedAndSelect?: (filterId: string) => void
}

const EXAMPLE_QUERIES: { label: string; items: string[] }[] = [
  {
    label: '基础设施',
    items: [
      '解析到至少 4 个 IP 的所有子域名',
      '开放 443 端口的子域名及其技术',
      '运行在非标准端口（非 80 或 443）的所有服务',
      '开放 SSH（端口 22）的 IP 及其运行的服务',
      '具有 CNAME DNS 记录的子域名及其解析的 IP',
    ],
  },
  {
    label: '漏洞与 CVE',
    items: [
      '具有严重漏洞的 IP 及其开放端口',
      '具有已知 CVE 的技术及受影响的子域名',
      'nuclei 发现的所有严重和高危漏洞',
      '具有 CISA KEV 标记的 GVM 漏洞及其目标 IP',
      'CVSS 评分超过 9 的 CVE 及其影响的技术',
    ],
  },
  {
    label: 'Web 应用',
    items: [
      '所有具有可注入参数的端点',
      'TLS 证书过期或无效的 BaseURL',
      '在 JavaScript 文件中发现的密钥及其来源 URL',
      '缺少 X-Frame-Options 或 CSP 等安全头的 BaseURL',
    ],
  },
  {
    label: '威胁情报',
    items: [
      '出现在 OTX 威胁脉冲中的 IP 或域名及命名的攻击者',
      '与 IP 关联的恶意软件样本及相关的威胁脉冲',
      '侦察期间发现的外部域名及其发现方式',
    ],
  },
  {
    label: '攻击链',
    items: [
      '达到漏洞利用阶段的攻击链',
      '具有严重级别的链发现及产生它们的步骤',
      'GVM 确认的漏洞利用（ExploitGvm）及其目标 IP 和 CVE',
    ],
  },
]

export function GraphViews({
  projectId,
  userId,
  modelConfigured,
  is3D,
  showLabels,
  isDark,
  onFilterCreated,
  onFilterCreatedAndSelect,
}: GraphViewsProps) {
  const {
    createView,
    generateCypher,
    executeCypher,
  } = useGraphViews(projectId)

  const [nlQuery, setNlQuery] = useState('')
  const [viewName, setViewName] = useState('')
  const [generatedCypher, setGeneratedCypher] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<GraphData | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [examplesOpen, setExamplesOpen] = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const dimensions = useDimensions(canvasRef)

  useEffect(() => {
    if (!examplesOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setExamplesOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [examplesOpen])

  const handleGenerate = useCallback(async () => {
    if (!nlQuery.trim()) return
    setGenerating(true)
    setPreviewError(null)
    setGeneratedCypher(null)
    setPreviewData(null)

    const result = await generateCypher(nlQuery.trim(), userId)

    if ('error' in result) {
      setPreviewError(result.error)
      setGenerating(false)
      return
    }

    setGeneratedCypher(result.cypher)
    setViewName(nlQuery.trim().slice(0, 60))

    // Execute the generated cypher for preview
    setPreviewLoading(true)
    const execResult = await executeCypher(result.cypher)
    setGenerating(false)
    setPreviewLoading(false)

    if ('error' in execResult) {
      setPreviewError(execResult.error)
      setPreviewData(null)
    } else {
      setPreviewData({
        nodes: execResult.nodes || [],
        links: execResult.links || [],
        projectId,
      })
    }
  }, [nlQuery, userId, projectId, generateCypher, executeCypher])

  const handleRegenerate = useCallback(async () => {
    setGeneratedCypher(null)
    setPreviewData(null)
    setPreviewError(null)
    await handleGenerate()
  }, [handleGenerate])

  const handleSave = useCallback(async () => {
    if (!generatedCypher || !viewName.trim()) return
    setSaving(true)
    const result = await createView(viewName.trim(), nlQuery.trim(), generatedCypher)
    setSaving(false)
    if (result) {
      setNlQuery('')
      setViewName('')
      setGeneratedCypher(null)
      setPreviewData(null)
      setPreviewError(null)
      setSelectedNode(null)
      onFilterCreated?.()
    }
  }, [generatedCypher, viewName, nlQuery, createView, onFilterCreated])

  const handleSaveAndSelect = useCallback(async () => {
    if (!generatedCypher || !viewName.trim()) return
    setSaving(true)
    const result = await createView(viewName.trim(), nlQuery.trim(), generatedCypher)
    setSaving(false)
    if (result) {
      setNlQuery('')
      setViewName('')
      setGeneratedCypher(null)
      setPreviewData(null)
      setPreviewError(null)
      setSelectedNode(null)
      onFilterCreatedAndSelect?.(result.id)
    }
  }, [generatedCypher, viewName, nlQuery, createView, onFilterCreatedAndSelect])

  const handleDiscard = useCallback(() => {
    setNlQuery('')
    setViewName('')
    setGeneratedCypher(null)
    setPreviewData(null)
    setPreviewError(null)
    setSelectedNode(null)
  }, [])

  const handleExampleClick = useCallback((example: string) => {
    setNlQuery(example)
    setExamplesOpen(false)
  }, [])

  const nodeCount = useMemo(() => previewData?.nodes.length ?? 0, [previewData])

  return (
    <div className={styles.container}>
      <div className={styles.splitLayout}>
        {/* Left panel - form controls */}
        <div className={styles.leftPanel}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <h2 className={styles.title}>攻击面塑造器</h2>
              <span className={styles.subtitle}>
                用自然语言塑造攻击面，限定图谱映射、数据表和 AI 智能体的范围
              </span>
            </div>
          </div>

          {!modelConfigured && (
            <div className={styles.noLlmBanner}>
              <Sparkles size={14} />
              <span>在项目设置中配置 AI 模型，以使用自然语言塑造攻击面。</span>
            </div>
          )}

          <div className={styles.createForm}>
            <div className={styles.labelRow}>
              <label className={styles.label}>描述您想塑造的攻击面</label>
              <div className={styles.examplesDropdown} ref={dropdownRef}>
                <button
                  className={styles.examplesToggle}
                  onClick={() => setExamplesOpen(o => !o)}
                  title="示例查询"
                  disabled={generating}
                >
                  <ListFilter size={13} />
                </button>
                {examplesOpen && (
                  <div className={styles.examplesMenu}>
                    {EXAMPLE_QUERIES.map((group, gi) => (
                      <div key={gi} className={styles.examplesGroup}>
                        <span className={styles.examplesGroupLabel}>{group.label}</span>
                        {group.items.map((item, ii) => (
                          <button
                            key={ii}
                            className={styles.examplesItem}
                            onClick={() => handleExampleClick(item)}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <textarea
              className={styles.textarea}
              placeholder="例如：所有具有严重漏洞的 IP 及其开放端口"
              value={nlQuery}
              onChange={e => setNlQuery(e.target.value)}
              rows={3}
              disabled={generating || !modelConfigured}
            />

            <div className={styles.generateRow}>
              <button
                className={styles.generateBtn}
                onClick={handleGenerate}
                disabled={!nlQuery.trim() || generating || !modelConfigured}
              >
                {generating ? (
                  <>
                    <Loader2 size={14} className={styles.spin} />
                    <span>生成中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>生成 Cypher</span>
                  </>
                )}
              </button>
            </div>

            {previewError && (
              <div className={styles.errorBanner}>
                <span>{previewError}</span>
                <button className={styles.retryBtn} onClick={handleRegenerate}>
                  <RefreshCw size={12} />
                  重试
                </button>
              </div>
            )}

            {generatedCypher && (
              <>
                <div className={styles.cypherBlock}>
                  <div className={styles.cypherHeader}>
                    <label className={styles.label}>已生成 Cypher</label>
                    <button className={styles.retryBtn} onClick={handleRegenerate}>
                      <RefreshCw size={12} />
                      重新生成
                    </button>
                  </div>
                  <pre className={styles.cypherCode}>{generatedCypher}</pre>
                </div>

                <div className={styles.saveRow}>
                  <input
                    className={styles.nameInput}
                    placeholder="攻击面名称"
                    value={viewName}
                    onChange={e => setViewName(e.target.value)}
                  />
                  <button
                    className={styles.saveBtn}
                    onClick={handleSave}
                    disabled={!viewName.trim() || saving}
                  >
                    {saving ? (
                      <Loader2 size={14} className={styles.spin} />
                    ) : (
                      <Save size={14} />
                    )}
                    <span>{saving ? '保存中...' : '保存'}</span>
                  </button>
                  <button
                    className={styles.saveSelectBtn}
                    onClick={handleSaveAndSelect}
                    disabled={!viewName.trim() || saving}
                  >
                    {saving ? (
                      <Loader2 size={14} className={styles.spin} />
                    ) : (
                      <Save size={14} />
                    )}
                    <span>{saving ? '保存中...' : '保存并选择'}</span>
                  </button>
                  <button className={styles.discardBtn} onClick={handleDiscard}>
                    丢弃
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right panel - graph preview */}
        <div className={styles.rightPanel}>
          <div className={styles.previewHeader}>
            <span className={styles.label}>
              预览 {nodeCount > 0 && `(${nodeCount} 个节点)`}
            </span>
          </div>
          <div ref={canvasRef} className={styles.previewCanvas}>
            <GraphCanvas
              data={previewData ?? undefined}
              isLoading={previewLoading}
              error={previewError ? new Error(previewError) : null}
              projectId={projectId}
              is3D={is3D}
              width={dimensions.width}
              height={dimensions.height}
              showLabels={showLabels}
              selectedNode={selectedNode}
              onNodeClick={setSelectedNode}
              isDark={isDark}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
