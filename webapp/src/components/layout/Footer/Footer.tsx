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
            © {currentYear} RedAmon. All rights reserved.
          </span>
          <a
            href={DISCLAIMER_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.legalLink}
          >
            <Scale size={12} />
            法律声明与使用条款
          </a>
        </div>
        <div className={styles.versionWrapper}>
          {updateAvailable && latestVersion && (
            <button
              className={styles.updateBadge}
              onClick={() => router.push('/settings?tab=system')}
              title={`更新到 v${latestVersion}`}
            >
              <ArrowUpCircle size={12} />
              v{latestVersion} 可更新
            </button>
          )}
          <span className={styles.version}>v{currentVersion}</span>
        </div>
      </div>
    </footer>
  )
}
