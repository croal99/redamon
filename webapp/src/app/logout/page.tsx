'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useProject } from '@/providers/ProjectProvider'

export default function LogoutPage() {
  const router = useRouter()
  const { logoutLocal } = useAuth()
  const { setUserId, setCurrentProject } = useProject()

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      logoutLocal()
      setUserId(null)
      setCurrentProject(null)
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
  }, [logoutLocal, router, setCurrentProject, setUserId])

  return (
    <div style={{ padding: 24, color: 'var(--text-secondary)' }}>
      正在退出…
    </div>
  )
}
