'use client'

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '@/components/ui'
import styles from './KnowledgeBaseModule.module.css'

const DEFAULT_UID = '1'

type KnowledgeBaseFile = {
  id: string
  file_name: string
  file_type: string
  indexed_at: string
  chunk_count: number
  size_bytes: number
  entities_count: number
  summary: string
}

type KnowledgeBaseFileDetail = KnowledgeBaseFile & {
  content_preview: string
  keywords: string[]
  entities: string[]
}

export function KnowledgeBaseModule() {
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [files, setFiles] = useState<KnowledgeBaseFile[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detailMap, setDetailMap] = useState<Record<string, KnowledgeBaseFileDetail>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadFiles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/knowledge-base/files?uid=${encodeURIComponent(DEFAULT_UID)}`, { method: 'GET' })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const msg = data?.msg || `HTTP ${res.status}`
        throw new Error(msg)
      }
      const list = Array.isArray(data?.files) ? (data.files as KnowledgeBaseFile[]) : []
      setFiles(list)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      toast.error(`加载失败：${msg}`)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void loadFiles()
  }, [loadFiles])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return files
    return files.filter(f => f.file_name.toLowerCase().includes(q) || f.file_type.toLowerCase().includes(q))
  }, [files, search])

  const onPickFile = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const loadDetail = useCallback(async (id: string) => {
    const existing = detailMap[id]
    if (existing) return existing
    const res = await fetch(`/api/knowledge-base/files/${encodeURIComponent(id)}?uid=${encodeURIComponent(DEFAULT_UID)}`, { method: 'GET' })
    const data = await res.json().catch(() => null)
    if (!res.ok || data?.code !== 200) {
      const msg = data?.msg || `HTTP ${res.status}`
      throw new Error(msg)
    }
    const file = data?.file as KnowledgeBaseFileDetail
    setDetailMap(prev => ({ ...prev, [id]: file }))
    return file
  }, [detailMap])

  const onToggleDetail = useCallback(async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    try {
      await loadDetail(id)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      toast.error(`加载详情失败：${msg}`)
    }
  }, [expandedId, loadDetail, toast])

  const onDelete = useCallback(async (id: string) => {
    if (busyId) return
    setBusyId(id)
    try {
      const res = await fetch(`/api/knowledge-base/files/${encodeURIComponent(id)}?uid=${encodeURIComponent(DEFAULT_UID)}`, { method: 'DELETE' })
      const data = await res.json().catch(() => null)
      if (!res.ok || data?.code !== 200) {
        const msg = data?.msg || `HTTP ${res.status}`
        throw new Error(msg)
      }
      toast.success('已删除')
      setExpandedId(prev => (prev === id ? null : prev))
      setDetailMap(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      await loadFiles()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      toast.error(`删除失败：${msg}`)
    } finally {
      setBusyId(null)
    }
  }, [busyId, loadFiles, toast])

  const onUpload = useCallback(async () => {
    if (!selectedFile) {
      toast.warning('请选择一个文件')
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', selectedFile)
      fd.append('uid', DEFAULT_UID)
      const res = await fetch('/api/knowledge-base/upload', { method: 'POST', body: fd })
      const data = await res.json().catch(() => null)
      if (!res.ok || data?.code !== 200) {
        const msg = data?.msg || `HTTP ${res.status}`
        throw new Error(msg)
      }
      toast.success(`上传成功（共 ${data?.chunk_count ?? 0} 个知识片段）`)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await loadFiles()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      toast.error(`上传失败：${msg}`)
    } finally {
      setUploading(false)
    }
  }, [loadFiles, selectedFile, toast])

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.title}>📚 知识库</div>
        <div className={styles.subtitle}>上传文档文件，自动解析入库构建私有知识库（对齐 Streamlit 版本流程）</div>
      </div>

      <div className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">上传</div>
            <div className="cardSubtitle">支持 PDF、Word、TXT、Markdown、Excel、图片（模拟解析入库）</div>
          </div>
        </div>
        <div className="cardBody">
          <div className={styles.uploadRow}>
            <div className={styles.fileBox} role="button" tabIndex={0} onClick={onPickFile}>
              <div className={styles.fileName}>{selectedFile ? selectedFile.name : '点击选择文件…'}</div>
              <div className={styles.fileHint}>
                {selectedFile ? `${Math.round(selectedFile.size / 1024)} KB` : '上传后将写入本地知识库索引（后端 mock）'}
              </div>
            </div>
            <div className={styles.uploadActions}>
              <button className="secondaryButton" onClick={onPickFile} disabled={uploading}>选择文件</button>
              <button className="primaryButton" onClick={onUpload} disabled={uploading || !selectedFile}>
                {uploading ? '上传中…' : '上传到知识库'}
              </button>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            accept=".pdf,.docx,.xlsx,.xls,.txt,.log,.md,.jpg,.jpeg,.png,.webp"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
        </div>
      </div>

      <div className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">检索</div>
            <div className="cardSubtitle">按文件名/类型过滤（后续可接入向量检索与标签）</div>
          </div>
        </div>
        <div className="cardBody">
          <div className={styles.searchRow}>
            <input
              className={styles.input}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索：文件名 / 类型…"
              spellCheck={false}
            />
            <button className="secondaryButton" onClick={loadFiles} disabled={loading || uploading}>
              {loading ? '刷新中…' : '刷新'}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">条目</div>
            <div className="cardSubtitle">{files.length ? `已索引 ${files.length} 个文件` : '当前暂无数据'}</div>
          </div>
        </div>
        <div className="cardBody">
          {filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyTitle}>知识库为空</div>
              <div className={styles.emptyText}>点击上方「上传到知识库」导入文件后，这里将展示已索引条目。</div>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className="dataTable" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>文件</th>
                    <th>类型</th>
                    <th>索引时间</th>
                    <th>知识片段</th>
                    <th>实体</th>
                    <th>摘要</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(f => {
                    const expanded = expandedId === f.id
                    const detail = detailMap[f.id]
                    return (
                      <Fragment key={f.id}>
                        <tr>
                          <td className={styles.fileCell}>
                            <div className={styles.fileTitle}>{f.file_name}</div>
                            <div className={styles.fileMeta}>{Math.round(f.size_bytes / 1024)} KB</div>
                          </td>
                          <td>{f.file_type}</td>
                          <td className={styles.mono}>{new Date(f.indexed_at).toLocaleString()}</td>
                          <td>{f.chunk_count}</td>
                          <td>{f.entities_count}</td>
                          <td className={styles.summaryCell}>{f.summary}</td>
                          <td className={styles.actionsCell}>
                            <button
                              className="secondaryButton"
                              onClick={() => void onToggleDetail(f.id)}
                              disabled={busyId === f.id}
                            >
                              {expanded ? '收起' : '详情'}
                            </button>
                          </td>
                        </tr>
                        {expanded && (
                          <tr>
                            <td colSpan={7} className={styles.detailCell}>
                              <div className={styles.detailPanel}>
                                <div className={styles.detailHeader}>
                                  <div className={styles.detailTitle}>📄 {f.file_name}</div>
                                  <div className={styles.detailButtons}>
                                    <button
                                      className="secondaryButton"
                                      onClick={() => void onDelete(f.id)}
                                      disabled={busyId === f.id}
                                    >
                                      {busyId === f.id ? '删除中…' : '删除'}
                                    </button>
                                  </div>
                                </div>

                                {!detail ? (
                                  <div className={styles.muted}>加载中…</div>
                                ) : (
                                  <>
                                    <div className={styles.tagSection}>
                                      <div className={styles.tagLabel}>关键词</div>
                                      <div className={styles.tags}>
                                        {(detail.keywords || []).length ? detail.keywords.map(k => (
                                          <span key={k} className={styles.tag}>{k}</span>
                                        )) : <span className={styles.muted}>（无）</span>}
                                      </div>
                                    </div>

                                    <div className={styles.tagSection}>
                                      <div className={styles.tagLabel}>实体</div>
                                      <div className={styles.tags}>
                                        {(detail.entities || []).length ? detail.entities.map(e => (
                                          <span key={e} className={styles.tag}>{e}</span>
                                        )) : <span className={styles.muted}>（无）</span>}
                                      </div>
                                    </div>

                                    <div className={styles.previewSection}>
                                      <div className={styles.tagLabel}>内容预览（截断）</div>
                                      <pre className={styles.preview}>{detail.content_preview || ''}</pre>
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
