import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { DocumentGraph } from '../DocumentGraph'
import styles from './GraphModule.module.css'

export function GraphModule() {
  const [uid] = useState('0') // 模拟当前用户 ID
  const [loading, setLoading] = useState(false)
  const [graphData, setGraphData] = useState<{ nodes: any[], links: any[] } | null>(null)

  const handleBuildGraph = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid })
      })
      if (!res.ok) throw new Error('构建请求失败')
      const result = await res.json()
      if (result.code === 200) {
        // Map data to match DocumentGraph interface if needed
        const mappedData = {
          nodes: result.data.nodes.map((n: any) => ({
            ...n,
            id: n.id || n.name || n.label,
            label: n.label || n.name || n.id,
            type: n.type || 'unknown'
          })),
          links: result.data.links.map((l: any) => ({
            ...l,
            relation: l.relation || l.type || '关联'
          }))
        }
        setGraphData(mappedData)
        if (mappedData.nodes.length === 0) {
          toast('知识库为空，无数据构建', { icon: 'ℹ️' })
        } else {
          toast.success(result.msg || '构建成功')
        }
      } else {
        throw new Error(result.msg || '构建失败')
      }
    } catch (e) {
      toast.error(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.title}>🕸️ 知识图谱</div>
        <div className={styles.subtitle}>将结构化知识落图并进行关联分析</div>
      </div>

      <div className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">图谱入口</div>
            <div className="cardSubtitle">复用现有 /graph 页面风格与能力</div>
          </div>
        </div>
        <div className="cardBody">
          <div className={styles.row}>
            <div className={styles.hint}>
              当知识库中存在实体/三元组时，可将其提取并落图，从而在可视化中发现深层联系。
            </div>
            <div className={styles.actions}>
              <button 
                className="secondaryButton" 
                onClick={handleBuildGraph}
                disabled={loading}
              >
                {loading ? '构建中...' : '提取实体并构建'}
              </button>
              <Link className="primaryButton" href="/graph">
                打开完整图谱页
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">落图预览</div>
            <div className="cardSubtitle">提取结果示例</div>
          </div>
        </div>
        <div className="cardBody">
          <div className={styles.preview}>
            {graphData ? (
              <DocumentGraph data={graphData} height={400} />
            ) : (
              <>
                <div className={styles.previewTitle}>示例结构</div>
                <div className={styles.previewText}>Document (Subject) -[CONTAINS]-&gt; Keyword (Object)</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

