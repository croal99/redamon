'use client'

import { usePathname } from 'next/navigation'
import { GlobalHeader } from '../GlobalHeader'
import { Footer } from '../Footer'
import { DisclaimerGate } from '../DisclaimerGate'
import { UpdateNotification } from '../UpdateNotification'
import styles from './AppLayout.module.css'

interface AppLayoutProps {
  children: React.ReactNode
}

const HIDE_CHROME_PATHS = new Set<string>(['/', '/home', '/login', '/c2'])

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const showChrome = !HIDE_CHROME_PATHS.has(pathname)

  return (
    <div className={styles.layout}>
      {showChrome && <GlobalHeader />}
      <main className={styles.main}>
        <DisclaimerGate>{children}</DisclaimerGate>
      </main>
      <Footer />
      <UpdateNotification />
    </div>
  )
}
