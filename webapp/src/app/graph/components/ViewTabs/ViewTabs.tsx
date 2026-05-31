'use client'

import { memo, useState, useRef, useEffect, useCallback } from 'react'
import { Waypoints, Table2, Terminal, Shield, Search, Download, Loader2, SquareTerminal, Filter, Plus, Trash2, X, ChevronDown, Code, Target, Zap, Flag, Key, Server, Boxes, LockKeyhole, Bug, Network, Mail, ShieldAlert, Package, History, Layers } from 'lucide-react'
import { Toggle } from '@/components/ui'
import { AUTO_2D_THRESHOLD } from '../GraphCanvas'
import styles from './ViewTabs.module.css'

export type ViewMode = 'graph' | 'graphViews' | 'table' | 'sessions' | 'terminal' | 'roe'

export type TableViewMode =
  | 'nodeDetails'
  | 'all'
  | 'jsRecon'
  | 'killChain'
  | 'blastRadius'
  | 'takeover'
  | 'secrets'
  | 'netInitAccess'
  | 'graphql'
  | 'webInitAccess'
  | 'paramMatrix'
  | 'sharedInfra'
  | 'dnsEmail'
  | 'threatIntel'
  | 'supplyChain'
  | 'dnsDrift'

const TABLE_MODE_LABELS: Record<TableViewMode, string> = {
  nodeDetails: '节点详情',
  all: '所有节点',
  jsRecon: 'JS 侦察',
  killChain: '攻击杀伤链',
  blastRadius: '技术爆炸半径',
  takeover: '子域名接管',
  secrets: '敏感信息 & 凭据',
  netInitAccess: '网络初始访问',
  graphql: 'GraphQL 风险分类账',
  webInitAccess: 'Web 初始访问',
  paramMatrix: '参数矩阵',
  sharedInfra: '共享基础设施',
  dnsEmail: 'DNS 与邮件态势',
  threatIntel: '威胁情报叠加',
  supplyChain: '供应链',
  dnsDrift: '历史 DNS 漂移',
}

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
  onExportJson?: () => void
  onExportMarkdown?: () => void
  /** Which All-Nodes export format is currently being generated, if any. */
  allNodesExporting?: 'csv' | 'json' | 'md' | null
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
  // Table view mode (All Nodes vs specialized views vs red-zone analytics)
  tableViewMode?: TableViewMode
  onTableViewModeChange?: (mode: TableViewMode) => void
  // JS Recon table controls
  jsReconSearch?: string
  onJsReconSearchChange?: (value: string) => void
  onJsReconExportCsv?: () => void
  onJsReconExportJson?: () => void
  onJsReconExportMarkdown?: () => void
  /** Which JS Recon export format is currently being generated, if any. */
  jsReconExporting?: 'csv' | 'json' | 'md' | null
  jsReconMeta?: string
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
  onExportJson,
  onExportMarkdown,
  allNodesExporting,
  totalRows,
  filteredRows,
  sessionCount,
  tunnelStatus,
  dataFilters,
  selectedFilterId,
  onSelectFilter,
  onDeleteFilter,
  tableViewMode = 'all',
  onTableViewModeChange,
  jsReconSearch,
  onJsReconSearchChange,
  onJsReconExportCsv,
  onJsReconExportJson,
  onJsReconExportMarkdown,
  jsReconExporting,
  jsReconMeta,
  is3D,
  showLabels,
  onToggle3D,
  onToggleLabels,
  nodeCount = 0,
}: ViewTabsProps) {
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
      <div className={styles.tabs} role="tablist" aria-label="View mode">
        {/* Filter group -- create + select as a unified element */}
        <div className={styles.filterGroup}>
          <button
            role="tab"
            aria-selected={activeView === 'graphViews'}
            className={`${styles.filterGroupCreate} ${activeView === 'graphViews' ? styles.filterGroupCreateActive : ''}`}
            onClick={() => onViewChange('graphViews')}
            title="攻击面整形器"
          >
            <Filter size={13} />
            <Plus size={10} className={styles.createFilterPlus} />
          </button>

          {hasFilters && (
            <div className={styles.filterGroupSelect} ref={dropdownRef}>
              <button
                className={`${styles.filterGroupPill} ${selectedFilter ? styles.filterGroupPillActive : ''}`}
                onClick={() => setDropdownOpen(prev => !prev)}
                title={selectedFilter ? `当前攻击面: ${selectedFilter.name}` : '选择一个攻击面'}
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
                  <span className={styles.filterPillLabel}>攻击面过滤</span>
                )}
              </button>

              {dropdownOpen && (
                <div className={styles.filterDropdown}>
                  <div className={styles.filterDropdownHeader}>攻击面整形器</div>
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
          <span>拓扑图谱</span>
        </button>
        <div ref={tableMenuRef} className={styles.tableMenuContainer}>
          <button
            role="tab"
            aria-selected={activeView === 'table'}
            className={`${styles.tab} ${activeView === 'table' ? styles.tabActive : ''}`}
            onClick={() => onViewChange('table')}
          >
            {(() => {
              const mode = tableViewMode ?? 'all'
              const Icon =
                mode === 'nodeDetails' ? Layers
                : mode === 'jsRecon' ? Code
                : mode === 'killChain' ? Target
                : mode === 'blastRadius' ? Zap
                : mode === 'takeover' ? Flag
                : mode === 'secrets' ? Key
                : mode === 'netInitAccess' ? Server
                : mode === 'graphql' ? Boxes
                : mode === 'webInitAccess' ? LockKeyhole
                : mode === 'paramMatrix' ? Bug
                : mode === 'sharedInfra' ? Network
                : mode === 'dnsEmail' ? Mail
                : mode === 'threatIntel' ? ShieldAlert
                : mode === 'supplyChain' ? Package
                : mode === 'dnsDrift' ? History
                : Table2
              return <Icon size={14} />
            })()}
            <span>{TABLE_MODE_LABELS[tableViewMode ?? 'all']}</span>
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
                className={`${styles.tableDropdownItem} ${tableViewMode === 'nodeDetails' ? styles.tableDropdownItemActive : ''}`}
                onClick={() => { onTableViewModeChange?.('nodeDetails'); setTableMenuOpen(false); onViewChange('table') }}
              >
                <Layers size={12} /> 节点详情
              </button>
              <button
                className={`${styles.tableDropdownItem} ${tableViewMode === 'all' ? styles.tableDropdownItemActive : ''}`}
                onClick={() => { onTableViewModeChange?.('all'); setTableMenuOpen(false); onViewChange('table') }}
              >
                <Table2 size={12} /> 所有节点
              </button>
              <button
                className={`${styles.tableDropdownItem} ${tableViewMode === 'jsRecon' ? styles.tableDropdownItemActive : ''}`}
                onClick={() => { onTableViewModeChange?.('jsRecon'); setTableMenuOpen(false); onViewChange('table') }}
              >
                <Code size={12} /> JS 侦察
              </button>
              <button
                className={`${styles.tableDropdownItem} ${tableViewMode === 'killChain' ? styles.tableDropdownItemActive : ''}`}
                onClick={() => { onTableViewModeChange?.('killChain'); setTableMenuOpen(false); onViewChange('table') }}
              >
                <Target size={12} /> 攻击杀伤链
              </button>
              <button
                className={`${styles.tableDropdownItem} ${tableViewMode === 'blastRadius' ? styles.tableDropdownItemActive : ''}`}
                onClick={() => { onTableViewModeChange?.('blastRadius'); setTableMenuOpen(false); onViewChange('table') }}
              >
                <Zap size={12} /> 技术爆炸半径
              </button>
              <button
                className={`${styles.tableDropdownItem} ${tableViewMode === 'takeover' ? styles.tableDropdownItemActive : ''}`}
                onClick={() => { onTableViewModeChange?.('takeover'); setTableMenuOpen(false); onViewChange('table') }}
              >
                <Flag size={12} /> 子域名接管
              </button>
              <button
                className={`${styles.tableDropdownItem} ${tableViewMode === 'secrets' ? styles.tableDropdownItemActive : ''}`}
                onClick={() => { onTableViewModeChange?.('secrets'); setTableMenuOpen(false); onViewChange('table') }}
              >
                <Key size={12} /> 敏感信息 & 凭据
              </button>
              <button
                className={`${styles.tableDropdownItem} ${tableViewMode === 'netInitAccess' ? styles.tableDropdownItemActive : ''}`}
                onClick={() => { onTableViewModeChange?.('netInitAccess'); setTableMenuOpen(false); onViewChange('table') }}
              >
                <Server size={12} /> 网络初始访问
              </button>
              <button
                className={`${styles.tableDropdownItem} ${tableViewMode === 'graphql' ? styles.tableDropdownItemActive : ''}`}
                onClick={() => { onTableViewModeChange?.('graphql'); setTableMenuOpen(false); onViewChange('table') }}
              >
                <Boxes size={12} /> GraphQL 风险分类账
              </button>
              <button
                className={`${styles.tableDropdownItem} ${tableViewMode === 'webInitAccess' ? styles.tableDropdownItemActive : ''}`}
                onClick={() => { onTableViewModeChange?.('webInitAccess'); setTableMenuOpen(false); onViewChange('table') }}
              >
                <LockKeyhole size={12} /> Web 初始访问
              </button>
              <button
                className={`${styles.tableDropdownItem} ${tableViewMode === 'paramMatrix' ? styles.tableDropdownItemActive : ''}`}
                onClick={() => { onTableViewModeChange?.('paramMatrix'); setTableMenuOpen(false); onViewChange('table') }}
              >
                <Bug size={12} /> 参数矩阵
              </button>
              <button
                className={`${styles.tableDropdownItem} ${tableViewMode === 'sharedInfra' ? styles.tableDropdownItemActive : ''}`}
                onClick={() => { onTableViewModeChange?.('sharedInfra'); setTableMenuOpen(false); onViewChange('table') }}
              >
                <Network size={12} /> 共享基础设施
              </button>
              <button
                className={`${styles.tableDropdownItem} ${tableViewMode === 'dnsEmail' ? styles.tableDropdownItemActive : ''}`}
                onClick={() => { onTableViewModeChange?.('dnsEmail'); setTableMenuOpen(false); onViewChange('table') }}
              >
                <Mail size={12} /> DNS 与邮件态势
              </button>
              <button
                className={`${styles.tableDropdownItem} ${tableViewMode === 'threatIntel' ? styles.tableDropdownItemActive : ''}`}
                onClick={() => { onTableViewModeChange?.('threatIntel'); setTableMenuOpen(false); onViewChange('table') }}
              >
                <ShieldAlert size={12} /> 威胁情报叠加
              </button>
              <button
                className={`${styles.tableDropdownItem} ${tableViewMode === 'supplyChain' ? styles.tableDropdownItemActive : ''}`}
                onClick={() => { onTableViewModeChange?.('supplyChain'); setTableMenuOpen(false); onViewChange('table') }}
              >
                <Package size={12} /> 供应链
              </button>
              <button
                className={`${styles.tableDropdownItem} ${tableViewMode === 'dnsDrift' ? styles.tableDropdownItemActive : ''}`}
                onClick={() => { onTableViewModeChange?.('dnsDrift'); setTableMenuOpen(false); onViewChange('table') }}
              >
                <History size={12} /> 历史 DNS 漂移
              </button>
            </div>
          )}
        </div>
        <button
          role="tab"
          aria-selected={activeView === 'sessions'}
          className={`${styles.tab} ${activeView === 'sessions' ? styles.tabActive : ''}`}
          onClick={() => onViewChange('sessions')}
        >
          <Terminal size={14} />
          <span>反向 Shell</span>
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
          <span>RedAmon 终端</span>
        </button>
        <button
          role="tab"
          aria-selected={activeView === 'roe'}
          className={`${styles.tab} ${activeView === 'roe' ? styles.tabActive : ''}`}
          onClick={() => onViewChange('roe')}
        >
          <Shield size={14} />
          <span>RoE 授权书</span>
        </button>
      </div>

      <div className={styles.rightSection}>
      {activeView === 'graph' && onToggle3D && onToggleLabels && (
        <div className={styles.viewToggles}>
          <div title={nodeCount > AUTO_2D_THRESHOLD ? `已禁用 3D：图谱有 ${nodeCount.toLocaleString()} 个节点（3D 视图最多支持 ${AUTO_2D_THRESHOLD.toLocaleString()} 个节点）` : undefined}>
            <Toggle
              checked={nodeCount > AUTO_2D_THRESHOLD ? false : (is3D ?? false)}
              onChange={onToggle3D}
              labelOff="2D"
              labelOn="3D"
              disabled={nodeCount > AUTO_2D_THRESHOLD}
              aria-label="切换 2D/3D 视图"
            />
          </div>
          <Toggle
            checked={showLabels ?? false}
            onChange={onToggleLabels}
            labelOn="标签"
            aria-label="切换显示标签"
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
              placeholder="搜索..."
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
          <button className={styles.exportBtn} onClick={onExport} disabled={!!allNodesExporting} aria-label="导出为 CSV" title="导出为 CSV">
            {allNodesExporting === 'csv'
              ? <Loader2 size={12} className={styles.exportSpinner} />
              : <Download size={12} />}
            <span>CSV</span>
          </button>
          {onExportJson && (
            <button className={styles.exportBtn} onClick={onExportJson} disabled={!!allNodesExporting} aria-label="导出为 JSON" title="导出为 JSON">
              {allNodesExporting === 'json'
                ? <Loader2 size={12} className={styles.exportSpinner} />
                : <Download size={12} />}
              <span>JSON</span>
            </button>
          )}
          {onExportMarkdown && (
            <button className={styles.exportBtn} onClick={onExportMarkdown} disabled={!!allNodesExporting} aria-label="导出为 Markdown" title="导出为 Markdown">
              {allNodesExporting === 'md'
                ? <Loader2 size={12} className={styles.exportSpinner} />
                : <Download size={12} />}
              <span>MD</span>
            </button>
          )}
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
              placeholder="搜索 JS 侦察..."
              value={jsReconSearch || ''}
              onChange={e => onJsReconSearchChange(e.target.value)}
              aria-label="搜索 JS 侦察结果"
            />
          </div>
          {onJsReconExportCsv && (
            <button className={styles.exportBtn} onClick={onJsReconExportCsv} disabled={!!jsReconExporting} aria-label="导出为 CSV" title="导出为 CSV">
              {jsReconExporting === 'csv'
                ? <Loader2 size={12} className={styles.exportSpinner} />
                : <Download size={12} />}
              <span>CSV</span>
            </button>
          )}
          {onJsReconExportJson && (
            <button className={styles.exportBtn} onClick={onJsReconExportJson} disabled={!!jsReconExporting} aria-label="导出为 JSON" title="导出为 JSON">
              {jsReconExporting === 'json'
                ? <Loader2 size={12} className={styles.exportSpinner} />
                : <Download size={12} />}
              <span>JSON</span>
            </button>
          )}
          {onJsReconExportMarkdown && (
            <button className={styles.exportBtn} onClick={onJsReconExportMarkdown} disabled={!!jsReconExporting} aria-label="导出为 Markdown" title="导出为 Markdown">
              {jsReconExporting === 'md'
                ? <Loader2 size={12} className={styles.exportSpinner} />
                : <Download size={12} />}
              <span>MD</span>
            </button>
          )}
        </div>
      )}
      </div>
    </div>
  )
})
