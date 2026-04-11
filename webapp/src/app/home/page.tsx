import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowRight, Crosshair, Shield, TrendingUp, FileText, FolderOpen, LogIn } from 'lucide-react'
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
    title: '智核·星图',
    subtitle: '图谱与行动面板',
    description: '以图为中心的态势与行动入口。不只是传统的资产扫描，而是基于AI的主动探测与智能测绘。它能以远超人类的效率与精度，自动发现、识别、分类并绘制出目标网络的全景动态地图，包括未知资产、隐蔽入口与脆弱关联，为后续行动构建毫米级的数字战场模型。',
    href: '/graph',
    icon: <Crosshair size={16} />,
  },
  {
    title: '智核·锋矢',
    subtitle: '自主渗透单元',
    description: '超越传统的漏洞利用工具。它是具备攻击链自主编排能力的智能代理。在“星图”提供的战场模型基础上，它能像一名经验丰富的渗透专家，自主决策攻击路径，智能绕过防御，自动化执行从初始突破到横向移动的整个攻击链，实现“一键抵达核心”的精准打击。',
    href: '/c2',
    icon: <Shield size={16} />,
  },
  {
    title: '智核·洞鉴',
    subtitle: '趋势与指标',
    description: '超越简单的文件分析。它是一个深度威胁情报挖掘与战术策略生成中心。不仅能够从海量文件、内存和网络流量中，自动化提取凭证、密钥、通信关系等高价值情报，更能通过关联分析与机器学习，洞察对手战术，并实时生成优化的渗透策略与攻击代码，反哺“锋矢”行动，形成“感知-决策-行动”的智能闭环。',
    href: '/insights',
    icon: <TrendingUp size={16} />,
  },
  {
    title: '智核·报告',
    subtitle: '报告中心',
    description: '查看与导出项目报告，沉淀关键发现与交付物。',
    href: '/reports',
    icon: <FileText size={16} />,
  },
]

export default function HomePage() {
  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden />
      <div className={styles.gridOverlay} aria-hidden />
      <div className={styles.scan} aria-hidden>
        <div className={styles.scanLine} />
      </div>
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
