import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowRight, Crosshair, Shield, TrendingUp, FileText } from 'lucide-react'
import styles from './page.module.css'

type Entry = {
  title: string
  subtitle: string
  description: string
  href: string
  icon: ReactNode
}

const entries: Entry[] = [
  {
    title: 'Red Zone',
    subtitle: '图谱与行动面板',
    description: '以图为中心的态势与行动入口：图谱视图、会话、隧道与智能助手。',
    href: '/graph',
    icon: <Crosshair size={16} />,
  },
  {
    title: 'CypherFix',
    subtitle: '代码修复与分诊',
    description: '将发现的问题转化为可执行的修复建议，辅助分诊与回归验证。',
    href: '/cypherfix',
    icon: <Shield size={16} />,
  },
  {
    title: 'Insights',
    subtitle: '趋势与指标',
    description: '从项目数据中提炼趋势、指标与风险视角，快速定位重点。',
    href: '/insights',
    icon: <TrendingUp size={16} />,
  },
  {
    title: 'Reports',
    subtitle: '报告中心',
    description: '查看与导出项目报告，沉淀关键发现与交付物。',
    href: '/reports',
    icon: <FileText size={16} />,
  },
]

export default function HomePage() {
  return (
    <div className={styles.page}>
      <div className={styles.bg} />

      <div className={styles.content}>
        <div className={styles.hero}>
          <div>
            <h1 className={styles.title}>合盛智核</h1>
            <p className={styles.subtitle}>
              以“感知-决策-行动”的智能闭环为核心，整合图谱分析、智能修复与洞察能力，构建可持续演进的数字战场体系。
            </p>
          </div>
        </div>

        <div className={styles.grid}>
          {entries.map((e) => (
            <Link key={e.href} href={e.href} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.cardTitleRow}>
                  {e.icon}
                  <h2 className={styles.cardTitle}>{e.title}</h2>
                  <span className={styles.badge}>{e.subtitle}</span>
                </div>
                <ArrowRight size={16} />
              </div>

              <p className={styles.cardDesc}>{e.description}</p>

              <div className={styles.cardMeta}>
                <span>目标入口</span>
                <span className={styles.cardPath}>{e.href}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
