import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import styles from './ProfileModule.module.css'

export function ProfileModule() {
  const [uid] = useState('0') // 模拟当前用户 ID
  const [assets, setAssets] = useState('')
  const [riskThreshold, setRiskThreshold] = useState('')
  const [backgroundInfo, setBackgroundInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  const fetchProfile = useCallback(async () => {
    setFetching(true)
    try {
      const res = await fetch(`/api/profile?uid=${uid}`)
      if (!res.ok) throw new Error('获取画像失败')
      const result = await res.json()
      if (result.code === 200 && result.data) {
        setAssets(result.data.assets || '')
        setRiskThreshold(result.data.riskThreshold || '')
        setBackgroundInfo(result.data.backgroundInfo || '')
      }
    } catch (e) {
      toast.error(String(e))
    } finally {
      setFetching(false)
    }
  }, [uid])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const handleSave = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          assets,
          riskThreshold,
          backgroundInfo
        })
      })
      if (!res.ok) throw new Error('保存失败')
      const result = await res.json()
      if (result.code === 200) {
        toast.success('保存成功')
      } else {
        throw new Error(result.msg || '保存失败')
      }
    } catch (e) {
      toast.error(String(e))
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setAssets('')
    setRiskThreshold('')
    setBackgroundInfo('')
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.title}>🧠 用户画像</div>
        <div className={styles.subtitle}>为分析与推送提供偏好：关注资产、风险阈值、行业上下文</div>
      </div>

      <div className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">偏好设置</div>
            <div className="cardSubtitle">可持久化到用户配置</div>
          </div>
        </div>
        <div className="cardBody">
          {fetching ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              正在加载配置...
            </div>
          ) : (
            <>
              <div className={styles.form}>
                <div className={styles.field}>
                  <div className={styles.label}>关注资产（关键词）</div>
                  <input 
                    className={styles.input} 
                    placeholder="例如：VPN / OA / 供应链 / Web API" 
                    value={assets}
                    onChange={(e) => setAssets(e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <div className={styles.label}>风险阈值</div>
                  <input 
                    className={styles.input} 
                    placeholder="例如：medium" 
                    value={riskThreshold}
                    onChange={(e) => setRiskThreshold(e.target.value)}
                  />
                </div>
                <div className={styles.fieldFull}>
                  <div className={styles.label}>背景信息</div>
                  <textarea 
                    className={styles.textarea} 
                    placeholder="例如：业务系统、重点域名、合规要求…" 
                    value={backgroundInfo}
                    onChange={(e) => setBackgroundInfo(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.actions}>
                <button 
                  className="primaryButton" 
                  onClick={handleSave}
                  disabled={loading}
                >
                  {loading ? '保存中...' : '保存'}
                </button>
                <button 
                  className="secondaryButton" 
                  onClick={handleReset}
                  disabled={loading}
                >
                  重置
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

