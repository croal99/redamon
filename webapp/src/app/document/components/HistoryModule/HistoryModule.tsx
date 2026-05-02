import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import styles from './HistoryModule.module.css'

type HistoryEntry = {
  id: string
  time: string
  type: 'chat' | 'analysis' | 'upload'
  summary: string
  status: 'success' | 'failed' | 'pending'
  detail?: any
}

const TYPE_MAP: Record<string, string> = {
  chat: '💬 对话',
  analysis: '🔍 分析',
  upload: '📤 上传'
}

const STATUS_MAP: Record<string, { label: string, color: string }> = {
  success: { label: '成功', color: 'var(--success-color, #10b981)' },
  failed: { label: '失败', color: 'var(--error-color, #ef4444)' },
  pending: { label: '处理中', color: 'var(--warning-color, #f59e0b)' }
}

export function HistoryModule() {
  const [uid] = useState('0') // 模拟当前用户 ID
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [fetching, setFetching] = useState(true)

  const fetchHistory = useCallback(async () => {
    setFetching(true)
    try {
      const res = await fetch(`/api/history?uid=${uid}`)
      if (!res.ok) throw new Error('获取历史记录失败')
      const result = await res.json()
      if (result.code === 200 && result.data) {
        setHistory(result.data)
      }
    } catch (e) {
      toast.error(String(e))
    } finally {
      setFetching(false)
    }
  }, [uid])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const formatDate = (isoString: string) => {
    const d = new Date(isoString)
    return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.title}>📜 历史记录</div>
        <div className={styles.subtitle}>对话、分析任务与产物的追溯</div>
      </div>

      <div className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">活动记录</div>
            <div className="cardSubtitle">您在系统中的所有操作记录</div>
          </div>
          <button 
            className="secondaryButton" 
            onClick={fetchHistory}
            disabled={fetching}
            style={{ padding: '6px 12px', fontSize: '13px' }}
          >
            {fetching ? '刷新中...' : '刷新'}
          </button>
        </div>
        <div className="cardBody">
          <div className={styles.tableWrap}>
            <table className="dataTable" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>时间</th>
                  <th style={{ width: '100px' }}>类型</th>
                  <th>摘要</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>状态</th>
                </tr>
              </thead>
              <tbody>
                {fetching && history.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={styles.emptyCell}>加载中...</td>
                  </tr>
                ) : history.length > 0 ? (
                  history.map(item => (
                    <tr key={item.id}>
                      <td style={{ color: 'var(--text-secondary)' }}>{formatDate(item.time)}</td>
                      <td>{TYPE_MAP[item.type] || item.type}</td>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          {item.summary}
                        </div>
                        {item.detail && (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {JSON.stringify(item.detail)}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span 
                          style={{ 
                            color: STATUS_MAP[item.status]?.color,
                            fontSize: '12px',
                            padding: '2px 8px',
                            background: `${STATUS_MAP[item.status]?.color}15`,
                            borderRadius: '12px',
                            fontWeight: 500
                          }}
                        >
                          {STATUS_MAP[item.status]?.label || item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className={styles.emptyCell}>（暂无）</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

