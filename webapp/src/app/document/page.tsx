'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileUp, RefreshCw, Globe, Server, BrainCircuit } from 'lucide-react'
import { useProject } from '@/providers/ProjectProvider'
import { useToast } from '@/components/ui'
import styles from './page.module.css'

type ModelOption = {
  id: string
  name: string
  context_length: number | null
  description: string
}

type Knowledge = {
  document: {
    name: string
    kind: string
    sizeBytes: number
    pageCount?: number
    sheetNames?: string[]
  }
  summary: string
  keyPoints: string[]
  entities: Array<{ type: string; name: string; evidence?: string }>
  facts: Array<{ subject: string; predicate: string; object: string; evidence?: string }>
  tables?: Array<{ title?: string; columns: string[]; rows: Array<Array<string | number | null>> }>
  risks: Array<{ title: string; severity: 'low' | 'medium' | 'high' | 'critical'; rationale: string; evidence?: string }>
  suggestedQuestions: string[]
}

type AnalyzeResponse = {
  document: Knowledge['document']
  extraction: {
    text: string
    textTruncatedForLlm: boolean
    sheetPreviews?: Array<{ name: string; columns: string[]; rows: Array<Array<string | number | null>> }>
    imageDataUrl?: string
  }
  knowledge: Knowledge | null
  llmUsed: boolean
  llmError: string | null
  error?: string
}

function flattenModels(data: unknown): Array<{ provider: string; option: ModelOption }> {
  if (!data || typeof data !== 'object') return []
  const out: Array<{ provider: string; option: ModelOption }> = []
  for (const [provider, models] of Object.entries(data as Record<string, unknown>)) {
    if (!Array.isArray(models)) continue
    for (const m of models) {
      if (!m || typeof m !== 'object') continue
      const mm = m as Partial<ModelOption>
      if (typeof mm.id !== 'string' || typeof mm.name !== 'string') continue
      out.push({
        provider,
        option: {
          id: mm.id,
          name: mm.name,
          context_length: typeof mm.context_length === 'number' ? mm.context_length : null,
          description: typeof mm.description === 'string' ? mm.description : '',
        },
      })
    }
  }
  return out
}

function safeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export default function DocumentPage() {
  const router = useRouter()
  const toast = useToast()
  const { userId, currentProject } = useProject()

  const [models, setModels] = useState<Array<{ provider: string; option: ModelOption }>>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [model, setModel] = useState<string>('')

  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setModel(currentProject?.agentOpenaiModel || '')
  }, [currentProject?.agentOpenaiModel])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setModelsLoading(true)
    const params = `?userId=${encodeURIComponent(userId)}`
    fetch(`/api/models${params}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Failed to fetch models')))
      .then(data => {
        if (cancelled) return
        const flat = flattenModels(data)
        setModels(flat)
        if (!model && flat.length > 0) {
          setModel(flat[0].option.id)
        }
      })
      .catch(() => {
        if (!cancelled) setModels([])
      })
      .finally(() => {
        if (!cancelled) setModelsLoading(false)
      })
    return () => { cancelled = true }
  }, [userId, model])

  const defaultContext = useMemo(() => {
    const name = currentProject?.name || ''
    const target = currentProject?.targetDomain || ''
    return { projectName: name, targetDomain: target, ipMode: !!currentProject?.ipMode }
  }, [currentProject])

  const onPickFile = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const onFileChange = useCallback((f: File | null) => {
    setFile(f)
    setResult(null)
    setError(null)
  }, [])

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0] || null
    onFileChange(f)
  }, [onFileChange])

  const onAnalyze = useCallback(async () => {
    if (!file) {
      toast.warning('请选择一个文件')
      return
    }
    if (!userId) {
      toast.warning('请先登录并确保已加载用户信息')
      return
    }
    if (!model.trim()) {
      toast.warning('请选择或输入模型')
      return
    }

    setIsAnalyzing(true)
    setError(null)
    setResult(null)

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('userId', userId)
      fd.append('model', model.trim())
      if (defaultContext.projectName) fd.append('projectName', defaultContext.projectName)
      if (defaultContext.targetDomain) fd.append('targetDomain', defaultContext.targetDomain)

      const resp = await fetch('/api/documents/analyze', { method: 'POST', body: fd })
      const data = await resp.json().catch(() => null)
      if (!resp.ok) {
        const msg = data?.error || `HTTP ${resp.status}`
        throw new Error(msg)
      }
      setResult(data as AnalyzeResponse)
      if ((data as AnalyzeResponse).llmError) {
        toast.warning(`LLM 未输出结构化结果：${(data as AnalyzeResponse).llmError}`)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      toast.error(msg)
    } finally {
      setIsAnalyzing(false)
    }
  }, [file, userId, model, defaultContext, toast])

  const kpis = useMemo(() => {
    const knowledge = result?.knowledge
    const extractedTextLen = result?.extraction?.text ? result.extraction.text.length : 0
    return [
      { label: '文本字符', value: extractedTextLen, accent: extractedTextLen > 0 ? undefined : 'var(--text-tertiary)' },
      { label: '要点', value: knowledge?.keyPoints?.length ?? 0, accent: 'var(--accent-primary)' },
      { label: '实体', value: knowledge?.entities?.length ?? 0, accent: 'var(--accent-secondary)' },
      { label: '事实', value: knowledge?.facts?.length ?? 0, accent: 'var(--status-success)' },
      { label: '风险', value: knowledge?.risks?.length ?? 0, accent: 'var(--status-error)' },
    ]
  }, [result])

  const selectedModelLabel = useMemo(() => {
    const found = models.find(m => m.option.id === model)
    return found ? `${found.option.name} · ${found.provider}` : model
  }, [models, model])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Document Intelligence</h1>
          <p className={styles.subtitle}>多模态文档分析：从 PDF / Word / Excel / TXT / JPG 中提炼结构化知识，为渗透分析与风险研判提供认知支撑</p>
          {(defaultContext.projectName || defaultContext.targetDomain) && (
            <div className={styles.project}>
              {defaultContext.ipMode ? <Server size={14} /> : <Globe size={14} />}
              <span className={styles.projectName}>{defaultContext.projectName || '未选择项目'}</span>
              {defaultContext.targetDomain && (
                <>
                  <span className={styles.separator}>/</span>
                  <span className={styles.target}>{defaultContext.targetDomain}</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className={styles.headerRight}>
          <span className={styles.pill}>
            <BrainCircuit size={14} />
            {modelsLoading ? '加载模型…' : selectedModelLabel || '未选择模型'}
          </span>
          <button className="iconButton" onClick={() => router.push('/settings')} title="去配置全局 LLM Providers">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>输入</div>
        <div className="card">
          <div className="cardHeader">
            <div>
              <div className="cardTitle">上传文档并分析</div>
              <div className="cardSubtitle">支持 PDF / DOCX / XLSX / TXT / JPG / PNG / WEBP（最大 25MB）</div>
            </div>
          </div>
          <div className="cardBody">
            <div className={styles.uploadRow}>
              <div className={styles.inputGroup}>
                <div className={styles.label}>模型（Model ID）</div>
                <input
                  className={styles.modelInput}
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="例如：gpt-4o-mini 或 openrouter/xxx 或 custom/xxx"
                  list="doc-models"
                  spellCheck={false}
                />
                <datalist id="doc-models">
                  {models.map(m => (
                    <option key={`${m.provider}:${m.option.id}`} value={m.option.id}>
                      {m.option.name}
                    </option>
                  ))}
                </datalist>
              </div>

              <div
                className={styles.dropzone}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                role="button"
                tabIndex={0}
                onClick={onPickFile}
              >
                <div className={styles.dropzoneLeft}>
                  <FileUp size={18} />
                  <div style={{ minWidth: 0 }}>
                    <div className={styles.fileName}>{file ? file.name : '拖拽文件到此处，或点击选择'}</div>
                    <div className={styles.fileHint}>
                      {file ? `${Math.round(file.size / 1024)} KB` : '建议：包含目标域名、资产、漏洞说明、报告截图等非结构化材料'}
                    </div>
                  </div>
                </div>
                <button className="secondaryButton" onClick={(e) => { e.stopPropagation(); onPickFile() }}>
                  选择文件
                </button>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button className="primaryButton" onClick={onAnalyze} disabled={isAnalyzing}>
                  {isAnalyzing ? '分析中…' : '开始分析'}
                </button>
                <button
                  className="secondaryButton"
                  onClick={() => { onFileChange(null); setModel(currentProject?.agentOpenaiModel || model) }}
                  disabled={isAnalyzing}
                >
                  重置
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              accept=".pdf,.docx,.xlsx,.xls,.txt,.log,.md,.jpg,.jpeg,.png,.webp"
              onChange={(e) => onFileChange(e.target.files?.[0] || null)}
            />

            {error && <div className={styles.errorText} style={{ marginTop: 12 }}>{error}</div>}
            {result?.llmError && (
              <div className={styles.errorText} style={{ marginTop: 12 }}>
                {result.llmError}
              </div>
            )}
          </div>
        </div>
      </div>

      {result && (
        <>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>概览</div>
            <div className={styles.kpiGrid}>
              {kpis.map(k => (
                <div key={k.label} className="statCard">
                  <div className="statLabel">{k.label}</div>
                  <div className="statValue" style={k.accent ? { color: k.accent } : undefined}>{safeNumber(k.value)}</div>
                </div>
              ))}
            </div>
          </div>

          {(result.extraction.imageDataUrl || result.extraction.text) && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>提取</div>
              <div className={styles.grid2}>
                <div className="card">
                  <div className="cardHeader">
                    <div>
                      <div className="cardTitle">文本（预览）</div>
                      <div className="cardSubtitle">
                        {result.extraction.textTruncatedForLlm ? '用于 LLM 的文本已截断（前 45k 字符）' : '完整文本将用于分析（若支持）'}
                      </div>
                    </div>
                  </div>
                  <div className="cardBody">
                    <div className={styles.mono}>
                      {result.extraction.text ? result.extraction.text.slice(0, 4000) : '（无可提取文本，可能是图片或空文档）'}
                      {result.extraction.text && result.extraction.text.length > 4000 ? '\n\n…' : ''}
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="cardHeader">
                    <div>
                      <div className="cardTitle">图片（预览）</div>
                      <div className="cardSubtitle">当输入为 JPG/PNG/WEBP 时，将尝试使用支持视觉的模型提炼结构化知识</div>
                    </div>
                  </div>
                  <div className="cardBody">
                    {result.extraction.imageDataUrl ? (
                      <Image src={result.extraction.imageDataUrl} alt="document-preview" width={1200} height={800} className={styles.imgPreview} unoptimized />
                    ) : (
                      <div style={{ color: 'var(--text-tertiary)' }}>（非图片文件）</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={styles.section}>
            <div className={styles.sectionTitle}>结构化知识</div>
            <div className={styles.grid2}>
              <div className="card">
                <div className="cardHeader">
                  <div>
                    <div className="cardTitle">摘要</div>
                    <div className="cardSubtitle">用于快速理解文档意图与关键信息</div>
                  </div>
                </div>
                <div className="cardBody">
                  {result.knowledge?.summary ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {result.knowledge.summary}
                    </ReactMarkdown>
                  ) : (
                    <div style={{ color: 'var(--text-tertiary)' }}>
                      （未生成结构化摘要；请检查模型/Provider 配置，或尝试换一个支持更强的模型）
                    </div>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="cardHeader">
                  <div>
                    <div className="cardTitle">要点</div>
                    <div className="cardSubtitle">建议优先阅读的关键信息列表</div>
                  </div>
                </div>
                <div className="cardBody">
                  {result.knowledge?.keyPoints?.length ? (
                    <ol style={{ margin: 0, paddingLeft: 18 }}>
                      {result.knowledge.keyPoints.slice(0, 12).map((p, idx) => (
                        <li key={`${idx}-${p}`} style={{ marginBottom: 6 }}>{p}</li>
                      ))}
                    </ol>
                  ) : (
                    <div style={{ color: 'var(--text-tertiary)' }}>（暂无）</div>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.grid3}>
              <div className="card">
                <div className="cardHeader">
                  <div>
                    <div className="cardTitle">实体</div>
                    <div className="cardSubtitle">组织 / 系统 / IP / URL / 账号等可用于图谱与关联分析的对象</div>
                  </div>
                </div>
                <div className="cardBody">
                  {result.knowledge?.entities?.length ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {result.knowledge.entities.slice(0, 20).map((e, idx) => (
                        <div key={`${idx}-${e.type}-${e.name}`} className={styles.pill} style={{ justifyContent: 'space-between' }}>
                          <span>{e.type}: {e.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-tertiary)' }}>（暂无）</div>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="cardHeader">
                  <div>
                    <div className="cardTitle">风险</div>
                    <div className="cardSubtitle">从文档材料中推断的潜在安全风险与影响</div>
                  </div>
                </div>
                <div className="cardBody">
                  {result.knowledge?.risks?.length ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {result.knowledge.risks.slice(0, 12).map((r, idx) => (
                        <div key={`${idx}-${r.title}`} style={{ padding: 10, border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                            <div style={{ fontWeight: 600 }}>{r.title}</div>
                            <span className={styles.pill}>{r.severity}</span>
                          </div>
                          <div style={{ color: 'var(--text-secondary)', marginTop: 6 }}>{r.rationale}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-tertiary)' }}>（暂无）</div>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="cardHeader">
                  <div>
                    <div className="cardTitle">建议追问</div>
                    <div className="cardSubtitle">用于进一步澄清与补全证据链的问题</div>
                  </div>
                </div>
                <div className="cardBody">
                  {result.knowledge?.suggestedQuestions?.length ? (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {result.knowledge.suggestedQuestions.slice(0, 12).map((q, idx) => (
                        <li key={`${idx}-${q}`} style={{ marginBottom: 6 }}>{q}</li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ color: 'var(--text-tertiary)' }}>（暂无）</div>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.gridFull}>
              <div className="card">
                <div className="cardHeader">
                  <div>
                    <div className="cardTitle">事实三元组</div>
                    <div className="cardSubtitle">可直接落图（subject → predicate → object）的结构化陈述</div>
                  </div>
                </div>
                <div className="cardBody">
                  {result.knowledge?.facts?.length ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="dataTable" style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th>Subject</th>
                            <th>Predicate</th>
                            <th>Object</th>
                            <th>Evidence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.knowledge.facts.slice(0, 30).map((f, idx) => (
                            <tr key={`${idx}-${f.subject}-${f.predicate}-${f.object}`}>
                              <td>{f.subject}</td>
                              <td>{f.predicate}</td>
                              <td>{f.object}</td>
                              <td style={{ color: 'var(--text-tertiary)' }}>{f.evidence || ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-tertiary)' }}>（暂无）</div>
                  )}
                </div>
              </div>
            </div>

            {result.extraction.sheetPreviews?.length ? (
              <div className={styles.gridFull}>
                <div className="card">
                  <div className="cardHeader">
                    <div>
                      <div className="cardTitle">表格预览（Excel）</div>
                      <div className="cardSubtitle">仅展示前若干行列，完整内容会在服务端做摘要后用于结构化提炼</div>
                    </div>
                  </div>
                  <div className="cardBody">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {result.extraction.sheetPreviews.slice(0, 5).map((s) => (
                        <div key={s.name}>
                          <div style={{ fontWeight: 600, marginBottom: 8 }}>{s.name}</div>
                          <div style={{ overflowX: 'auto' }}>
                            <table className="dataTable" style={{ width: '100%' }}>
                              <thead>
                                <tr>
                                  {s.columns.slice(0, 12).map((c, idx) => <th key={`${s.name}-c-${idx}`}>{c}</th>)}
                                </tr>
                              </thead>
                              <tbody>
                                {s.rows.slice(0, 12).map((row, ridx) => (
                                  <tr key={`${s.name}-r-${ridx}`}>
                                    {row.slice(0, 12).map((cell, cidx) => <td key={`${s.name}-r-${ridx}-c-${cidx}`}>{cell === null ? '' : String(cell)}</td>)}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className={styles.gridFull}>
              <div className="card">
                <div className="cardHeader">
                  <div>
                    <div className="cardTitle">原始输出（JSON）</div>
                    <div className="cardSubtitle">用于调试与二次利用（复制到下游系统或图谱导入）</div>
                  </div>
                </div>
                <div className="cardBody">
                  <div className={styles.mono}>
                    {JSON.stringify(result.knowledge || { note: 'No structured knowledge returned', llmUsed: result.llmUsed, llmError: result.llmError }, null, 2)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
