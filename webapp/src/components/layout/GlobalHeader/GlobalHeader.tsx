'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Crosshair, FolderOpen, Shield, CircleHelp, TrendingUp, FileText, Settings, LogIn, LogOut } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/providers/AuthProvider'
import { ProjectSelector } from './ProjectSelector'
import { UserSelector } from './UserSelector'
import styles from './GlobalHeader.module.css'

const coreNav = [
  { label: '红区', href: '/graph', icon: <Crosshair size={14} /> },
  { label: 'CypherFix', href: '/cypherfix', icon: <Shield size={14} /> },
  { label: '洞察', href: '/insights', icon: <TrendingUp size={14} /> },
  { label: '报告', href: '/reports', icon: <FileText size={14} /> },
]

export function GlobalHeader() {
  const pathname = usePathname()
  const { isAuthenticated, user } = useAuth()

  return (
    <header className={styles.header}>
      <Link href="/home" className={styles.logo}>
        <Image src="/logo.png" alt="RedAmon" width={28} height={28} className={styles.logoImg} />
        <span className={styles.logoText}>
          <span className={styles.logoAccent}>Red</span>Amon
        </span>
      </Link>

      <div className={styles.spacer} />

      <div className={styles.actions}>
        <nav className={styles.coreNav}>
          {coreNav.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.coreNavItem} ${isActive ? styles.coreNavItemActive : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <Link
          href="/projects"
          className={`${styles.navItem} ${pathname === '/projects' || pathname.startsWith('/projects/') ? styles.navItemActive : ''}`}
        >
          <FolderOpen size={14} />
          <span>项目</span>
        </Link>

        <div className={styles.divider} />

        <ProjectSelector />

        <div className={styles.divider} />

        <ThemeToggle />

        <div className={styles.divider} />

        {isAuthenticated ? (
          <Link href="/logout" className={styles.helpLink} title={`退出${user?.username ? `（${user.username}）` : ''}`}>
            <LogOut size={16} />
          </Link>
        ) : (
          <Link href="/login" className={styles.helpLink} title="登录">
            <LogIn size={16} />
          </Link>
        )}

        <div className={styles.divider} />

        <a
          href="https://github.com/samugit83/redamon/wiki"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.helpLink}
          title="Wiki 文档"
        >
          <CircleHelp size={16} />
        </a>

        <div className={styles.divider} />

        <UserSelector />

        <div className={styles.divider} />

        <Link
          href="/settings"
          className={`${styles.helpLink} ${pathname === '/settings' ? styles.navItemActive : ''}`}
          title="全局设置"
        >
          <Settings size={17} />
        </Link>
      </div>
    </header>
  )
}
