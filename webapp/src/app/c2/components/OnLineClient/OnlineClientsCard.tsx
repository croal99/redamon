'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import styles from './OnlineClientsCard.module.css'
import type { CenterClientInfo } from '../../types/center'
import { useBLinkClient } from '../../hooks'

function formatConnectAt(ts: number) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString()
}

export type OnlineClientsCardProps = {
  onConnectClient?: (client: CenterClientInfo) => void
}

export function OnlineClientsCard({ onConnectClient }: OnlineClientsCardProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)

  const { clientList, fetchClientList } = useBLinkClient()

  const refreshClients = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await fetchClientList()
      setLastUpdatedAt(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : '请求失败')
    } finally {
      setLoading(false)
    }
  }, [fetchClientList])

  useEffect(() => {
    refreshClients()
    const timer = setInterval(refreshClients, 50000)
    return () => clearInterval(timer)
  }, [refreshClients])

  const count = clientList.length
  const sorted = useMemo(() => {
    return [...clientList].sort((a, b) => (b.connect_at ?? 0) - (a.connect_at ?? 0))
  }, [clientList])

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <h3 className={styles.title}>在线客户端</h3>
          <span className={styles.meta}>
            数量：{count}
            {lastUpdatedAt ? ` · 更新时间：${lastUpdatedAt.toLocaleTimeString()}` : ''}
          </span>
        </div>
        <div className={styles.toolbarRight}>
          <button type="button" className={styles.refreshButton} onClick={refreshClients} disabled={loading}>
            {loading ? <Loader2 size={14} className={styles.spinner} /> : <RefreshCw size={14} />}
            刷新
          </button>
        </div>
      </div>

      {error ? (
        <div className={styles.errorBar}>
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      ) : null}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>客户端ID</th>
              <th className={styles.th}>主机名</th>
              <th className={styles.th}>主机ID</th>
              <th className={styles.th}>远程地址</th>
              <th className={styles.th}>连接时间</th>
              <th className={styles.th}>操作</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr className={styles.tr}>
                <td className={styles.stateRow} colSpan={6}>
                  {loading ? '加载中…' : '暂无在线客户端'}
                </td>
              </tr>
            ) : (
              sorted.map((c) => (
                <tr
                  key={c.client_id || `${c.host_id ?? ''}-${c.remote_addr ?? ''}-${c.connect_at ?? 0}`}
                  className={styles.tr}
                >
                  <td className={styles.td}>{c.client_id ?? ''}</td>
                  <td className={styles.td}>{c.hostname ?? ''}</td>
                  <td className={styles.td}>{c.host_id ?? ''}</td>
                  <td className={styles.td}>{c.remote_addr ?? ''}</td>
                  <td className={styles.td}>{formatConnectAt(c.connect_at ?? 0)}</td>
                  <td className={styles.td}>
                    <button
                      type="button"
                      className={styles.refreshBtn}
                      onClick={() => onConnectClient?.(c)}
                      disabled={!c.client_id}
                    >
                      连接
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
