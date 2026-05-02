'use client'

import { useRef, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Inbox } from 'lucide-react'
import styles from './DocumentGraph.module.css'

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
})

export interface DocumentGraphNode {
  id: string
  label: string
  type: string
  [key: string]: any
}

export interface DocumentGraphLink {
  source: string | DocumentGraphNode
  target: string | DocumentGraphNode
  relation: string
  [key: string]: any
}

export interface DocumentGraphData {
  nodes: DocumentGraphNode[]
  links: DocumentGraphLink[]
}

interface DocumentGraphProps {
  data: DocumentGraphData | null
  height?: number
  onNodeClick?: (node: DocumentGraphNode) => void
}

export function DocumentGraph({ data, height = 400, onNodeClick }: DocumentGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (!containerRef.current) return
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect
        setDimensions({ width, height })
      }
    })
    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  if (!data || data.nodes.length === 0) {
    return (
      <div className={styles.root} style={{ height }}>
        <div className={styles.empty}>
          <Inbox size={32} />
          <div className={styles.emptyText}>暂无图谱数据，请先提取实体</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.root} style={{ height }} ref={containerRef}>
      {dimensions.width > 0 && dimensions.height > 0 && (
        <div className={styles.graphContainer}>
          <ForceGraph2D
            width={dimensions.width}
            height={dimensions.height}
            graphData={data}
            nodeLabel="label"
            nodeAutoColorBy="type"
            linkLabel="relation"
            onNodeClick={(node) => onNodeClick?.(node as DocumentGraphNode)}
            nodeCanvasObject={(node: any, ctx, globalScale) => {
              const label = node.label
              const fontSize = 12 / globalScale
              ctx.font = `${fontSize}px Sans-Serif`
              const textWidth = ctx.measureText(label).width
              const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2)
              
              ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
              ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1])
              
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              ctx.fillStyle = node.color || '#fff'
              ctx.fillText(label, node.x, node.y)
              
              node.__bckgDimensions = bckgDimensions
            }}
            nodePointerAreaPaint={(node: any, color, ctx) => {
              ctx.fillStyle = color
              const bckgDimensions = node.__bckgDimensions
              bckgDimensions && ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1])
            }}
            linkCanvasObjectMode={() => 'after'}
            linkCanvasObject={(link: any, ctx, globalScale) => {
              const MAX_FONT_SIZE = 4
              const LABEL_NODE_MARGIN = 2
              
              const start = link.source
              const end = link.target
              
              if (typeof start !== 'object' || typeof end !== 'object') return

              const textPos = {
                x: start.x + (end.x - start.x) / 2,
                y: start.y + (end.y - start.y) / 2
              }
              
              const relLink = { x: end.x - start.x, y: end.y - start.y }
              const maxTextLength = Math.sqrt(Math.pow(relLink.x, 2) + Math.pow(relLink.y, 2)) - LABEL_NODE_MARGIN * 2
              
              let textAngle = Math.atan2(relLink.y, relLink.x)
              if (textAngle > Math.PI / 2) textAngle = -(Math.PI - textAngle)
              if (textAngle < -Math.PI / 2) textAngle = -(-Math.PI - textAngle)

              const label = link.relation
              ctx.font = `${MAX_FONT_SIZE}px Sans-Serif`
              const textWidth = ctx.measureText(label).width
              
              ctx.save()
              ctx.translate(textPos.x, textPos.y)
              ctx.rotate(textAngle)
              
              ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
              ctx.fillRect(-textWidth / 2 - 1, -MAX_FONT_SIZE / 2 - 1, textWidth + 2, MAX_FONT_SIZE + 2)
              
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              ctx.fillStyle = '#94a3b8'
              ctx.fillText(label, 0, 0)
              ctx.restore()
            }}
          />
        </div>
      )}
    </div>
  )
}
