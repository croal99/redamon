'use client'

import { useAuth } from '@/providers/AuthProvider'
import styles from './UserInfo.module.css'

export function UserInfo() {
  const { user } = useAuth()

  const initials = user?.username
    ? user.username.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div
      className={styles.container}
      title={user?.email ? `${user.username} <${user.email}>` : (user?.username || '未识别用户')}
    >
      <div className={styles.avatar} aria-hidden="true">
        <span>{initials}</span>
      </div>
      <span className={styles.userName}>{user?.username || '未识别用户'}</span>
    </div>
  )
}

export default UserInfo
