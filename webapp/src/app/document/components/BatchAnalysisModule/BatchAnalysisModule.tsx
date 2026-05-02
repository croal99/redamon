'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import styles from './BatchAnalysisModule.module.css'

type TaskStatus = 'queued' | 'processing' | 'done' | 'error'

type TaskRow = {
  id: string
  file: File
  status: TaskStatus
  progress: number
  outputSummary?: string
  outputStats?: string
  error?: string
}

/**
 * Batch analysis UI wired to a mock backend route that simulates multimodal AI processing.
 */
export function BatchAnalysisModule() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [model, setModel] = useState<string>('mock-multimodal-ai')
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [busy, setBusy] = useState(false)

  const queuedCount = useMemo(() => tasks.filter(t => t.status === 'queued').length, [tasks])
  const hasTasks = tasks.length > 0

  const onPickFiles = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const onFilesSelected = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return
    const next: TaskRow[] = Array.from(files).map((f) => ({
      id: `${f.name}:${f.size}:${f.lastModified}`,
      file: f,
      status: 'queued',
      progress: 0,
    }))
    setTasks(prev => {
      const existing = new Set(prev.map(p => p.id))
      return [...prev, ...next.filter(n => !existing.has(n.id))]
    })
  }, [])

  const setTask = useCallback((id: string, patch: Partial<TaskRow>) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)))
  }, [])

  const clearAll = useCallback(() => {
    if (busy) return
    setTasks([])
  }, [busy])

  const analyzeOne = useCallback(async (task: TaskRow) => {
    setTask(task.id, { status: 'processing', progress: 10, error: undefined })

    try {
      const fd = new FormData()
      fd.append('file', task.file)
      fd.append('model', model.trim() || 'mock-multimodal-ai')

      setTask(task.id, { progress: 40 })
      const res = await fetch('/api/documents/mock-analyze', { method: 'POST', body: fd })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const msg = data?.error || `HTTP ${res.status}`
        throw new Error(msg)
      }

      const summary = data?.knowledge?.summary ? String(data.knowledge.summary) : '（无摘要）'
      const entitiesCount = Array.isArray(data?.knowledge?.entities) ? data.knowledge.entities.length : 0
      const factsCount = Array.isArray(data?.knowledge?.facts) ? data.knowledge.facts.length : 0
      const risksCount = Array.isArray(data?.knowledge?.risks) ? data.knowledge.risks.length : 0
      const keyPointsCount = Array.isArray(data?.knowledge?.keyPoints) ? data.knowledge.keyPoints.length : 0

      setTask(task.id, {
        status: 'done',
        progress: 100,
        outputSummary: summary,
        outputStats: `要点:${keyPointsCount} 实体:${entitiesCount} 事实:${factsCount} 风险:${risksCount}`,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setTask(task.id, { status: 'error', progress: 100, error: msg })
    }
  }, [model, setTask])

  const analyzeAll = useCallback(async () => {
    if (busy) return
    const pending = tasks.filter(t => t.status === 'queued')
    if (pending.length === 0) return

    setBusy(true)
    try {
      for (const t of pending) {
        await analyzeOne(t)
      }
    } finally {
      setBusy(false)
    }
  }, [analyzeOne, busy, tasks])

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.title}>📁 批量分析</div>
        <div className={styles.subtitle}>使用后端模拟接口，返回“AI 处理多模态文件”的结构化结果（用于联调/演示）</div>
      </div>

      <div className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">导入</div>
            <div className="cardSubtitle">支持多文件选择；将调用 /api/documents/mock-analyze 逐个模拟处理</div>
          </div>
        </div>
        <div className="cardBody">
          <div className={styles.dropzone}>
            <div>
              <div className={styles.dropTitle}>拖拽文件到此处</div>
              <div className={styles.dropHint}>或点击选择多个文件（PDF/DOCX/XLSX/TXT/JPG/PNG/WEBP）</div>
            </div>
            <button className="secondaryButton" onClick={onPickFiles} disabled={busy}>选择文件</button>
          </div>

          <div className={styles.controls}>
            <div className={styles.field}>
              <div className={styles.label}>模型（Mock）</div>
              <input
                className={styles.input}
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="例如：mock-multimodal-ai"
                spellCheck={false}
                disabled={busy}
              />
            </div>
            <div className={styles.hintText}>
              {hasTasks ? `已加入 ${tasks.length} 个文件（待处理 ${queuedCount}）` : '尚未选择文件'}
            </div>
          </div>

          <div className={styles.row}>
            <button className="primaryButton" onClick={analyzeAll} disabled={busy || queuedCount === 0}>
              {busy ? '分析中…' : '开始批量分析'}
            </button>
            <button className="secondaryButton" onClick={clearAll} disabled={busy || !hasTasks}>清空队列</button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            accept=".pdf,.docx,.xlsx,.xls,.txt,.log,.md,.jpg,.jpeg,.png,.webp"
            onChange={(e) => onFilesSelected(e.target.files)}
          />
        </div>
      </div>

      <div className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">任务列表</div>
            <div className="cardSubtitle">{hasTasks ? '模拟执行结果（结构化输出摘要）' : '当前暂无任务'}</div>
          </div>
        </div>
        <div className="cardBody">
          <div className={styles.tableWrap}>
            <table className="dataTable" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>文件</th>
                  <th>状态</th>
                  <th>进度</th>
                  <th>输出</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={styles.emptyCell}>（暂无）</td>
                  </tr>
                ) : (
                  tasks.map(t => (
                    <tr key={t.id}>
                      <td className={styles.fileCell}>
                        <div className={styles.fileName}>{t.file.name}</div>
                        <div className={styles.fileMeta}>{Math.round(t.file.size / 1024)} KB</div>
                      </td>
                      <td>
                        <span className={styles.statusPill} data-status={t.status}>
                          {t.status === 'queued' ? '待处理' : t.status === 'processing' ? '处理中' : t.status === 'done' ? '完成' : '失败'}
                        </span>
                      </td>
                      <td className={styles.progressCell}>
                        <div className={styles.progressTrack}>
                          <div className={styles.progressBar} style={{ width: `${Math.max(0, Math.min(100, t.progress))}%` }} />
                        </div>
                        <div className={styles.progressText}>{t.progress}%</div>
                      </td>
                      <td className={styles.outputCell}>
                        {t.status === 'done' ? (
                          <>
                            <div className={styles.outputStats}>{t.outputStats || ''}</div>
                            <div className={styles.outputSummary}>{t.outputSummary || ''}</div>
                          </>
                        ) : t.status === 'error' ? (
                          <div className={styles.errorText}>{t.error || 'Unknown error'}</div>
                        ) : (
                          <div className={styles.muted}>（等待生成）</div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
