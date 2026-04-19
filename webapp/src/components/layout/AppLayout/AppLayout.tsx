'use client'

/** 删除初始化和版本更新提示
import { DisclaimerGate } from '../DisclaimerGate'
import { UpdateNotification } from '../UpdateNotification'
 */

import { usePathname } from 'next/navigation'
import { GlobalHeader } from '../GlobalHeader'
import { Footer } from '../Footer'
import styles from './AppLayout.module.css'

const HIDE_CHROME_PATHS = new Set<string>(['/', '/home', '/login', '/c2'])

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const showChrome = !HIDE_CHROME_PATHS.has(pathname)

  return (
    <div className={styles.layout}>
      {showChrome && <GlobalHeader />}
      <main className={styles.main}>
        {children}
      </main>
      {showChrome && <Footer />}
    </div>
  )
}
