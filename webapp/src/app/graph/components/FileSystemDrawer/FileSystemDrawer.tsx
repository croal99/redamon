'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  File as FileIcon,
  Folder as FolderIcon,
  Download as DownloadIcon,
  Pencil as PencilIcon,
  Trash2 as TrashIcon,
  Link2 as SymlinkIcon,
  ChevronRight,
  RefreshCw,
  XCircle,
  Eye,
  FolderOpen,
  Briefcase,
  FolderPlus,
  Upload as UploadIcon,
  FileArchive as ArchiveIcon,
  AlertTriangle,
  Lock,
  Info,
  ArrowLeft,
  Eraser,
} from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { useAlertModal, WikiInfoButton } from '@/components/ui'
import styles from './FileSystemDrawer.module.css'

// =============================================================================
// Types
// =============================================================================

interface Entry {
  name: string
  path: string
  isDir: boolean
  isSymlink: boolean
  size: number
  mtime: string
}

interface JobRow {
  job_id: string
  project_id: string
  tool_name: string
  args: Record<string, unknown>
  label: string | null
  status: 'running' | 'done' | 'failed' | 'cancelled' | 'interrupted'
  started_at: string
  ended_at: string | null
  exit_code: number | null
  output_path: string
  error: string | null
  size_bytes?: number
}

type Tab = 'files' | 'jobs'

export interface FileSystemDrawerProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  /** When set, the drawer opens with the Files tab focused on this path. */
  initialPath?: string
  /** When set, the drawer opens on the Jobs tab. */
  initialTab?: Tab
}

// Protected default subdirs — these cannot be renamed or deleted. Mirrors
// PROTECTED_SUBDIRS in agentic/workspace_fs.py (backend also enforces).
const PROTECTED_SUBDIRS = new Set(['notes', 'tool-outputs', 'jobs', 'uploads'])

const WIDTH_STORAGE_KEY = 'redamon-filesystem-drawer-width'
const DEFAULT_WIDTH_PX = 494
const MIN_WIDTH_PX = 320
const MAX_WIDTH_PX = 1200

function isProtectedPath(path: string): boolean {
  const norm = path.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\.\//, '')
  const trimmed = norm.replace(/^\/+|\/+$/g, '')
  if (!trimmed || trimmed === '.') return true
  const parts = trimmed.split('/')
  return parts.length === 1 && PROTECTED_SUBDIRS.has(parts[0])
}

// =============================================================================
// Helpers
// =============================================================================

function formatSize(bytes: number | undefined): string {
  if (bytes === undefined || bytes === null) return '-'
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}M`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}G`
}

function formatMtime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatElapsed(started: string, ended: string | null): string {
  try {
    const start = new Date(started).getTime()
    const end = ended ? new Date(ended).getTime() : Date.now()
    const secs = Math.max(0, Math.round((end - start) / 1000))
    if (secs < 60) return `${secs}s`
    if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`
    return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`
  } catch {
    return '-'
  }
}

function statusClass(status: string): string {
  switch (status) {
    case 'running': return styles.statusRunning
    case 'done': return styles.statusDone
    case 'failed': return styles.statusFailed
    case 'cancelled': return styles.statusCancelled
    case 'interrupted': return styles.statusInterrupted
    default: return ''
  }
}

// =============================================================================
// Component
// =============================================================================

export function FileSystemDrawer({
  isOpen,
  onClose,
  projectId,
  initialPath = '.',
  initialTab = 'files',
}: FileSystemDrawerProps) {
  // RedAmon-styled modal dialogs (replaces browser-native alert/confirm).
  // Provider is mounted in app/layout.tsx.
  const { alertError, alertWarning, dangerConfirm } = useAlertModal()

  const [tab, setTab] = useState<Tab>(initialTab)
  const [currentPath, setCurrentPath] = useState(initialPath)
  const [entries, setEntries] = useState<Entry[]>([])
  const [entriesLoading, setEntriesLoading] = useState(false)
  const [entriesError, setEntriesError] = useState<string | null>(null)
  const [renamingPath, setRenamingPath] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // Stage B state
  const [mkdirInput, setMkdirInput] = useState<string | null>(null)  // null = hidden
  const [isDragging, setIsDragging] = useState(false)
  const [uploadingCount, setUploadingCount] = useState(0)
  const [deletePending, setDeletePending] = useState<Entry | null>(null)
  const [overwritePending, setOverwritePending] = useState<{
    file: File; destDir: string;
  } | null>(null)

  // Stage C state
  const [previewing, setPreviewing] = useState<{
    path: string; content: string; isBinary: boolean; truncated: boolean;
    mime: string; size: number;
  } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [propertiesFor, setPropertiesFor] = useState<{
    path: string; type: string; size: number; mtime: string; mode: string;
    sha256?: string; target?: string;
  } | null>(null)
  const [propertiesLoading, setPropertiesLoading] = useState(false)
  const [propertiesError, setPropertiesError] = useState<string | null>(null)

  // Stage D state
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'mtime'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [filterText, setFilterText] = useState('')
  const [bulkDeletePending, setBulkDeletePending] = useState<Entry[] | null>(null)
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  const [jobs, setJobs] = useState<JobRow[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [jobsError, setJobsError] = useState<string | null>(null)

  // Drawer width — persisted per-user via localStorage so it survives reloads
  // and project switches. Lazy init reads the stored value once on mount.
  const [drawerWidth, setDrawerWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_WIDTH_PX
    const raw = window.localStorage.getItem(WIDTH_STORAGE_KEY)
    if (!raw) return DEFAULT_WIDTH_PX
    const n = parseInt(raw, 10)
    if (!Number.isFinite(n)) return DEFAULT_WIDTH_PX
    return Math.min(Math.max(n, MIN_WIDTH_PX), MAX_WIDTH_PX)
  })

  const handleResizeEnd = useCallback((widthPx: number) => {
    const clamped = Math.min(Math.max(Math.round(widthPx), MIN_WIDTH_PX), MAX_WIDTH_PX)
    try {
      window.localStorage.setItem(WIDTH_STORAGE_KEY, String(clamped))
    } catch {
      // localStorage unavailable (private mode, quota) — width still applies for the session.
    }
  }, [])

  // Reset when the drawer "context" changes (reopen, projectId switch, or
  // initialPath/initialTab override). Without resetting preview/properties
  // here, stale content from the prior session/project would show up
  // (bug #19 - caught by stage-C review).
  useEffect(() => {
    if (isOpen) {
      setCurrentPath(initialPath)
      setTab(initialTab)
      setPreviewing(null)
      setPreviewError(null)
      setPropertiesFor(null)
      setPropertiesError(null)
      setSelectedPaths(new Set())
      setFilterText('')
    }
  }, [isOpen, projectId, initialPath, initialTab])

  // Reset selection + filter when path changes (the entries shown are
  // different so the selection set would point at unrelated paths).
  useEffect(() => {
    setSelectedPaths(new Set())
    setFilterText('')
  }, [currentPath])

  // Computed: filter + sort applied to the raw entries list
  const displayedEntries = useMemo(() => {
    let out = entries
    if (filterText.trim()) {
      const needle = filterText.toLowerCase()
      out = out.filter(e => e.name.toLowerCase().includes(needle))
    }
    const dir = sortDir === 'asc' ? 1 : -1
    out = [...out].sort((a, b) => {
      // Always keep dirs above files - matches the convention of native
      // file managers. Sort within each group by the chosen column.
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      if (sortBy === 'name') return a.name.localeCompare(b.name) * dir
      if (sortBy === 'size') return (a.size - b.size) * dir
      // mtime is ISO 8601 - string comparison is chronologically correct
      return (a.mtime < b.mtime ? -1 : a.mtime > b.mtime ? 1 : 0) * dir
    })
    return out
  }, [entries, filterText, sortBy, sortDir])

  // ---- Fetchers ---------------------------------------------------------

  // `silent` skips the loading/error state toggle — used for the 5s background
  // poll so the entry list doesn't unmount/remount on every tick (which
  // produced a visible flash). The current list stays on screen; if the
  // poll fails we keep the stale data rather than wiping it.
  const fetchEntries = useCallback(async (path: string, silent = false) => {
    if (!projectId) return
    if (!silent) {
      setEntriesLoading(true)
      setEntriesError(null)
    }
    try {
      const url = `/api/agent/workspace/list?projectId=${encodeURIComponent(projectId)}&path=${encodeURIComponent(path)}`
      const resp = await fetch(url, { cache: 'no-store' })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`)
      setEntries(data.entries || [])
      if (silent) setEntriesError(null)
    } catch (e) {
      if (!silent) {
        setEntriesError(e instanceof Error ? e.message : '加载失败')
        setEntries([])
      }
    } finally {
      if (!silent) setEntriesLoading(false)
    }
  }, [projectId])

  const fetchJobs = useCallback(async (silent = false) => {
    if (!projectId) return
    if (!silent) {
      setJobsLoading(true)
      setJobsError(null)
    }
    try {
      const url = `/api/agent/workspace/jobs?projectId=${encodeURIComponent(projectId)}`
      const resp = await fetch(url, { cache: 'no-store' })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`)
      setJobs(data.jobs || [])
      if (silent) setJobsError(null)
    } catch (e) {
      if (!silent) {
        setJobsError(e instanceof Error ? e.message : '加载失败')
        setJobs([])
      }
    } finally {
      if (!silent) setJobsLoading(false)
    }
  }, [projectId])

  // Files tab: initial fetch when path or open state changes
  useEffect(() => {
    if (isOpen && tab === 'files') {
      fetchEntries(currentPath)
    }
  }, [isOpen, tab, currentPath, fetchEntries])

  // Files tab: auto-refresh every 5s while visible so the agent's
  // fs_write / fs_mkdir / fs_delete operations (and host-side drops into
  // uploads/) appear without the user having to hit the refresh button.
  // Paused while previewing a file (preview content doesn't depend on the
  // listing, and refetching would risk a flicker if entries change).
  useEffect(() => {
    if (!(isOpen && tab === 'files')) return
    if (previewing !== null) return
    const handle = setInterval(() => fetchEntries(currentPath, true), 5000)
    return () => clearInterval(handle)
  }, [isOpen, tab, currentPath, fetchEntries, previewing])

  // Jobs tab: poll every 5s while open (WS push lands in a follow-up; polling
  // is the fallback even when WS works).
  useEffect(() => {
    if (!(isOpen && tab === 'jobs')) return
    fetchJobs()
    const handle = setInterval(() => fetchJobs(true), 5000)
    return () => clearInterval(handle)
  }, [isOpen, tab, fetchJobs])

  // ---- Actions ----------------------------------------------------------

  const handleEnterDir = useCallback((path: string) => {
    setCurrentPath(path)
  }, [])

  const handleGoUp = useCallback(() => {
    if (currentPath === '.' || currentPath === '') return
    const segments = currentPath.split('/').filter(Boolean)
    segments.pop()
    setCurrentPath(segments.length ? segments.join('/') : '.')
  }, [currentPath])

  const handleDownload = useCallback((entry: Entry) => {
    const url = `/api/agent/files?projectId=${encodeURIComponent(projectId)}&path=${encodeURIComponent(entry.path)}`
    // Use an anchor click rather than setting window.location.href - if the
    // server returns a JSON error response, location.href would NAVIGATE the
    // page away from the graph view (losing session state). An anchor with
    // the download attribute either triggers the download dialog (happy path)
    // or downloads the error JSON as a file (graceful failure), but never
    // navigates.
    const a = document.createElement('a')
    a.href = url
    a.download = entry.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [projectId])

  const startRename = useCallback((entry: Entry) => {
    setRenamingPath(entry.path)
    setRenameValue(entry.name)
  }, [])

  const commitRename = useCallback(async (entry: Entry) => {
    if (!renameValue || renameValue === entry.name) {
      setRenamingPath(null)
      return
    }
    try {
      const resp = await fetch('/api/agent/workspace/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          path: entry.path,
          newName: renameValue,
        }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`)
      setRenamingPath(null)
      fetchEntries(currentPath)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'rename failed'
      alertError(msg, '重命名失败')
    }
  }, [projectId, renameValue, currentPath, fetchEntries, alertError])

  // Opens the delete-confirm modal. Actual DELETE goes through performDelete
  // once the user confirms - lets us use a real in-drawer modal instead of
  // window.confirm (better UX, especially for directory wipes).
  const handleDeleteRequest = useCallback((entry: Entry) => {
    setDeletePending(entry)
  }, [])

  const performDelete = useCallback(async (entry: Entry) => {
    try {
      const url = `/api/agent/workspace/delete?projectId=${encodeURIComponent(projectId)}&path=${encodeURIComponent(entry.path)}&recursive=${entry.isDir}`
      const resp = await fetch(url, { method: 'DELETE' })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`)
      fetchEntries(currentPath)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'delete failed'
      alertError(msg, '删除失败')
    } finally {
      setDeletePending(null)
    }
  }, [projectId, currentPath, fetchEntries, alertError])

  // --- New folder: inline input toggled by the toolbar button --------------

  const handleMkdirToggle = useCallback(() => {
    setMkdirInput((cur) => (cur === null ? '' : null))
  }, [])

  const handleMkdirCommit = useCallback(async () => {
    const name = (mkdirInput || '').trim()
    if (!name) {
      setMkdirInput(null)
      return
    }
    if (name.includes('/') || name.includes('\\') || name === '.' || name === '..') {
      alertWarning('文件夹名称不能包含 / \\ 或为 . / ..', '无效的文件夹名称')
      return
    }
    const fullPath = currentPath === '.' || currentPath === '' ? name : `${currentPath}/${name}`
    try {
      const resp = await fetch('/api/agent/workspace/mkdir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, path: fullPath }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`)
      setMkdirInput(null)
      fetchEntries(currentPath)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'mkdir failed'
      alertError(msg, '创建文件夹失败')
    }
  }, [mkdirInput, projectId, currentPath, fetchEntries, alertWarning, alertError])

  // --- Upload (file picker + drag-drop share this) -------------------------

  const doUpload = useCallback(async (file: File, destDir: string, overwrite = false) => {
    setUploadingCount((n) => n + 1)
    try {
      const fd = new FormData()
      fd.append('projectId', projectId)
      fd.append('path', destDir)
      fd.append('overwrite', overwrite ? 'true' : 'false')
      fd.append('file', file)
      const resp = await fetch('/api/agent/workspace/upload', {
        method: 'POST',
        body: fd,
      })
      if (resp.status === 409) {
        // Server reports name collision - queue an overwrite confirm
        setOverwritePending({ file, destDir })
        return
      }
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`)
      fetchEntries(currentPath)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'upload failed'
      alertError(msg, '上传失败')
    } finally {
      setUploadingCount((n) => Math.max(0, n - 1))
    }
  }, [projectId, currentPath, fetchEntries, alertError])

  const handleUploadPick = useCallback(() => {
    // Programmatic file picker - no permanent <input> in the DOM
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.onchange = () => {
      const files = Array.from(input.files || [])
      for (const f of files) doUpload(f, currentPath, false)
    }
    input.click()
  }, [doUpload, currentPath])

  const handleConfirmOverwrite = useCallback(() => {
    if (!overwritePending) return
    const { file, destDir } = overwritePending
    setOverwritePending(null)
    doUpload(file, destDir, true)
  }, [overwritePending, doUpload])

  // --- Drag-and-drop --------------------------------------------------------

  const handleDragOver = useCallback((ev: React.DragEvent) => {
    if (ev.dataTransfer.types.includes('Files')) {
      ev.preventDefault()
      ev.dataTransfer.dropEffect = 'copy'
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((ev: React.DragEvent) => {
    // Only clear when leaving the entire drawer, not just a child element
    if (ev.currentTarget === ev.target) setIsDragging(false)
  }, [])

  const handleDrop = useCallback((ev: React.DragEvent) => {
    ev.preventDefault()
    setIsDragging(false)
    const files = Array.from(ev.dataTransfer.files || [])
    for (const f of files) doUpload(f, currentPath, false)
  }, [doUpload, currentPath])

  // --- Preview (file row click) --------------------------------------------

  const openPreview = useCallback(async (entry: Entry) => {
    setPreviewing({ path: entry.path, content: '', isBinary: false, truncated: false, mime: '', size: 0 })
    setPreviewLoading(true)
    setPreviewError(null)
    try {
      const url = `/api/agent/workspace/preview?projectId=${encodeURIComponent(projectId)}&path=${encodeURIComponent(entry.path)}`
      const resp = await fetch(url, { cache: 'no-store' })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`)
      setPreviewing({
        path: entry.path,
        content: data.content,
        isBinary: data.isBinary,
        truncated: data.truncated,
        mime: data.mime,
        size: data.size,
      })
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : 'preview failed')
    } finally {
      setPreviewLoading(false)
    }
  }, [projectId])

  const closePreview = useCallback(() => {
    setPreviewing(null)
    setPreviewError(null)
  }, [])

  // --- Properties popover --------------------------------------------------

  const openProperties = useCallback(async (entry: Entry) => {
    setPropertiesFor({ path: entry.path, type: '', size: 0, mtime: '', mode: '' })
    setPropertiesLoading(true)
    setPropertiesError(null)
    try {
      const url = `/api/agent/workspace/properties?projectId=${encodeURIComponent(projectId)}&path=${encodeURIComponent(entry.path)}`
      const resp = await fetch(url, { cache: 'no-store' })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`)
      setPropertiesFor(data)
    } catch (e) {
      setPropertiesError(e instanceof Error ? e.message : 'fetch failed')
    } finally {
      setPropertiesLoading(false)
    }
  }, [projectId])

  const closeProperties = useCallback(() => {
    setPropertiesFor(null)
    setPropertiesError(null)
  }, [])

  // --- Multi-select (Stage D) ---------------------------------------------

  const toggleSelect = useCallback((path: string) => {
    setSelectedPaths(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    // Only select currently-displayed entries (respects filter)
    setSelectedPaths(new Set(displayedEntries.map(e => e.path)))
  }, [displayedEntries])

  const clearSelection = useCallback(() => {
    setSelectedPaths(new Set())
  }, [])

  const handleSortClick = useCallback((col: 'name' | 'size' | 'mtime') => {
    if (col === sortBy) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(col)
      setSortDir('asc')
    }
  }, [sortBy])

  const handleBulkDeleteRequest = useCallback(() => {
    // Filter out protected entries - bulk delete can't touch them, mirror
    // the per-row behaviour. The confirm modal explains the filter.
    const allSelected = entries.filter(e => selectedPaths.has(e.path))
    const deletable = allSelected.filter(e => !isProtectedPath(e.path))
    if (deletable.length === 0) {
      alertWarning('所有选中条目均为受保护的默认文件夹，无法删除。', '无内容可删除')
      return
    }
    setBulkDeletePending(deletable)
  }, [entries, selectedPaths, alertWarning])

  const performBulkDelete = useCallback(async (toDelete: Entry[]) => {
    setBulkActionLoading(true)
    let errors = 0
    for (const e of toDelete) {
      try {
        const url = `/api/agent/workspace/delete?projectId=${encodeURIComponent(projectId)}&path=${encodeURIComponent(e.path)}&recursive=${e.isDir}`
        const resp = await fetch(url, { method: 'DELETE' })
        if (!resp.ok) errors++
      } catch {
        errors++
      }
    }
    setBulkActionLoading(false)
    setBulkDeletePending(null)
    setSelectedPaths(new Set())
    fetchEntries(currentPath)
    if (errors > 0) alertError(`${errors} 项删除失败；请查看浏览器控制台。`, '批量删除')
  }, [projectId, currentPath, fetchEntries, alertError])

  const handleBulkDownload = useCallback(async () => {
    const paths = Array.from(selectedPaths)
    if (paths.length === 0) return
    setBulkActionLoading(true)
    try {
      const resp = await fetch('/api/agent/workspace/bulk-archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          paths,
          format: 'tar.gz',
          archiveName: paths.length === 1 ? paths[0].split('/').pop() || 'bundle' : 'bundle',
        }),
      })
      if (!resp.ok) {
        const text = await resp.text()
        throw new Error(text || `HTTP ${resp.status}`)
      }
      // Stream the blob to an anchor download
      const blob = await resp.blob()
      const cd = resp.headers.get('Content-Disposition') || ''
      const m = /filename="?([^";]+)"?/.exec(cd)
      const filename = m?.[1] || 'bundle.tar.gz'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      alertError(e instanceof Error ? e.message : '未知错误', '批量下载失败')
    } finally {
      setBulkActionLoading(false)
    }
  }, [projectId, selectedPaths, alertError])

  // --- Folder download (archive as tar.gz) ---------------------------------

  const handleFolderDownload = useCallback((entry: Entry) => {
    const url = `/api/agent/workspace/archive-download?projectId=${encodeURIComponent(projectId)}&path=${encodeURIComponent(entry.path)}&format=tar.gz`
    const a = document.createElement('a')
    a.href = url
    a.download = `${entry.name}.tar.gz`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [projectId])

  const handleViewJobLog = useCallback((job: JobRow) => {
    // Switch to Files tab + navigate to the log's directory; the user can then
    // click the .log entry to inspect.
    const segments = (job.output_path || '').split('/').filter(Boolean)
    // output_path is /workspace/<projectId>/jobs/<id>.log -> grab last 2 segments after projectId
    const projIdx = segments.indexOf(projectId)
    if (projIdx >= 0 && projIdx + 1 < segments.length) {
      const rel = segments.slice(projIdx + 1, -1).join('/') || '.'
      setCurrentPath(rel)
    } else {
      setCurrentPath('jobs')
    }
    setTab('files')
  }, [projectId])

  // Clean All: wipes every entry under the project root and recreates the
  // four PROTECTED_SUBDIRS empty. Always behind a confirmation modal.
  const handleCleanAll = useCallback(async () => {
    const ok = await dangerConfirm(
      '这将永久删除项目工作区中的所有文件和文件夹，并将其重置为四个空的默认文件夹（jobs、notes、tool-outputs、uploads）。此操作无法撤销。',
      '清空整个工作区？',
    )
    if (!ok) return
    try {
      const resp = await fetch('/api/agent/workspace/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`)
      setSelectedPaths(new Set())
      setFilterText('')
      setCurrentPath('.')
      fetchEntries('.')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'reset failed'
      alertError(msg, '清空失败')
    }
  }, [projectId, fetchEntries, dangerConfirm, alertError])

  const handleCancelJob = useCallback(async (job: JobRow) => {
    const ok = await dangerConfirm(
      `取消正在运行的 ${job.tool_name} 任务？已完成的工作将被丢弃。`,
      '取消任务',
    )
    if (!ok) return
    try {
      const url = `/api/agent/workspace/jobs/${encodeURIComponent(job.job_id)}/cancel?projectId=${encodeURIComponent(projectId)}`
      const resp = await fetch(url, { method: 'POST' })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`)
      fetchJobs()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'cancel failed'
      alertError(msg, '取消失败')
    }
  }, [projectId, fetchJobs, dangerConfirm, alertError])

  // ---- Breadcrumb -------------------------------------------------------

  const crumbs = useMemo(() => {
    if (currentPath === '.' || currentPath === '') return []
    const parts = currentPath.split('/').filter(Boolean)
    return parts.map((name, idx) => ({
      name,
      path: parts.slice(0, idx + 1).join('/'),
    }))
  }, [currentPath])

  // ---- Render -----------------------------------------------------------

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      position="left"
      mode="overlay"
      width={`${drawerWidth}px`}
      title="智能体工作区"
      headerActions={
        <WikiInfoButton
          target="https://github.com/samugit83/redamon/wiki/Agent-Workspace"
          title="打开智能体工作区 Wiki 页面"
        />
      }
      resizable
      minWidth={MIN_WIDTH_PX}
      maxWidth={MAX_WIDTH_PX}
      onResize={setDrawerWidth}
      onResizeEnd={handleResizeEnd}
    >
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'files' ? styles.tabActive : ''}`}
          onClick={() => setTab('files')}
        >
          <FolderOpen size={14} /> 文件
        </button>
        <button
          className={`${styles.tab} ${tab === 'jobs' ? styles.tabActive : ''}`}
          onClick={() => setTab('jobs')}
        >
          <Briefcase size={14} /> 任务
        </button>
      </div>

      {tab === 'files' && previewing !== null && (
        <div className={styles.previewView}>
          <div className={styles.previewHeader}>
            <button
              className={styles.actionBtn}
              onClick={closePreview}
              title="返回文件"
            >
              <ArrowLeft size={14} />
            </button>
            <span className={styles.previewPath} title={previewing.path}>
              {previewing.path}
            </span>
          </div>
          <div className={styles.previewMeta}>
            <span>{formatSize(previewing.size)}</span>
            {previewing.mime && <span>· {previewing.mime}</span>}
            {previewing.truncated && (
              <span className={styles.previewTruncated}>· 已截断</span>
            )}
          </div>
          {previewLoading && <div className={styles.loading}>Loading…</div>}
          {previewError && <div className={styles.error}>Error: {previewError}</div>}
          {!previewLoading && !previewError && previewing.isBinary && (
            <div className={styles.previewBinary}>
              <AlertTriangle size={16} />
              <div>二进制文件 ({formatSize(previewing.size)})。</div>
              <div>请下载后在本地查看。</div>
            </div>
          )}
          {!previewLoading && !previewError && !previewing.isBinary && (
            <pre className={styles.previewText}>{previewing.content}</pre>
          )}
        </div>
      )}

      {tab === 'files' && previewing === null && (
        <>
          <div className={styles.breadcrumb}>
            <button
              className={styles.crumb}
              onClick={() => setCurrentPath('.')}
              title="项目根目录"
            >
              /workspace
            </button>
            {crumbs.map((c, i) => (
              <span key={c.path} style={{ display: 'flex', alignItems: 'center' }}>
                <span className={styles.crumbSep}><ChevronRight size={12} /></span>
                <button
                  className={styles.crumb}
                  onClick={() => setCurrentPath(c.path)}
                  disabled={i === crumbs.length - 1}
                >
                  {c.name}
                </button>
              </span>
            ))}
            <div className={styles.toolbarSpacer} />
            <button
              className={styles.actionBtn}
              onClick={handleMkdirToggle}
              title="在当前目录新建文件夹"
            >
              <FolderPlus size={12} />
            </button>
            <button
              className={styles.actionBtn}
              onClick={handleUploadPick}
              title="上传文件到当前目录"
            >
              <UploadIcon size={12} />
            </button>
            <button
              className={styles.actionBtn}
              onClick={() => fetchEntries(currentPath)}
              title="刷新"
            >
              <RefreshCw size={12} />
            </button>
            <button
              className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
              onClick={handleCleanAll}
              title="清空 — 重置工作区为 4 个空默认文件夹"
            >
              <Eraser size={12} />
            </button>
          </div>

          {mkdirInput !== null && (
            <div className={styles.mkdirRow}>
              <FolderPlus size={14} />
              <input
                autoFocus
                className={styles.renameInput}
                value={mkdirInput}
                placeholder="新文件夹名称"
                onChange={(ev) => setMkdirInput(ev.target.value)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter') handleMkdirCommit()
                  else if (ev.key === 'Escape') setMkdirInput(null)
                }}
                onBlur={() => {
                  // Slight delay so onClick of commit button (if any) wins
                  setTimeout(() => setMkdirInput(null), 100)
                }}
              />
            </div>
          )}

          {uploadingCount > 0 && (
            <div className={styles.uploadingHint}>
              正在上传 {uploadingCount} 个文件…
            </div>
          )}

          {/* Stage D: filter input - hides non-matching names in current dir */}
          <div className={styles.filterRow}>
            <input
              className={styles.filterInput}
              type="text"
              placeholder="筛选文件…"
              value={filterText}
              onChange={(ev) => setFilterText(ev.target.value)}
              aria-label="筛选文件"
            />
            {filterText && (
              <button
                className={styles.actionBtn}
                onClick={() => setFilterText('')}
                title="清除筛选"
              >
                <XCircle size={12} />
              </button>
            )}
          </div>

          {/* Stage D: sort header - click to toggle column / direction */}
          <div className={styles.sortHeader}>
            <button
              className={`${styles.sortBtn} ${sortBy === 'name' ? styles.sortBtnActive : ''}`}
              onClick={() => handleSortClick('name')}
            >
              名称 {sortBy === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
            </button>
            <button
              className={`${styles.sortBtn} ${sortBy === 'size' ? styles.sortBtnActive : ''}`}
              onClick={() => handleSortClick('size')}
            >
              大小 {sortBy === 'size' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
            </button>
            <button
              className={`${styles.sortBtn} ${sortBy === 'mtime' ? styles.sortBtnActive : ''}`}
              onClick={() => handleSortClick('mtime')}
            >
              修改时间 {sortBy === 'mtime' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
            </button>
          </div>

          {/* Stage D: bulk action bar - sticky above the list when any
              entries are selected. */}
          {selectedPaths.size > 0 && (
            <div className={styles.bulkBar}>
              <span className={styles.bulkCount}>
                {selectedPaths.size} 已选
              </span>
              <button
                className={styles.bulkBtn}
                onClick={handleBulkDownload}
                disabled={bulkActionLoading}
                title="下载选中项为 tar.gz"
              >
                <DownloadIcon size={12} /> 下载
              </button>
              <button
                className={`${styles.bulkBtn} ${styles.bulkBtnDanger}`}
                onClick={handleBulkDeleteRequest}
                disabled={bulkActionLoading}
                title="删除选中项（受保护条目将被跳过）"
              >
                <TrashIcon size={12} /> 删除
              </button>
              <button
                className={styles.bulkBtn}
                onClick={clearSelection}
                title="清除选择"
              >
                清除
              </button>
            </div>
          )}

          {entriesLoading && <div className={styles.loading}>Loading…</div>}
          {entriesError && <div className={styles.error}>Error: {entriesError}</div>}
          {!entriesLoading && !entriesError && (
            <div className={styles.entryList}>
              {currentPath !== '.' && currentPath !== '' && (
                <div className={styles.entry} onClick={handleGoUp}>
                  <span />
                  <FolderIcon size={14} />
                  <span className={styles.entryName}>..</span>
                  <span />
                </div>
              )}
              {displayedEntries.length === 0 ? (
                <div className={styles.empty}>
                  {filterText ? `无匹配项 "${filterText}"` : '（空）'}
                </div>
              ) : (
                displayedEntries.map((e) => (
                  <div
                    key={e.path}
                    data-name={e.name}
                    className={`${styles.entry} ${selectedPaths.has(e.path) ? styles.entrySelected : ''}`}
                    onClick={() => e.isDir ? handleEnterDir(e.path) : openPreview(e)}
                  >
                    <input
                      type="checkbox"
                      className={styles.entryCheckbox}
                      checked={selectedPaths.has(e.path)}
                      onChange={() => toggleSelect(e.path)}
                      onClick={(ev) => ev.stopPropagation()}
                      aria-label={`选择 ${e.name}`}
                    />
                    {e.isSymlink ? <SymlinkIcon size={14} /> :
                      e.isDir ? <FolderIcon size={14} /> : <FileIcon size={14} />}
                    {renamingPath === e.path ? (
                      <input
                        autoFocus
                        className={styles.renameInput}
                        value={renameValue}
                        onChange={(ev) => setRenameValue(ev.target.value)}
                        onKeyDown={(ev) => {
                          if (ev.key === 'Enter') commitRename(e)
                          else if (ev.key === 'Escape') setRenamingPath(null)
                        }}
                        onBlur={() => setRenamingPath(null)}
                        onClick={(ev) => ev.stopPropagation()}
                      />
                    ) : (
                      <span className={styles.entryName} title={e.path}>
                        {e.name}
                        <span className={styles.entryMeta} style={{ marginLeft: 8 }}>
                          {!e.isDir && <span>{formatSize(e.size)}</span>}
                          <span>{formatMtime(e.mtime)}</span>
                        </span>
                      </span>
                    )}
                    <span className={styles.entryActions}>
                      {!e.isDir && (
                        <button
                          className={styles.actionBtn}
                          onClick={(ev) => { ev.stopPropagation(); handleDownload(e) }}
                          title="下载"
                        >
                          <DownloadIcon size={12} />
                        </button>
                      )}
                      {e.isDir && !e.isSymlink && (
                        <button
                          className={styles.actionBtn}
                          onClick={(ev) => { ev.stopPropagation(); handleFolderDownload(e) }}
                          title="下载文件夹为 .tar.gz"
                        >
                          <ArchiveIcon size={12} />
                        </button>
                      )}
                      <button
                        className={styles.actionBtn}
                        onClick={(ev) => { ev.stopPropagation(); openProperties(e) }}
                        title="属性（大小、哈希、修改时间）"
                      >
                        <Info size={12} />
                      </button>
                      {isProtectedPath(e.path) ? (
                        <span
                          className={styles.protectedBadge}
                          title="受保护的默认文件夹 - 无法重命名或删除"
                        >
                          <Lock size={12} />
                        </span>
                      ) : (
                        <>
                          <button
                            className={styles.actionBtn}
                            onClick={(ev) => { ev.stopPropagation(); startRename(e) }}
                            title="重命名"
                          >
                            <PencilIcon size={12} />
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                            onClick={(ev) => { ev.stopPropagation(); handleDeleteRequest(e) }}
                            title="删除"
                          >
                            <TrashIcon size={12} />
                          </button>
                        </>
                      )}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {tab === 'jobs' && (
        <>
          <div className={styles.breadcrumb}>
            <span style={{ flex: 1 }}>Background jobs</span>
            <button
              className={styles.actionBtn}
              onClick={() => fetchJobs()}
              title="刷新"
            >
              <RefreshCw size={12} />
            </button>
          </div>
          {jobsLoading && jobs.length === 0 && <div className={styles.loading}>Loading…</div>}
          {jobsError && <div className={styles.error}>Error: {jobsError}</div>}
          {!jobsError && (
            <div className={styles.jobList}>
              {jobs.length === 0 ? (
                <div className={styles.empty}>暂无后台任务。</div>
              ) : (
                jobs.map((j) => (
                  <div key={j.job_id} className={styles.job}>
                    <Briefcase size={14} />
                    <span className={styles.jobName} title={j.tool_name}>
                      {j.label || j.tool_name}
                      <span className={styles.jobMeta} style={{ marginLeft: 8 }}>
                        <span className={`${styles.statusBadge} ${statusClass(j.status)}`}>
                          {j.status}
                        </span>
                        <span>{formatElapsed(j.started_at, j.ended_at)}</span>
                        {j.size_bytes !== undefined && (
                          <span>{formatSize(j.size_bytes)}</span>
                        )}
                      </span>
                    </span>
                    <span className={styles.jobActions}>
                      <button
                        className={styles.actionBtn}
                        onClick={() => handleViewJobLog(j)}
                        title="在文件标签页中查看日志"
                      >
                        <Eye size={12} />
                      </button>
                      {j.status === 'running' && (
                        <button
                          className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                          onClick={() => handleCancelJob(j)}
                          title="取消任务"
                        >
                          <XCircle size={12} />
                        </button>
                      )}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Drag-drop overlay - rendered on top of whichever tab is active. */}
      <div
        className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className={styles.dropHint}>
            <UploadIcon size={32} />
            <div>拖放到此处上传至 {currentPath === '.' ? '工作区根目录' : currentPath}</div>
          </div>
        )}
      </div>

      {/* Delete confirmation modal - replaces window.confirm so the user
          sees a clear in-context dialog (especially for recursive folder
          deletes that wipe many files). */}
      {deletePending && (
        <div className={styles.modalBackdrop} onClick={() => setDeletePending(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <AlertTriangle size={18} />
              <span>删除{deletePending.isDir ? '文件夹' : '文件'}？</span>
            </div>
            <div className={styles.modalBody}>
              {deletePending.isDir ? (
                <>
                  <code>{deletePending.path}</code> 及其<strong>所有内容</strong>{' '}
                  将被永久删除。此操作无法撤销。
                </>
              ) : (
                <>
                  <code>{deletePending.path}</code> 将被永久删除。
                </>
              )}
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.modalBtn}
                onClick={() => setDeletePending(null)}
              >
                取消
              </button>
              <button
                className={`${styles.modalBtn} ${styles.modalBtnDanger}`}
                onClick={() => performDelete(deletePending)}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete confirmation - lists how many will be deleted +
          whether the dir-recursion warning applies. */}
      {bulkDeletePending && (
        <div className={styles.modalBackdrop} onClick={() => setBulkDeletePending(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <AlertTriangle size={18} />
              <span>删除 {bulkDeletePending.length} 项？</span>
            </div>
            <div className={styles.modalBody}>
              {bulkDeletePending.some(e => e.isDir) && (
                <p>一个或多个目录将被<strong>递归</strong>删除。</p>
              )}
              <p>此操作无法撤销。待删除条目：</p>
              <ul className={styles.bulkList}>
                {bulkDeletePending.slice(0, 10).map(e => (
                  <li key={e.path}><code>{e.path}</code>{e.isDir ? ' /' : ''}</li>
                ))}
                {bulkDeletePending.length > 10 && (
                  <li>… 还有 {bulkDeletePending.length - 10} 项</li>
                )}
              </ul>
              {selectedPaths.size > bulkDeletePending.length && (
                <p className={styles.bulkHint}>
                  {selectedPaths.size - bulkDeletePending.length} 个受保护的默认文件夹将被跳过。
                </p>
              )}
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.modalBtn}
                onClick={() => setBulkDeletePending(null)}
                disabled={bulkActionLoading}
              >
                取消
              </button>
              <button
                className={`${styles.modalBtn} ${styles.modalBtnDanger}`}
                onClick={() => performBulkDelete(bulkDeletePending)}
                disabled={bulkActionLoading}
              >
                {bulkActionLoading ? '删除中…' : `删除 ${bulkDeletePending.length}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Properties popover - read-only metadata (size, mtime, mode, sha256,
          symlink target). Triggered by the Info button per row. */}
      {propertiesFor && (
        <div className={styles.modalBackdrop} onClick={closeProperties}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <Info size={18} />
              <span>属性</span>
            </div>
            <div className={styles.modalBody}>
              {propertiesLoading && <div>Loading…</div>}
              {propertiesError && (
                <div className={styles.error}>Error: {propertiesError}</div>
              )}
              {!propertiesLoading && !propertiesError && (
                <table className={styles.propertiesTable}>
                  <tbody>
                    <tr>
                      <th>路径</th>
                      <td><code>{propertiesFor.path}</code></td>
                    </tr>
                    <tr><th>类型</th><td>{propertiesFor.type}</td></tr>
                    {propertiesFor.type !== 'dir' && (
                      <tr><th>大小</th><td>{formatSize(propertiesFor.size)} ({propertiesFor.size} B)</td></tr>
                    )}
                    <tr><th>修改时间</th><td>{formatMtime(propertiesFor.mtime)}</td></tr>
                    <tr><th>权限模式</th><td><code>{propertiesFor.mode}</code></td></tr>
                    {propertiesFor.sha256 && (
                      <tr>
                        <th>SHA-256</th>
                        <td><code className={styles.hashCode}>{propertiesFor.sha256}</code></td>
                      </tr>
                    )}
                    {propertiesFor.target && (
                      <tr>
                        <th>符号链接目标</th>
                        <td><code>{propertiesFor.target}</code></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
            <div className={styles.modalActions}>
              <button className={styles.modalBtn} onClick={closeProperties}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overwrite confirmation modal - shown when upload returns 409. */}
      {overwritePending && (
        <div className={styles.modalBackdrop} onClick={() => setOverwritePending(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <AlertTriangle size={18} />
              <span>文件已存在</span>
            </div>
            <div className={styles.modalBody}>
              <code>{overwritePending.file.name}</code> 已存在于{' '}
              <code>{overwritePending.destDir === '.' ? '工作区根目录' : overwritePending.destDir}</code>。
              是否替换？
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.modalBtn}
                onClick={() => setOverwritePending(null)}
              >
                取消
              </button>
              <button
                className={`${styles.modalBtn} ${styles.modalBtnDanger}`}
                onClick={handleConfirmOverwrite}
              >
                覆盖
              </button>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  )
}
