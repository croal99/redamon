import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { CSSProperties, ReactNode } from 'react'
import { ArrowRight, Crosshair, Shield, TrendingUp } from 'lucide-react'
import styles from './page.module.css'

type Entry = {
  title: string
  subtitle: string
  description: string
  href: string
  icon: ReactNode
  img: string
  accent: string
}

const entries: Entry[] = [
  {
    title: '智核·星图',
    subtitle: '资产扫描与测绘',
    description: '',
    href: '/graph',
    icon: <Crosshair size={16} />,
    img: '/logo-scan.png',
    accent: '#00d4ff',
  },
  {
    title: '智核·锋矢',
    subtitle: '内网突破与渗透',
    description: '',
    href: '/c2',
    icon: <Shield size={16} />,
    img: '/logo-c2.png',
    accent: '#0a84ff',
  },
  {
    title: '智核·洞鉴',
    subtitle: '情报挖掘与战术策略',
    description: '',
    href: '/document',
    icon: <TrendingUp size={16} />,
    img: '/logo-document.png',
    accent: '#dc2626',
  },
]

export default async function HomePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('bluenet_token')?.value
  if (!token) redirect('/login?next=/home')

  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden />
      <div className={styles.gridOverlay} aria-hidden />
      <div className={styles.noise} aria-hidden />

      <div className={styles.content}>
        <div className={styles.hero}>
          <div>
            <div className={styles.brand}>
              <div className={styles.brandMark} aria-hidden>
                <Shield size={24} className={styles.brandMarkIcon} />
              </div>
              <div className={styles.brandText}>
                <div className={styles.brandName}>合盛智核</div>
                <div className={styles.brandSub}>高级渗透平台</div>
              </div>
            </div>
            <p className={styles.subtitle}>
              以“感知-决策-行动”的智能闭环为核心，整合图谱分析、智能修复与洞察能力，构建可持续演进的数字战场体系。
            </p>
          </div>
        </div>

        <div className={styles.grid}>
          {entries.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              className={styles.card}
              style={{ '--card-accent': e.accent } as CSSProperties}
            >
              <div className={styles.cardTop}>
                <div className={styles.cardTitleRow}>
                  <div className={styles.cardTitleBlock}>
                    <h2 className={styles.cardTitle}>{e.title}</h2>
                  </div>
                </div>
                <ArrowRight size={16} className={styles.cardArrow} aria-hidden />
              </div>

              <div className={styles.cardImage}>
                <img src={e.img} alt="" />
              </div>

              <div className={styles.cardFooter}>
                <p>{e.subtitle}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
