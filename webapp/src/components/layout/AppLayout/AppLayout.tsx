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

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const isAuthPage = pathname === '/login' || pathname === '/logout'

  return (
    <div className={styles.layout}>
      {!isAuthPage && <GlobalHeader />}
      <main className={styles.main}>
        {isAuthPage ? children : <DisclaimerGate>{children}</DisclaimerGate>}
      </main>
      {!isAuthPage && <Footer />}
      {!isAuthPage && <UpdateNotification />}
    </div>
  )
}
