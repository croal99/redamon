'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useVersionCheck } from '@/hooks/useVersionCheck'
import styles from './page.module.css'
import { Shield } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || '登录失败')
        setLoading(false)
        return
      }

      // Force full page reload to pick up the new cookie in middleware
      window.location.href = '/graph'
    } catch {
      setError('无法连接到服务器')
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden />
      <div className={styles.grid} aria-hidden />
      <div className={styles.noise} aria-hidden />

      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <div className={styles.brandMark} aria-hidden>
              <Shield size={24} className={styles.brandMarkIcon} />
            </div>
            <div className={styles.brandText}>
              <div className={styles.brandName}>合盛智核</div>
              <div className={styles.brandSub}>高级渗透平台</div>
            </div>
          </div>
        </header>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>欢迎回来</div>
            <div className={styles.cardSubtitle}>使用邮箱与密码完成登录</div>
          </div>

          {error && (
            <div className={styles.error} role="alert" aria-live="polite">
              {error}
            </div>
          )}

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>
                电子邮箱
              </label>
              <div className={styles.inputWithIcon}>
                <span className={styles.inputIcon} aria-hidden>
                  @
                </span>
                <input
                  id="email"
                  type="email"
                  className={styles.textInput}
                  placeholder="admin@cyber.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>
                密码
              </label>
              <div className={styles.inputWithIcon}>
                <span className={styles.inputIcon} aria-hidden>
                  *
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`${styles.textInput} ${styles.passwordInput}`}
                  placeholder="输入您的密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={`${styles.iconButton} ${styles.passwordToggle}`}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                >
                  {showPassword ? '隐' : '显'}
                </button>
              </div>
            </div>

            <div className={styles.actions}>
              <div className={styles.hint}>
                {process.env.NEXT_PUBLIC_REDAMON_VERSION
                  ? `v${process.env.NEXT_PUBLIC_REDAMON_VERSION}`
                  : '合盛智核'}
              </div>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={loading || !email || !password}
              >
                {loading ? '正在登录...' : '登录'}
              </button>
            </div>
          </form>
        </section>

        <section className={styles.features} aria-hidden>
          <div className={styles.featureGrid}>
            <div className={styles.feature}>
              <div className={styles.featureIcon} aria-hidden>
                ◎
              </div>
              <div className={styles.featureText}>
                <div className={styles.featureTitle}>图谱化管理</div>
                <div className={styles.featureDesc}>关联核心实体与关系，快速定位关键路径</div>
              </div>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon} aria-hidden>
                △
              </div>
              <div className={styles.featureText}>
                <div className={styles.featureTitle}>智能推理</div>
                <div className={styles.featureDesc}>基于结构化知识进行分析与联动推荐</div>
              </div>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon} aria-hidden>
                □
              </div>
              <div className={styles.featureText}>
                <div className={styles.featureTitle}>可视化呈现</div>
                <div className={styles.featureDesc}>清晰展示节点关系，洞察整体态势</div>
              </div>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon} aria-hidden>
                ◇
              </div>
              <div className={styles.featureText}>
                <div className={styles.featureTitle}>安全访问</div>
                <div className={styles.featureDesc}>统一认证与权限控制，保障数据安全</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
