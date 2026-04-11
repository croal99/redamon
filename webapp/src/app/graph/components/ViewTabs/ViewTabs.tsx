'use client'

import { memo, useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Waypoints, Table2, Terminal, Shield, Search, Download, SquareTerminal, Filter, Plus, Trash2, X, ChevronDown, Code, GitBranch } from 'lucide-react'
import { Toggle } from '@/components/ui'
import styles from './ViewTabs.module.css'

export type ViewMode = 'graph' | 'graphViews' | 'table' | 'sessions' | 'terminal' | 'roe'

export interface TunnelInfo {
  active: boolean
  host?: string
  port?: number
  srvPort?: number
}

export interface TunnelStatus {
  ngrok: TunnelInfo
  chisel: TunnelInfo
}

interface DataFilterView {
  id: string
  name: string
  description?: string
}

interface ViewTabsProps {
  activeView: ViewMode
  onViewChange: (view: ViewMode) => void
  // Table-only controls
  globalFilter?: string
  onGlobalFilterChange?: (value: string) => void
  onExport?: () => void
  totalRows?: number
  filteredRows?: number
  // Sessions badge
  sessionCount?: number
  // Tunnel status
  tunnelStatus?: TunnelStatus
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
  globalFilter,
  onGlobalFilterChange,
  onExport,
  totalRows,
  filteredRows,
  sessionCount,
  tunnelStatus,
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

  const handleDeleteFilter = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onDeleteFilter?.(id)
  }, [onDeleteFilter])

  const handleClearFilter = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onSelectFilter?.(null)
    setDropdownOpen(false)
  }, [onSelectFilter])

  return (
    <div className={styles.tabBar}>
      <div className={styles.tabs} role="tablist" aria-label="视图模式">
        {/* Filter group -- create + select as a unified element */}
        <div className={styles.filterGroup}>
          <button
            role="tab"
            aria-selected={activeView === 'graphViews'}
            className={`${styles.filterGroupCreate} ${activeView === 'graphViews' ? styles.filterGroupCreateActive : ''}`}
            onClick={() => onViewChange('graphViews')}
            title="攻击面过滤器"
          >
            <Filter size={13} />
            <Plus size={10} className={styles.createFilterPlus} />
          </button>

          {hasFilters && (
            <div className={styles.filterGroupSelect} ref={dropdownRef}>
              <button
                className={`${styles.filterGroupPill} ${selectedFilter ? styles.filterGroupPillActive : ''}`}
                onClick={() => setDropdownOpen(prev => !prev)}
                title={selectedFilter ? `当前攻击面：${selectedFilter.name}` : '选择攻击面'}
              >
                {selectedFilter ? (
                  <>
                    <span className={styles.filterPillName}>{selectedFilter.name}</span>
                    <span
                      className={styles.filterPillClear}
                      onClick={handleClearFilter}
                      title="清除攻击面"
                    >
                      <X size={10} />
                    </span>
                  </>
                ) : (
                  <span className={styles.filterPillLabel}>攻击面</span>
                )}
              </button>

              {dropdownOpen && (
                <div className={styles.filterDropdown}>
                  <div className={styles.filterDropdownHeader}>攻击面过滤器</div>
                  <div className={styles.filterDropdownList}>
                    {dataFilters!.map(f => (
                      <div
                        key={f.id}
                        className={`${styles.filterDropdownItem} ${f.id === selectedFilterId ? styles.filterDropdownItemActive : ''}`}
                        onClick={() => handleSelectFilter(f.id)}
                      >
                        <div className={styles.filterDropdownInfo}>
                          <span className={styles.filterDropdownName}>{f.name}</span>
                          {f.description && (
                            <span className={styles.filterDropdownDesc}>{f.description}</span>
                          )}
                        </div>
                        <button
                          className={styles.filterDropdownDelete}
                          onClick={(e) => handleDeleteFilter(f.id, e)}
                          title="删除攻击面"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          role="tab"
          aria-selected={activeView === 'graph'}
          className={`${styles.tab} ${activeView === 'graph' ? styles.tabActive : ''}`}
          onClick={() => onViewChange('graph')}
        >
          <Waypoints size={14} />
          <span>图谱</span>
        </button>
        <div ref={tableMenuRef} className={styles.tableMenuContainer}>
          <button
            role="tab"
            aria-selected={activeView === 'table'}
            className={`${styles.tab} ${activeView === 'table' ? styles.tabActive : ''}`}
            onClick={() => onViewChange('table')}
          >
            {tableViewMode === 'jsRecon' ? <Code size={14} /> : <Table2 size={14} />}
            <span>{tableViewMode === 'jsRecon' ? 'JS 侦察' : '全部节点'}</span>
            <ChevronDown
              size={18}
              strokeWidth={3}
              className={styles.tabDropdownIcon}
              onClick={(e) => { e.stopPropagation(); setTableMenuOpen(!tableMenuOpen) }}
            />
          </button>
          {tableMenuOpen && (
            <div className={styles.tableDropdownMenu}>
              <button
                className={`${styles.tableDropdownItem} ${tableViewMode === 'all' ? styles.tableDropdownItemActive : ''}`}
                onClick={() => { onTableViewModeChange?.('all'); setTableMenuOpen(false); onViewChange('table') }}
              >
                <Table2 size={12} /> 全部节点
              </button>
              <button
                className={`${styles.tableDropdownItem} ${tableViewMode === 'jsRecon' ? styles.tableDropdownItemActive : ''}`}
                onClick={() => { onTableViewModeChange?.('jsRecon'); setTableMenuOpen(false); onViewChange('table') }}
              >
                <Code size={12} /> JS Recon
              </button>
            </div>
          )}
        </div>
        {projectId && (
          <button
            role="tab"
            aria-selected={false}
            className={styles.tab}
            onClick={() => router.push(`/projects/${projectId}/settings`)}
          >
            <GitBranch size={14} />
            <span>侦察流水线</span>
          </button>
        )}
        <button
          role="tab"
          aria-selected={activeView === 'sessions'}
          className={`${styles.tab} ${activeView === 'sessions' ? styles.tabActive : ''}`}
          onClick={() => onViewChange('sessions')}
        >
          <Terminal size={14} />
          <span>反弹 Shell</span>
          {sessionCount != null && sessionCount > 0 && (
            <span className={styles.badge}>{sessionCount}</span>
          )}
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
          aria-selected={activeView === 'roe'}
          className={`${styles.tab} ${activeView === 'roe' ? styles.tabActive : ''}`}
          onClick={() => onViewChange('roe')}
        >
          <Shield size={14} />
          <span>RoE</span>
        </button>
      </div>

      <div className={styles.rightSection}>
      {activeView === 'graph' && onToggle3D && onToggleLabels && (
        <div className={styles.viewToggles}>
          <div title={nodeCount > 1000 ? `已禁用 3D：图谱包含 ${nodeCount.toLocaleString()} 个节点（3D 最多支持 1,000 个）` : undefined}>
            <Toggle
              checked={nodeCount > 1000 ? false : (is3D ?? false)}
              onChange={onToggle3D}
              labelOff="2D"
              labelOn="3D"
              disabled={nodeCount > 1000}
              aria-label="切换 2D/3D"
            />
          </div>
          <Toggle
            checked={showLabels ?? false}
            onChange={onToggleLabels}
            labelOn="标签"
            aria-label="切换标签"
          />
        </div>
      )}

      {activeView === 'table' && tableViewMode === 'all' && onGlobalFilterChange && (
        <div className={styles.tableControls}>
          <div className={styles.searchWrapper}>
            <Search size={12} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="搜索…"
              value={globalFilter || ''}
              onChange={e => onGlobalFilterChange(e.target.value)}
              aria-label="搜索节点"
            />
          </div>
          <span className={styles.rowCount}>
            {filteredRows === totalRows
              ? `${totalRows}`
              : `${filteredRows}/${totalRows}`}
          </span>
          <button className={styles.exportBtn} onClick={onExport} aria-label="导出为 Excel">
            <Download size={12} />
            <span>XLSX</span>
          </button>
        </div>
      )}

      {activeView === 'table' && tableViewMode === 'jsRecon' && onJsReconSearchChange && (
        <div className={styles.tableControls}>
          {jsReconMeta && <span className={styles.rowCount}>{jsReconMeta}</span>}
          <div className={styles.searchWrapper}>
            <Search size={12} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="搜索 JS 侦察…"
              value={jsReconSearch || ''}
              onChange={e => onJsReconSearchChange(e.target.value)}
              aria-label="搜索 JS 侦察发现"
            />
          </div>
          {onJsReconExportXlsx && (
            <button className={styles.exportBtn} onClick={onJsReconExportXlsx} aria-label="导出为 Excel">
              <Download size={12} />
              <span>XLSX</span>
            </button>
          )}
        </div>
      )}
      </div>
    </div>
  )
})
