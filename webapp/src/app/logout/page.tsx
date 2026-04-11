'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'

export default function LogoutPage() {
  const router = useRouter()
  const { logoutLocal } = useAuth()

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      logoutLocal()
      try {
        await fetch('/api/auth/logout', { method: 'POST' })
      } catch {
      } finally {
        if (!cancelled) router.replace('/login')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [logoutLocal, router])

  return (
    <div style={{ padding: 24, color: 'var(--text-secondary)' }}>
      正在退出…
    </div>
  )
}
