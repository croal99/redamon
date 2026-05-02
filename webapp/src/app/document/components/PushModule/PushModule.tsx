import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import styles from './PushModule.module.css'

type PushRule = {
  id: string
  title: string
  desc: string
  active: boolean
}

export function PushModule() {
  const [uid] = useState('0') // 模拟当前用户 ID
  const [rules, setRules] = useState<PushRule[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  const fetchRules = useCallback(async () => {
    setFetching(true)
    try {
      const res = await fetch(`/api/push?uid=${uid}`)
      if (!res.ok) throw new Error('获取规则失败')
      const result = await res.json()
      if (result.code === 200 && result.data) {
        setRules(result.data)
      }
    } catch (e) {
      toast.error(String(e))
    } finally {
      setFetching(false)
    }
  }, [uid])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  const handleToggleRule = async (id: string, currentActive: boolean) => {
    const newRules = rules.map(r => r.id === id ? { ...r, active: !currentActive } : r)
    setRules(newRules)
    
    try {
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, rules: newRules })
      })
      if (!res.ok) throw new Error('保存规则失败')
      const result = await res.json()
      if (result.code !== 200) {
        throw new Error(result.msg || '保存失败')
      }
    } catch (e) {
      toast.error(String(e))
      // 恢复状态
      setRules(rules)
    }
  }

  const handleTestPush = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid })
      })
      if (!res.ok) throw new Error('测试推送失败')
      const result = await res.json()
      if (result.code === 200) {
        toast.success(result.content || '推送成功', { duration: 5000 })
      } else {
        throw new Error(result.msg || '推送失败')
      }
    } catch (e) {
      toast.error(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.title}>🎯 智能推送</div>
        <div className={styles.subtitle}>把“你关心的风险信号”变成可订阅的规则</div>
      </div>

      <div className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">推送规则</div>
            <div className="cardSubtitle">基于您的画像与知识库内容进行智能推荐</div>
          </div>
        </div>
        <div className="cardBody">
          {fetching ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              正在加载规则...
            </div>
          ) : (
            <>
              <div className={styles.ruleList}>
                {rules.map((rule) => (
                  <div key={rule.id} className={`${styles.ruleItem} ${!rule.active ? styles.inactive : ''}`}>
                    <div style={{ flex: 1 }}>
                      <div className={styles.ruleTitle}>{rule.title}</div>
                      <div className={styles.ruleDesc}>{rule.desc}</div>
                    </div>
                    <label className={styles.switch}>
                      <input 
                        type="checkbox" 
                        checked={rule.active} 
                        onChange={() => handleToggleRule(rule.id, rule.active)}
                      />
                      <span className={styles.slider}></span>
                    </label>
                  </div>
                ))}
              </div>
              <div className={styles.actions}>
                <button className="primaryButton" disabled>新增规则 (开发中)</button>
                <button 
                  className="secondaryButton" 
                  onClick={handleTestPush}
                  disabled={loading || rules.filter(r => r.active).length === 0}
                >
                  {loading ? '推送中...' : '测试推送'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

