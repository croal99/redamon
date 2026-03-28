'use client'

import { Scale, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { DISCLAIMER_GITHUB_URL } from '@/lib/disclaimerVersion'
import { useVersionCheck } from '@/hooks/useVersionCheck'
import styles from './Footer.module.css'

export function Footer() {
  const currentYear = new Date().getFullYear()
  const { currentVersion, updateAvailable } = useVersionCheck()
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
            Legal & Terms of Use
          </a>
        </div>
        <div className={styles.versionWrapper}>
          {updateAvailable && (
            <button
              className={styles.updateAlert}
              onClick={() => router.push('/settings?tab=system')}
              title="Update available — click to view"
            >
              <AlertCircle size={14} />
            </button>
          )}
          <span className={styles.version}>v{currentVersion}</span>
        </div>
      </div>
    </footer>
  )
}
