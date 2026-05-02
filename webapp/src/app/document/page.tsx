'use client'

import { useMemo, useState } from 'react'
import styles from './page.module.css'
import { DashboardModule } from './components/DashboardModule/DashboardModule'
import { ChatModule } from './components/ChatModule/ChatModule'
import { KnowledgeBaseModule } from './components/KnowledgeBaseModule/KnowledgeBaseModule'
import { BatchAnalysisModule } from './components/BatchAnalysisModule/BatchAnalysisModule'
import { ProfileModule } from './components/ProfileModule/ProfileModule'
import { PushModule } from './components/PushModule/PushModule'
import { GraphModule } from './components/GraphModule/GraphModule'
import { HistoryModule } from './components/HistoryModule/HistoryModule'

export type DocumentModuleLabel =
  | '📊 数据概览'
  | '💬 AI对话'
  | '📚 知识库'
  | '📁 批量分析'
  | '🧠 用户画像'
  | '🎯 智能推送'
  | '🕸️ 知识图谱'
  | '📜 历史记录'

const NAV_ITEMS: Array<{ label: DocumentModuleLabel; description: string }> = [
  { label: '📊 数据概览', description: '全局统计与快捷入口' },
  { label: '💬 AI对话', description: '围绕材料进行问答' },
  { label: '📚 知识库', description: '管理与检索知识' },
  { label: '📁 批量分析', description: '批量解析与结构化' },
  { label: '🧠 用户画像', description: '偏好与画像配置' },
  { label: '🎯 智能推送', description: '策略化推送与订阅' },
  { label: '🕸️ 知识图谱', description: '图谱视图与关系查询' },
  { label: '📜 历史记录', description: '会话与分析追溯' },
]

export default function DocumentPage() {
  const [selected, setSelected] = useState<DocumentModuleLabel>('📊 数据概览')

  const content = useMemo(() => {
    if (selected === '📊 数据概览') {
      return <DashboardModule onNavigate={setSelected} />
    } else if (selected === '💬 AI对话') {
      return <ChatModule />
    } else if (selected === '📚 知识库') {
      return <KnowledgeBaseModule />
    } else if (selected === '📁 批量分析') {
      return <BatchAnalysisModule />
    } else if (selected === '🧠 用户画像') {
      return <ProfileModule />
    } else if (selected === '🎯 智能推送') {
      return <PushModule />
    } else if (selected === '🕸️ 知识图谱') {
      return <GraphModule />
    } else if (selected === '📜 历史记录') {
      return <HistoryModule />
    }
    return null
  }, [selected])

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarInfo}>
          <div className={styles.title}>文件分析平台</div>
          <div className={styles.subtitle}>以AI为核心引擎的敏感信息智能提取系统。</div>
        </div>
        <div className={styles.toolbarRight}>
          <span className={styles.pill}>{selected}</span>
        </div>
      </div>

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>模块</div>
          <div className={styles.nav}>
            {NAV_ITEMS.map(item => {
              const active = item.label === selected
              return (
                <button
                  key={item.label}
                  type="button"
                  className={`${styles.navButton} ${active ? styles.navButtonActive : ''}`}
                  onClick={() => setSelected(item.label)}
                >
                  <div className={styles.navLabel}>{item.label}</div>
                  <div className={styles.navDesc}>{item.description}</div>
                </button>
              )
            })}
          </div>
        </aside>

        <main className={styles.main}>
          <div className={styles.mainInner}>{content}</div>
        </main>
      </div>
    </div>
  )
}

