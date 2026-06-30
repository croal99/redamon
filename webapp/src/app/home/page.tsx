'use client'

import Link from 'next/link'
import { useState, useEffect, type CSSProperties } from 'react'
import { ArrowRight, Shield } from 'lucide-react'
import styles from './page.module.css'

export default function HomePage() {
  // const cookieStore = await cookies()
  // const token = cookieStore.get('bluenet_token')?.value
  // if (!token) redirect('/login?next=/home')

  const [kbUrl, setKbUrl] = useState('http://kb.bluescan.com')

  useEffect(() => {
    const { protocol, port } = window.location
    const portSuffix = port ? `:${port}` : ''
    setKbUrl(`${protocol}//kb.bluescan.com${portSuffix}`)
  }, [])

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
              以"感知-决策-行动"的智能闭环为核心，整合图谱分析、智能修复与洞察能力，构建可持续演进的数字战场体系。
            </p>
          </div>
        </div>

        <div className={styles.grid}>
          <Link
            href="/graph"
            className={styles.card}
            style={{ '--card-accent': '#00d4ff' } as CSSProperties}
          >
            <div className={styles.cardTop}>
              <div className={styles.cardTitleRow}>
                <div className={styles.cardTitleBlock}>
                  <h2 className={styles.cardTitle}>智核·星图</h2>
                </div>
              </div>
              <ArrowRight size={16} className={styles.cardArrow} aria-hidden />
            </div>
            <div className={styles.cardImage}>
              <img src="/logo-scan.png" alt="" />
            </div>
            <div className={styles.cardFooter}>
              <p>资产扫描与测绘</p>
            </div>
          </Link>

          <Link
            href="/c2"
            className={styles.card}
            style={{ '--card-accent': '#0a84ff' } as CSSProperties}
          >
            <div className={styles.cardTop}>
              <div className={styles.cardTitleRow}>
                <div className={styles.cardTitleBlock}>
                  <h2 className={styles.cardTitle}>智核·锋矢</h2>
                </div>
              </div>
              <ArrowRight size={16} className={styles.cardArrow} aria-hidden />
            </div>
            <div className={styles.cardImage}>
              <img src="/logo-c2.png" alt="" />
            </div>
            <div className={styles.cardFooter}>
              <p>内网突破与渗透</p>
            </div>
          </Link>

          <Link
            href={kbUrl}
            className={styles.card}
            style={{ '--card-accent': '#dc2626' } as CSSProperties}
          >
            <div className={styles.cardTop}>
              <div className={styles.cardTitleRow}>
                <div className={styles.cardTitleBlock}>
                  <h2 className={styles.cardTitle}>智核·洞鉴</h2>
                </div>
              </div>
              <ArrowRight size={16} className={styles.cardArrow} aria-hidden />
            </div>
            <div className={styles.cardImage}>
              <img src="/logo-document.png" alt="" />
            </div>
            <div className={styles.cardFooter}>
              <p>情报挖掘与战术策略</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
