'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Drawer } from '@/components/ui'
import { GraphNode } from '../../types'
import { getNodeColor } from '../../utils'
import { formatPropertyValue } from '../../utils/formatters'
import styles from './NodeDrawer.module.css'

interface NodeDrawerProps {
  node: GraphNode | null
  isOpen: boolean
  onClose: () => void
  onDeleteNode?: (nodeId: string) => Promise<void>
}

export function NodeDrawer({ node, isOpen, onClose, onDeleteNode }: NodeDrawerProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    if (!node || !onDeleteNode) return
    setIsDeleting(true)
    try {
      await onDeleteNode(node.id)
      setShowDeleteConfirm(false)
      onClose()
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
  }

  // Filter out internal IDs and sort with timestamps at the bottom
  const hiddenKeys = ['project_id', 'user_id']
  const sortedProperties = node
    ? Object.entries(node.properties || {})
        .filter(([key]) => !hiddenKeys.includes(key))
        .sort(([a], [b]) => {
          const bottomKeys = ['created_at', 'updated_at']
          const aIsBottom = bottomKeys.includes(a)
          const bIsBottom = bottomKeys.includes(b)
          if (aIsBottom && !bIsBottom) return 1
          if (!aIsBottom && bIsBottom) return -1
          if (aIsBottom && bIsBottom) return bottomKeys.indexOf(a) - bottomKeys.indexOf(b)
          return 0
        })
    : []

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      position="left"
      mode="overlay"
      title={node ? `${node.type}: ${node.name}` : undefined}
    >
      {node && (
        <>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitleBasicInfo}>基本信息</h3>
              {node.type !== 'Domain' && node.type !== 'Subdomain' && onDeleteNode && (
                <button
                  className={styles.deleteButton}
                  onClick={handleDeleteClick}
                  disabled={isDeleting}
                  title="删除节点"
                >
                  {isDeleting ? '...' : '\uD83D\uDDD1'}
                </button>
              )}
            </div>
            <div className={styles.propertyRow}>
              <span className={styles.propertyKey}>类型</span>
              <span
                className={styles.propertyBadge}
                style={{ backgroundColor: getNodeColor(node) }}
              >
                {node.type}
              </span>
            </div>
            <div className={styles.propertyRow}>
              <span className={styles.propertyKey}>ID</span>
              <span className={styles.propertyValue}>{node.id}</span>
            </div>
            <div className={styles.propertyRow}>
              <span className={styles.propertyKey}>名称</span>
              <span className={styles.propertyValue}>{node.name}</span>
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitleProperties}>属性</h3>
            {sortedProperties.map(([key, value]) => (
              <div key={key} className={styles.propertyRow}>
                <span className={styles.propertyKey}>{key}</span>
                <span className={styles.propertyValue}>
                  {formatPropertyValue(value)}
                </span>
              </div>
            ))}
            {sortedProperties.length === 0 && (
              <p className={styles.emptyProperties}>无其他属性</p>
            )}
          </div>

          {/* Delete confirmation modal */}
          {showDeleteConfirm && (
            <div className={styles.confirmOverlay} onClick={handleDeleteCancel}>
              <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.confirmIcon}>
                  <AlertTriangle size={28} />
                </div>
                <h4 className={styles.confirmTitle}>删除节点</h4>
                <p className={styles.confirmText}>
                  删除 <strong>{node.type}: {node.name}</strong> 将永久从图中移除该节点及其所有关系。
                </p>
                <p className={styles.confirmWarning}>
                  这可能破坏图的连通性，并影响智能体对攻击链上下文的理解能力。
                </p>
                <div className={styles.confirmActions}>
                  <button
                    className={styles.confirmCancelBtn}
                    onClick={handleDeleteCancel}
                  >
                    取消
                  </button>
                  <button
                    className={styles.confirmDeleteBtn}
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting}
                  >
                    {isDeleting ? '删除中...' : '删除'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Drawer>
  )
}
