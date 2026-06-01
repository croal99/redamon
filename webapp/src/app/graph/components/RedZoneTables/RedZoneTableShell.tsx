'use client'

import { memo, useCallback, useState, type ReactNode } from 'react'
import { Loader2, AlertTriangle, Database, Search, Download, RefreshCw, SearchX } from 'lucide-react'
import styles from './RedZoneTableShell.module.css'
import {
  exportRedZoneCsv,
  exportRedZoneJson,
  exportRedZoneMarkdown,
  type RedZoneExportConfig,
} from './exportCsv'

interface RedZoneTableShellProps {
  title: string
  meta?: string
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  /** Provide rows + columns to render CSV/JSON/MD export buttons. */
  exportConfig?: RedZoneExportConfig
  /** Legacy single-button CSV callback (kept for back-compat). */
  onExport?: () => void
  onRefresh?: () => void
  isLoading: boolean
  error: string | null
  rowCount: number
  filteredRowCount: number
  emptyLabel?: string
  noMatchLabel?: string
  children: ReactNode
}

export const RedZoneTableShell = memo(function RedZoneTableShell({
  title,
  meta,
  search,
  onSearchChange,
  searchPlaceholder = '搜索...',
  exportConfig,
  onExport,
  onRefresh,
  isLoading,
  error,
  rowCount,
  filteredRowCount,
  emptyLabel = '暂无发现。运行侦察扫描以填充此表。',
  noMatchLabel = '没有匹配的行。',
  children,
}: RedZoneTableShellProps) {
  const [exporting, setExporting] = useState<'csv' | 'json' | 'md' | null>(null)
  const runExport = useCallback(
    async (format: 'csv' | 'json' | 'md', fn: () => Promise<void>) => {
      if (exporting) return
      setExporting(format)
      try { await fn() } finally { setExporting(null) }
    },
    [exporting],
  )
  const handleCsv = useCallback(() => {
    if (!exportConfig) return
    runExport('csv', () =>
      exportRedZoneCsv(exportConfig.rows, exportConfig.sheetName, exportConfig.columns, exportConfig.fileSlug),
    )
  }, [exportConfig, runExport])
  const handleJson = useCallback(() => {
    if (!exportConfig) return
    runExport('json', () =>
      exportRedZoneJson(exportConfig.rows, exportConfig.sheetName, exportConfig.columns, exportConfig.fileSlug),
    )
  }, [exportConfig, runExport])
  const handleMd = useCallback(() => {
    if (!exportConfig) return
    runExport('md', () =>
      exportRedZoneMarkdown(exportConfig.rows, exportConfig.sheetName, exportConfig.columns, exportConfig.fileSlug),
    )
  }, [exportConfig, runExport])

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.title}>{title}</span>
          {meta && <span className={styles.meta}>{meta}</span>}
          <span className={styles.rowCount}>
            {filteredRowCount === rowCount ? `${rowCount}` : `${filteredRowCount}/${rowCount}`} 行
          </span>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.searchWrapper}>
            <Search size={12} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={searchPlaceholder}
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              aria-label={`搜索 ${title}`}
            />
          </div>
          {onRefresh && (
            <button className={styles.iconBtn} onClick={onRefresh} aria-label="刷新" title="刷新">
              <RefreshCw size={12} />
            </button>
          )}
          {exportConfig ? (
            <>
              <button className={styles.exportBtn} onClick={handleCsv} disabled={!!exporting} aria-label="导出为 CSV" title="导出为 CSV">
                {exporting === 'csv'
                  ? <Loader2 size={12} className={styles.spinner} />
                  : <Download size={12} />}
                <span>CSV</span>
              </button>
              <button className={styles.exportBtn} onClick={handleJson} disabled={!!exporting} aria-label="导出为 JSON" title="导出为 JSON">
                {exporting === 'json'
                  ? <Loader2 size={12} className={styles.spinner} />
                  : <Download size={12} />}
                <span>JSON</span>
              </button>
              <button className={styles.exportBtn} onClick={handleMd} disabled={!!exporting} aria-label="导出为 Markdown" title="导出为 Markdown">
                {exporting === 'md'
                  ? <Loader2 size={12} className={styles.spinner} />
                  : <Download size={12} />}
                <span>MD</span>
              </button>
            </>
          ) : onExport ? (
            <button className={styles.exportBtn} onClick={onExport} aria-label="导出为 CSV">
              <Download size={12} />
              <span>CSV</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className={styles.body}>
        {isLoading ? (
          <div className={styles.stateContainer}>
            <Loader2 size={24} className={styles.spinner} />
            <p className={styles.stateText}>加载中...</p>
          </div>
        ) : error ? (
          <div className={styles.stateContainer}>
            <AlertTriangle size={24} className={styles.errorIcon} />
            <p className={styles.stateText}>加载失败</p>
            <p className={styles.stateSubtext}>{error}</p>
          </div>
        ) : rowCount === 0 ? (
          <div className={styles.stateContainer}>
            <Database size={24} className={styles.emptyIcon} />
            <p className={styles.stateText}>{emptyLabel}</p>
          </div>
        ) : filteredRowCount === 0 ? (
          <div className={styles.stateContainer}>
            <SearchX size={24} className={styles.emptyIcon} />
            <p className={styles.stateText}>{noMatchLabel}</p>
            <p className={styles.stateSubtext}>{rowCount} 行总计 — 清除搜索以查看全部。</p>
          </div>
        ) : (
          <div className={styles.tableScroll}>{children}</div>
        )}
      </div>
    </div>
  )
})
