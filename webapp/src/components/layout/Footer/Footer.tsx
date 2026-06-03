'use client'

import { Scale, ArrowUpCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { DISCLAIMER_GITHUB_URL } from '@/lib/disclaimerVersion'
import { useVersionCheck } from '@/hooks/useVersionCheck'
import styles from './Footer.module.css'

export function Footer() {
  const currentYear = new Date().getFullYear()
  const { currentVersion, latestVersion, updateAvailable } = useVersionCheck()
  const router = useRouter()

  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <div className={styles.left}>
          <span className={styles.copyright}>
            © {currentYear} 合盛安科. All rights reserved.
          </span>
        </div>
        <div className={styles.versionWrapper}>
          <span className={styles.version}>v{currentVersion}</span>
        </div>
      </div>
    </footer>
  )
}
