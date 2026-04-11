'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Lock, User } from 'lucide-react'
import { useAuth, type AuthTokenResponse } from '@/providers/AuthProvider'
import styles from './page.module.css'

async function loginRequest(username: string, password: string): Promise<AuthTokenResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  if (!res.ok) {
    let message = '认证失败'
    try {
      const data = await res.json()
      message = data?.detail || data?.message || message
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
      <div className={styles.card}>
        <div className={styles.brandRow}>
          <h1 className={styles.brandTitle}>RedAmon</h1>
        </div>
        <p className={styles.subtitle}>请输入账号密码以访问平台</p>

        {error && <div className={styles.error}>{error}</div>}

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
                required
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>密码</label>
            <div className="inputWithIcon">
              <Lock size={14} className="inputIcon" />
              <input
                className="textInput"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                required
              />
              <button
                type="button"
                className="iconButton"
                style={{ position: 'absolute', right: 8 }}
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className={styles.actions}>
            <div className={styles.hint}>登录成功后将自动跳转</div>
            <button className="primaryButton" type="submit" disabled={submitting}>
              {submitting ? '正在认证…' : '登录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

