'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Network, ShieldCheck, Target, ClipboardList, FolderOpen } from 'lucide-react'
import styles from './NavigationBar.module.css'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  enabled: boolean
}

const navItems: NavItem[] = [
  {
    label: '项目管理',
    href: '/projects',
    icon: <FolderOpen size={16} />,
    enabled: true,
  },
  {
    label: '拓扑图谱',
    href: '/graph',
    icon: <Network size={16} />,
    enabled: true,
  },
  {
    label: '漏洞管理',
    href: '/vulnerabilities',
    icon: <ShieldCheck size={16} />,
    enabled: false,
  },
  {
    label: 'MITRE ATT&CK 矩阵',
    href: '/mitre',
    icon: <Target size={16} />,
    enabled: false,
  },
  {
    label: '动作日志',
    href: '/actions',
    icon: <ClipboardList size={16} />,
    enabled: false,
  },
]

export function NavigationBar() {
  const pathname = usePathname()

  return (
    <nav className={styles.nav}>
      <ul className={styles.navList}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

          if (!item.enabled) {
            return (
              <li key={item.href}>
                <span className={`${styles.navItem} ${styles.navItemDisabled}`}>
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span className={styles.navLabel}>{item.label}</span>
                  <span className={styles.comingSoon}>敬请期待</span>
                </span>
              </li>
            )
          }

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
