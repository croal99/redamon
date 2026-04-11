'use client'

import { useProject } from '@/providers/ProjectProvider'
import { useUserById } from '@/hooks/useUsers'
import styles from './UserInfo.module.css'

export function UserInfo() {
  const { userId } = useProject()
  const { data: user } = useUserById(userId)

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div
      className={styles.container}
      title={user?.email ? `${user.name} <${user.email}>` : (user?.name || '未识别用户')}
    >
      <div className={styles.avatar} aria-hidden="true">
        <span>{initials}</span>
      </div>
      <span className={styles.userName}>{user?.name || '未识别用户'}</span>
    </div>
  )
}

export default UserInfo
