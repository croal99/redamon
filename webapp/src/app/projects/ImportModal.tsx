'use client'

import { useState, useRef } from 'react'
import { Upload, Loader2, CheckCircle, AlertCircle, FileArchive } from 'lucide-react'
import { useToast } from '@/components/ui'
import styles from './page.module.css'

interface ImportStats {
  conversations: number
  messages: number
  remediations: number
  reports: number
  neo4jNodes: number
  neo4jRelationships: number
  artifacts: number
}

interface ImportResult {
  success: boolean
  projectId: string
  projectName: string
  stats: ImportStats
}

interface ImportModalProps {
  isOpen: boolean
  userId: string
  onClose: () => void
  onSuccess: () => void
}

export function ImportModal({ isOpen, userId, onClose, onSuccess }: ImportModalProps) {
  const toast = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null
    setFile(selected)
    setStatus('idle')
    setResult(null)
    setErrorMessage('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setStatus('uploading')
    setErrorMessage('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/projects/import?userId=${userId}`, {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data: ImportResult = await res.json()
        setResult(data)
        setStatus('success')
        toast.success('项目已导入')
        onSuccess()
      } else {
        const err = await res.json()
        setErrorMessage(err.error || '导入失败')
        setStatus('error')
        toast.error('导入失败')
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '导入失败')
      setStatus('error')
      toast.error('导入失败')
    }
  }

  const handleClose = () => {
    setFile(null)
    setStatus('idle')
    setResult(null)
    setErrorMessage('')
    onClose()
  }

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>导入项目</h2>

        {status === 'idle' && (
          <form onSubmit={handleSubmit}>
            <div className="formGroup">
              <label className="formLabel">项目备份文件</label>
              <div
                style={{
                  border: '2px dashed var(--border-default)',
                  borderRadius: 'var(--radius-default)',
                  padding: 'var(--space-4)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: file ? 'var(--bg-tertiary)' : 'transparent',
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                {file ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}>
                    <FileArchive size={16} />
                    <span style={{ fontSize: 'var(--text-sm)' }}>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                    <Upload size={24} style={{ margin: '0 auto var(--space-2)', display: 'block' }} />
                    点击选择 RedAmon 导出 ZIP 文件
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
                项目将创建在当前选中的用户下。
              </p>
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className="secondaryButton"
                onClick={handleClose}
              >
                取消
              </button>
              <button
                type="submit"
                className="primaryButton"
                disabled={!file}
              >
                <Upload size={14} />
                导入
              </button>
            </div>
          </form>
        )}

        {status === 'uploading' && (
          <div style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto var(--space-3)', display: 'block' }} />
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              正在导入项目数据…
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              大项目可能需要一些时间。
            </p>
          </div>
        )}

        {status === 'success' && result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--success)' }}>
              <CheckCircle size={20} />
              <span style={{ fontWeight: 'var(--font-semibold)' }}>导入成功</span>
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>
              项目 &quot;{result.projectName}&quot; 已恢复。
            </p>
            <div style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-tertiary)',
              background: 'var(--bg-tertiary)',
              padding: 'var(--space-2)',
              borderRadius: 'var(--radius-default)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'var(--space-1)',
            }}>
              <span>会话：{result.stats.conversations}</span>
              <span>消息：{result.stats.messages}</span>
              <span>修复项：{result.stats.remediations}</span>
              <span>报告：{result.stats.reports}</span>
              <span>图谱节点：{result.stats.neo4jNodes}</span>
              <span>关系：{result.stats.neo4jRelationships}</span>
              <span>产物：{result.stats.artifacts}</span>
            </div>
            <div className={styles.modalActions}>
              <button className="primaryButton" onClick={handleClose}>
                完成
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--danger)' }}>
              <AlertCircle size={20} />
              <span style={{ fontWeight: 'var(--font-semibold)' }}>导入失败</span>
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>
              {errorMessage}
            </p>
            <div className={styles.modalActions}>
              <button className="secondaryButton" onClick={handleClose}>
                关闭
              </button>
              <button className="primaryButton" onClick={() => { setStatus('idle'); setErrorMessage('') }}>
                重试
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
