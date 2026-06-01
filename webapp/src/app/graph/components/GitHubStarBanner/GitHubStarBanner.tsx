'use client'

import { useState, useEffect } from 'react'
import { Star, X } from 'lucide-react'
import styles from './GitHubStarBanner.module.css'

const STORAGE_KEY = 'redamon-github-star-dismissed'

interface GitHubStarBannerProps {
  hasAttackChain: boolean
}

export function GitHubStarBanner({ hasAttackChain }: GitHubStarBannerProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!hasAttackChain) return
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (!dismissed) {
      setVisible(true)
    }
  }, [hasAttackChain])

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className={styles.banner}>
      <Star size={16} className={styles.icon} />
      <span className={styles.text}>
        喜欢使用 RedAmon？给个 <a href="https://github.com/samugit83/redamon" target="_blank" rel="noopener noreferrer">GitHub star</a> 可以帮助更多人发现这个项目。
      </span>
      <button className={styles.close} onClick={handleDismiss} aria-label="关闭">
        <X size={14} />
      </button>
    </div>
  )
}
