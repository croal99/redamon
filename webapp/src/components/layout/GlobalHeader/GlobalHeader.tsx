'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Crosshair, FolderOpen, Shield, BookOpen, TrendingUp, FileText, Settings, Users, GitBranch } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ProjectSelector } from './ProjectSelector'
import { UserSelector } from './UserSelector'
import { useAuth } from '@/providers/AuthProvider'
import { useProject } from '@/providers/ProjectProvider'
import styles from './GlobalHeader.module.css'

export function GlobalHeader() {
  const pathname = usePathname()
  const { isAdmin } = useAuth()
  const { projectId } = useProject()

  const coreNav = [
    { label: '渗透测试', href: '/graph', icon: <Crosshair size={14} /> },
    ...(projectId
      ? [{ label: '侦察流程', href: `/projects/${projectId}/settings`, icon: <GitBranch size={14} /> }]
      : []),
    { label: '态势分析', href: '/insights', icon: <TrendingUp size={14} /> },
    { label: '报告中心', href: '/reports', icon: <FileText size={14} /> },
  ]

  return (
    <header className={styles.header}>
      <Link href="/home" className={styles.logo}>
        <Image src="/logo.png" alt="合盛智核" width={28} height={28} className={styles.logoImg} />
        <span className={styles.logoText}>
          <span className={styles.logoAccent}>智核·</span>星图
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
