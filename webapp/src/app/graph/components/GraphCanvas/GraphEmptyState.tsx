'use client'

import { Globe, Radar, ArrowDown, MessageSquare } from 'lucide-react'
import styles from './GraphEmptyState.module.css'

export function GraphEmptyState() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <Globe size={48} strokeWidth={1.5} />
        </div>
        <h2 className={styles.title}>暂无侦察数据</h2>
        <p className={styles.description}>
          运行侦察流程以发现并绘制目标的攻击面。
          图谱将展示发现的域名、子域名、IP、端口、服务与漏洞等信息。
        </p>
        <div className={styles.steps}>
          <div className={styles.step}>
            <Radar size={16} />
            <span>对目标运行侦察流程</span>
          </div>
          <ArrowDown size={14} className={styles.arrow} />
          <div className={styles.step}>
            <Globe size={16} />
            <span>图谱自动填充已发现资产</span>
          </div>
          <ArrowDown size={14} className={styles.arrow} />
          <div className={styles.step}>
            <MessageSquare size={16} />
            <span>使用 AI 代理进行分析与利用</span>
          </div>
        </div>
      </div>
    </div>
  )
}
