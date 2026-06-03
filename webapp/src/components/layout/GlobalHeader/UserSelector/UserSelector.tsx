'use client'

import { useRouter } from 'next/navigation'
import { LogOut, LogIn } from 'lucide-react'
import { useProject } from '@/providers/ProjectProvider'
import { useAuth } from '@/providers/AuthProvider'
import { useUsers } from '@/hooks/useUsers'
import styles from './UserSelector.module.css'

export function UserSelector() {
  const router = useRouter()
  const { userId } = useProject()
  const { user: authUser, logout } = useAuth()
  const { data: users } = useUsers()

  const currentUser = users?.find(u => u.id === userId)

  const handleLogout = () => {
    logout()
  }

  const handleLogin = () => {
    router.push('/login')
  }

  const displayUser = currentUser || authUser
  const initials = displayUser
    ? displayUser.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'
  const isAuthenticated = Boolean(authUser)

  return (
    <div className={styles.container}>
      <div className={styles.row}>
        <div className={styles.trigger} title="用户">
          <div className={styles.avatar}>
            <span>{initials}</span>
          </div>
          <span className={styles.userName}>
            {displayUser?.name || '未选择用户'}
          </span>
        </div>

        {isAuthenticated ? (
          <button
            type="button"
            className={`${styles.quickAction} ${styles.quickLogout}`}
            onClick={handleLogout}
            title={`退出${displayUser?.name ? `（${displayUser.name}）` : ''}`}
          >
            <LogOut size={16} />
          </button>
        ) : (
          <button
            type="button"
            className={styles.quickAction}
            onClick={handleLogin}
            title="登录"
          >
            <LogIn size={16} />
          </button>
        )}
      </div>
    </div>
  )
}

export default UserSelector
