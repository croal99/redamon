'use client'

import { memo, useState, useRef, useEffect, useCallback, type MouseEvent as ReactMouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Waypoints, Table2, Terminal, Shield, Search, Download, SquareTerminal, Filter, Plus, Trash2, X, ChevronDown, Code, GitBranch, Info } from 'lucide-react'
import { Toggle } from '@/components/ui'
import styles from './ViewTabs.module.css'

export type ViewMode = 'graph' | 'graphViews' | 'table' | 'sessions' | 'terminal' | 'roe' | 'ai-attack' | 'ai-chat'

interface DataFilterView {
  id: string
  name: string
  description?: string
}

interface ViewTabsProps {
  activeView: ViewMode
  onViewChange: (view: ViewMode) => void
  variant?: 'default' | 'client'
  // Table-only controls
  globalFilter?: string
  onGlobalFilterChange?: (value: string) => void
  onExport?: () => void
  totalRows?: number
  filteredRows?: number
  // Sessions badge
  sessionCount?: number
  // Data filter selector
  dataFilters?: DataFilterView[]
  selectedFilterId?: string | null
  onSelectFilter?: (id: string | null) => void
  onDeleteFilter?: (id: string) => void
  // Table view mode (All Nodes vs specialized views)
  tableViewMode?: 'all' | 'jsRecon'
  onTableViewModeChange?: (mode: 'all' | 'jsRecon') => void
  // JS Recon table controls
  jsReconSearch?: string
  onJsReconSearchChange?: (value: string) => void
  onJsReconExportXlsx?: () => void
  jsReconMeta?: string
  // Project ID for navigation
  projectId?: string | null
  // View mode toggles (shown in right section when graph active)
  is3D?: boolean
  showLabels?: boolean
  onToggle3D?: (value: boolean) => void
  onToggleLabels?: (value: boolean) => void
  nodeCount?: number
}

export const ViewTabs = memo(function ViewTabs({
  activeView,
  onViewChange,
  variant = 'default',
  globalFilter,
  onGlobalFilterChange,
  onExport,
  totalRows,
  filteredRows,
  sessionCount,
  dataFilters,
  selectedFilterId,
  onSelectFilter,
  onDeleteFilter,
  projectId,
  tableViewMode = 'all',
  onTableViewModeChange,
  jsReconSearch,
  onJsReconSearchChange,
  onJsReconExportXlsx,
  jsReconMeta,
  is3D,
  showLabels,
  onToggle3D,
  onToggleLabels,
  nodeCount = 0,
}: ViewTabsProps) {
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [tableMenuOpen, setTableMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const tableMenuRef = useRef<HTMLDivElement>(null)

  const selectedFilter = dataFilters?.find(f => f.id === selectedFilterId)
  const hasFilters = dataFilters && dataFilters.length > 0

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  // Close table menu on outside click
  useEffect(() => {
    if (!tableMenuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (tableMenuRef.current && !tableMenuRef.current.contains(e.target as Node)) {
        setTableMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [tableMenuOpen])

  const handleSelectFilter = useCallback((id: string) => {
    if (id === selectedFilterId) {
      onSelectFilter?.(null)
    } else {
      onSelectFilter?.(id)
    }
    setDropdownOpen(false)
  }, [selectedFilterId, onSelectFilter])

  const handleDeleteFilter = useCallback((e: ReactMouseEvent, id: string) => {
    e.stopPropagation()
    onDeleteFilter?.(id)
    if (id === selectedFilterId) {
      onSelectFilter?.(null)
    }
  }, [onDeleteFilter, selectedFilterId, onSelectFilter])

  const handleClearFilter = useCallback((e: ReactMouseEvent) => {
    e.stopPropagation()
    onSelectFilter?.(null)
    setDropdownOpen(false)
  }, [onSelectFilter])

  const toggleDropdown = useCallback(() => setDropdownOpen(o => !o), [])

  return (
    <div className={styles.tabBar}>
      <div className={styles.tabs} role="tablist" aria-label="Client 视图">
        <button
          role="tab"
          aria-selected={activeView === 'sessions'}
          className={`${styles.tab} ${activeView === 'sessions' ? styles.tabActive : ''}`}
          onClick={() => onViewChange('sessions')}
        >
          <Info size={14} />
          <span>信息</span>
        </button>
        <button
          role="tab"
          aria-selected={activeView === 'terminal'}
          className={`${styles.tab} ${activeView === 'terminal' ? styles.tabActive : ''}`}
          onClick={() => onViewChange('terminal')}
        >
          <SquareTerminal size={14} />
          <span>终端</span>
        </button>
        <button
          role="tab"
          aria-selected={activeView === 'ai-chat'}
          className={`${styles.tab} ${activeView === 'ai-chat' ? styles.tabActive : ''}`}
          onClick={() => onViewChange('ai-chat')}
        >
          <SquareTerminal size={14} />
          <span>AI Chat</span>
        </button>
        <button
          role="tab"
          aria-selected={activeView === 'ai-attack'}
          className={`${styles.tab} ${activeView === 'ai-attack' ? styles.tabActive : ''}`}
          onClick={() => onViewChange('ai-attack')}
        >
          <Shield size={14} />
          <span>AI 攻击</span>
        </button>
      </div>
    </div>
  )

})
