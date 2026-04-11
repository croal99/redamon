'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronDown, FolderSearch, Upload, X, Loader2 } from 'lucide-react'
import { Toggle } from '@/components/ui'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'
import { NodeInfoTooltip } from '../NodeInfoTooltip'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

const BUILTIN_WORDLISTS = [
  { name: 'common.txt', path: '/usr/share/seclists/Discovery/Web-Content/common.txt' },
  { name: 'directory-list-2.3-small.txt', path: '/usr/share/seclists/Discovery/Web-Content/directory-list-2.3-small.txt' },
  { name: 'raft-medium-directories.txt', path: '/usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt' },
]

const DEFAULT_WORDLIST = BUILTIN_WORDLISTS[0].path

interface CustomWordlist {
  name: string
  path: string
  size: number
}

interface FfufSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  projectId?: string
  mode: 'create' | 'edit'
}

export function FfufSection({ data, updateField, projectId, mode }: FfufSectionProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [customWordlists, setCustomWordlists] = useState<CustomWordlist[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canUpload = !!projectId

  const fetchCustomWordlists = useCallback(async () => {
    if (!projectId) return
    try {
      const res = await fetch(`/api/projects/${projectId}/wordlists`)
      if (res.ok) {
        const json = await res.json()
        setCustomWordlists(json.wordlists || [])
      }
    } catch {
      // Silently fail -- custom wordlists just won't appear
    }
  }, [projectId])

  useEffect(() => {
    fetchCustomWordlists()
  }, [fetchCustomWordlists])

  const handleUpload = async (file: File) => {
    if (!projectId) return
    setIsUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/projects/${projectId}/wordlists`, {
        method: 'POST',
        body: formData,
      })

      const result = await res.json()

      if (!res.ok) {
        setUploadError(result.error || '上传失败')
        return
      }

      setCustomWordlists(result.wordlists || [])
      if (result.uploaded?.path) {
        updateField('ffufWordlist', result.uploaded.path)
      }
    } catch {
      setUploadError('上传失败，请重试。')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (name: string) => {
    if (!projectId) return

    try {
      const res = await fetch(
        `/api/projects/${projectId}/wordlists?name=${encodeURIComponent(name)}`,
        { method: 'DELETE' }
      )

      if (res.ok) {
        const result = await res.json()
        setCustomWordlists(result.wordlists || [])

        const deletedPath = `/app/recon/wordlists/${projectId}/${name}`
        if (data.ffufWordlist === deletedPath) {
          updateField('ffufWordlist', DEFAULT_WORDLIST)
        }
      }
    } catch {
      // Silently fail
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <FolderSearch size={16} />
          FFuf 目录爆破（Fuzzer）
          <NodeInfoTooltip section="Ffuf" />
          <span className={styles.badgeActive}>主动</span>
        </h2>
        <div className={styles.sectionHeaderRight}>
          <div onClick={(e) => e.stopPropagation()}>
            <Toggle
              checked={data.ffufEnabled}
              onChange={(checked) => updateField('ffufEnabled', checked)}
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
            使用字典对常见路径进行爆破的高速目录/端点 fuzzer，可发现爬虫无法覆盖的隐藏内容（管理后台、备份文件、配置文件、未公开 API 等）。通常在爬虫完成后运行，并可对已发现的基础路径进行智能 fuzz。
          </p>

          {data.ffufEnabled && (
            <>
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>线程数</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.ffufThreads}
                    onChange={(e) => updateField('ffufThreads', parseInt(e.target.value) || 40)}
                    min={1}
                    max={200}
                  />
                  <span className={styles.fieldHint}>并发请求线程数</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>限速（请求/秒）</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.ffufRate}
                    onChange={(e) => updateField('ffufRate', parseInt(e.target.value) || 0)}
                    min={0}
                  />
                  <span className={styles.fieldHint}>每秒最大请求数（0=不限）</span>
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>请求超时（秒）</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.ffufTimeout}
                    onChange={(e) => updateField('ffufTimeout', parseInt(e.target.value) || 10)}
                    min={1}
                  />
                  <span className={styles.fieldHint}>单次请求超时</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>最大执行时长（秒）</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.ffufMaxTime}
                    onChange={(e) => updateField('ffufMaxTime', parseInt(e.target.value) || 600)}
                    min={60}
                  />
                  <span className={styles.fieldHint}>每个目标的最大总执行时长</span>
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  字典 <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(内置或上传)</span>
                </label>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 'var(--space-2)',
                    alignItems: 'stretch',
                  }}
                >
                  <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                    <select
                      className="select"
                      value={data.ffufWordlist}
                      onChange={(e) => updateField('ffufWordlist', e.target.value || DEFAULT_WORDLIST)}
                      aria-label="FFuf 字典"
                    >
                      <optgroup label="内置（recon 镜像内的 SecLists）">
                        {BUILTIN_WORDLISTS.map((wl) => (
                          <option key={wl.path} value={wl.path}>
                            {wl.name}
                          </option>
                        ))}
                      </optgroup>
                      {canUpload && customWordlists.length === 0 && (
                        <optgroup label="你的自定义字典">
                          <option disabled value="__ffuf_no_custom_yet__">
                            （暂无——请先点击“上传 .txt”→）
                          </option>
                        </optgroup>
                      )}
                      {customWordlists.length > 0 && (
                        <optgroup label="你的自定义字典">
                          {customWordlists.map((wl) => (
                            <option key={wl.path} value={wl.path}>
                              {wl.name} ({formatSize(wl.size)})
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,text/plain"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleUpload(file)
                    }}
                  />
                  <button
                    type="button"
                    className="primaryButton"
                    style={{
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      flex: '0 0 auto',
                      alignSelf: 'flex-start',
                    }}
                    onClick={() => (canUpload ? fileInputRef.current?.click() : undefined)}
                    disabled={isUploading || !canUpload}
                    title={
                      !canUpload
                        ? '请先保存项目，再上传自定义字典'
                        : '上传 .txt 字典——上传后会出现在菜单的“你的自定义字典”中'
                    }
                  >
                    {isUploading ? <Loader2 size={14} className={styles.spinner} /> : <Upload size={14} />}
                    {isUploading ? '上传中…' : '上传 .txt'}
                  </button>
                </div>
                {uploadError && (
                  <span className={styles.fieldHint} style={{ color: 'var(--status-error)' }}>
                    {uploadError}
                  </span>
                )}
                {!uploadError && !canUpload && (
                  <span className={styles.fieldHint}>
                    请先保存项目；随后即可上传 .txt payload 字典（最大 50MB），并在上方菜单中选择使用。
                  </span>
                )}
                {!uploadError && canUpload && (
                  <span className={styles.fieldHint}>
                    自定义文件在上传前<strong>不会</strong>显示。点击 <strong>上传 .txt</strong>，
                    然后在下拉菜单的 <strong>你的自定义字典</strong> 下选择对应文件。
                  </span>
                )}
              </div>

              {customWordlists.length > 0 && canUpload && (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>已上传字典</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                    {customWordlists.map((wl) => (
                      <div
                        key={wl.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: 'var(--space-1) var(--space-2)',
                          background: 'var(--bg-tertiary)',
                          borderRadius: 'var(--radius-default)',
                          fontSize: 'var(--text-xs)',
                          border: data.ffufWordlist === wl.path ? '1px solid var(--accent-secondary)' : '1px solid var(--border-default)',
                        }}
                      >
                        <span style={{ color: 'var(--text-primary)' }}>
                          {wl.name}
                          <span style={{ color: 'var(--text-tertiary)', marginLeft: 'var(--space-2)' }}>
                            {formatSize(wl.size)}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDelete(wl.name)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-tertiary)',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title={`删除 ${wl.name}`}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>匹配状态码</label>
                  <input
                    type="text"
                    className="textInput"
                    value={(data.ffufMatchCodes ?? []).join(', ')}
                    onChange={(e) => updateField('ffufMatchCodes', e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)))}
                  />
                  <span className={styles.fieldHint}>白名单：仅包含这些 HTTP 状态码（逗号分隔）</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>过滤状态码</label>
                  <input
                    type="text"
                    className="textInput"
                    value={(data.ffufFilterCodes ?? []).join(', ')}
                    onChange={(e) => updateField('ffufFilterCodes', e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)))}
                  />
                  <span className={styles.fieldHint}>黑名单：排除这些 HTTP 状态码（逗号分隔）</span>
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>过滤响应大小</label>
                  <input
                    type="text"
                    className="textInput"
                    value={data.ffufFilterSize}
                    onChange={(e) => updateField('ffufFilterSize', e.target.value)}
                    placeholder="例如：0 或 4242"
                  />
                  <span className={styles.fieldHint}>排除该大小（字节）的响应，适用于统一错误页去噪</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>扩展名</label>
                  <input
                    type="text"
                    className="textInput"
                    value={(data.ffufExtensions ?? []).join(', ')}
                    onChange={(e) => updateField('ffufExtensions', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder=".php, .bak, .env, .json"
                  />
                  <span className={styles.fieldHint}>为每个词条追加的文件扩展名（逗号分隔）</span>
                </div>
              </div>

              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>选项</h3>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>自动校准</span>
                    <p className={styles.toggleDescription}>根据响应特征自动过滤误报</p>
                  </div>
                  <Toggle
                    checked={data.ffufAutoCalibrate}
                    onChange={(checked) => updateField('ffufAutoCalibrate', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>智能 Fuzz（爬虫后）</span>
                    <p className={styles.toggleDescription}>对爬虫发现的基础路径继续 fuzz（例如：/api/v1/FUZZ）</p>
                  </div>
                  <Toggle
                    checked={data.ffufSmartFuzz}
                    onChange={(checked) => updateField('ffufSmartFuzz', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>跟随重定向</span>
                    <p className={styles.toggleDescription}>跟随 HTTP 重定向。可能跳到范围外域名（会在后续进行过滤）</p>
                  </div>
                  <Toggle
                    checked={data.ffufFollowRedirects}
                    onChange={(checked) => updateField('ffufFollowRedirects', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>递归</span>
                    <p className={styles.toggleDescription}>对发现的目录递归 fuzz</p>
                  </div>
                  <Toggle
                    checked={data.ffufRecursion}
                    onChange={(checked) => updateField('ffufRecursion', checked)}
                  />
                </div>
                {data.ffufRecursion && (
                  <div className={styles.fieldGroup} style={{ marginTop: '0.5rem' }}>
                    <label className={styles.fieldLabel}>递归深度</label>
                    <input
                      type="number"
                      className="textInput"
                      value={data.ffufRecursionDepth}
                      onChange={(e) => updateField('ffufRecursionDepth', parseInt(e.target.value) || 2)}
                      min={1}
                      max={5}
                    />
                  </div>
                )}
              </div>

              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>自定义请求头</h3>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>请求头</label>
                  <textarea
                    className="textarea"
                    value={(data.ffufCustomHeaders ?? []).join('\n')}
                    onChange={(e) => updateField('ffufCustomHeaders', e.target.value.split('\n').filter(Boolean))}
                    placeholder="Cookie: session=abc123&#10;Authorization: Bearer token..."
                    rows={3}
                  />
                  <span className={styles.fieldHint}>每行一个请求头，会随每个请求发送</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
