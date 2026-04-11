'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Crosshair, Eye, EyeOff, FileText, Lock, Shield, TrendingUp, User } from 'lucide-react'
import { useAuth, type AuthTokenResponse } from '@/providers/AuthProvider'
import styles from './page.module.css'

async function loginRequest(username: string, password: string): Promise<AuthTokenResponse> {
  const res = await fetch('/api/user/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  if (!res.ok) {
    let message = '认证失败'
    try {
      const data = await res.json()
      message = data?.detail || data?.message || data?.error || message
    } catch {}
    throw new Error(message)
  }

  return res.json()
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, isLoading, setFromLogin } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const next = searchParams.get('next') || '/home'

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/home')
    }
  }, [isAuthenticated, isLoading, router])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const payload = await loginRequest(username.trim(), password)
      setFromLogin(payload)
      router.replace(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : '认证失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden />
      <div className={styles.grid} aria-hidden />
      <div className={styles.scan} aria-hidden>
        <div className={styles.scanLine} />
      </div>
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
            <div>
              <div className={styles.cardTitle}>欢迎回来</div>
            </div>
          </div>

          {error && (
            <div className={styles.error} role="alert" aria-live="polite">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>用户名</label>
              <div className="inputWithIcon">
                <User size={14} className="inputIcon" />
                <input
                  className="textInput"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>密码</label>
              <div className="inputWithIcon">
                <Lock size={14} className="inputIcon" />
                <input
                  className={`textInput ${styles.passwordInput}`}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  required
                />
                <button
                  type="button"
                  className={`iconButton ${styles.passwordToggle}`}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className={styles.actions}>
              <div className={styles.hint}>使用账号密码完成认证，进入合盛智核</div>
              <button className="primaryButton" type="submit" disabled={submitting}>
                {submitting ? '正在认证…' : '登录'}
              </button>
            </div>
          </form>
        </section>

        <section className={styles.features} aria-hidden>
          <div className={styles.featureGrid}>
            <div className={styles.feature}>
              <Crosshair size={16} className={styles.featureIcon} />
              <div className={styles.featureText}>
                <div className={styles.featureTitle}>图谱与行动</div>
                <div className={styles.featureDesc}>以图为中心的态势与任务入口</div>
              </div>
            </div>
            <div className={styles.feature}>
              <TrendingUp size={16} className={styles.featureIcon} />
              <div className={styles.featureText}>
                <div className={styles.featureTitle}>趋势与指标</div>
                <div className={styles.featureDesc}>从项目数据中提炼关键洞察</div>
              </div>
            </div>
            <div className={styles.feature}>
              <FileText size={16} className={styles.featureIcon} />
              <div className={styles.featureText}>
                <div className={styles.featureTitle}>报告沉淀</div>
                <div className={styles.featureDesc}>结构化导出，便于交付复盘</div>
              </div>
            </div>
            <div className={styles.feature}>
              <Shield size={16} className={styles.featureIcon} />
              <div className={styles.featureText}>
                <div className={styles.featureTitle}>安全认证</div>
                <div className={styles.featureDesc}>统一登录与会话管理能力</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
