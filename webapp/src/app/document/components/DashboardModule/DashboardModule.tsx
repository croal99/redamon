import { useEffect, useState } from 'react'
import styles from './DashboardModule.module.css'
import { toast } from 'react-hot-toast'
import { DocumentModuleLabel } from '../../page'

export function DashboardModule({ uid = '1', onNavigate }: { uid?: string, onNavigate?: (tab: DocumentModuleLabel) => void }) {
  const [stats, setStats] = useState({
    tasks: { pending: 0, inProgress: 0, completed: 0 },
    knowledge: { files: 0, items: 0, nodes: 0 }
  })

  useEffect(() => {
    fetch(`/api/dashboard?uid=${uid}`)
      .then(res => res.json())
      .then(result => {
        if (result.code === 200 && result.data) {
          setStats(result.data)
        }
      })
      .catch(e => toast.error('获取概览数据失败: ' + String(e)))
  }, [uid])

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.title}>📊 数据概览</div>
        <div className={styles.subtitle}>快速查看状态，并从这里进入各个工作流</div>
      </div>

      <div className={styles.grid}>
        <div className="card">
          <div className="cardHeader">
            <div>
              <div className="cardTitle">今日任务</div>
              <div className="cardSubtitle">待处理 / 进行中 / 已完成</div>
            </div>
          </div>
          <div className="cardBody">
            <div className={styles.kpiRow}>
              <div className="statCard">
                <div className="statLabel">待处理</div>
                <div className="statValue">{stats.tasks.pending}</div>
              </div>
              <div className="statCard">
                <div className="statLabel">进行中</div>
                <div className="statValue">{stats.tasks.inProgress}</div>
              </div>
              <div className="statCard">
                <div className="statLabel">已完成</div>
                <div className="statValue">{stats.tasks.completed}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="cardHeader">
            <div>
              <div className="cardTitle">素材与知识</div>
              <div className="cardSubtitle">用于后续问答、检索与图谱落点</div>
            </div>
          </div>
          <div className="cardBody">
            <div className={styles.kpiRow}>
              <div className="statCard">
                <div className="statLabel">文件</div>
                <div className="statValue">{stats.knowledge.files}</div>
              </div>
              <div className="statCard">
                <div className="statLabel">知识条目</div>
                <div className="statValue">{stats.knowledge.items}</div>
              </div>
              <div className="statCard">
                <div className="statLabel">图谱节点</div>
                <div className="statValue">{stats.knowledge.nodes}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="cardHeader">
            <div>
              <div className="cardTitle">快捷操作</div>
              <div className="cardSubtitle">常用入口聚合，保持统一的卡片风格</div>
            </div>
          </div>
          <div className="cardBody">
            <div className={styles.actions}>
              <div className={styles.actionItem} onClick={() => onNavigate?.('💬 AI对话')}>💬 进入 AI 对话</div>
              <div className={styles.actionItem} onClick={() => onNavigate?.('📁 批量分析')}>📁 发起批量分析</div>
              <div className={styles.actionItem} onClick={() => onNavigate?.('🕸️ 知识图谱')}>🕸️ 打开知识图谱</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

