'use client'

import { useState } from 'react'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { Drawer, ExternalLink } from '@/components/ui'
import { GraphNode } from '../../types'
import { getNodeColor, getNodeUrl } from '../../utils'
import { renderPropertyValue } from '../../utils/renderPropertyValue'
import { ClusterNodeList } from './ClusterNodeList'
import styles from './NodeDrawer.module.css'
import clusterStyles from './ClusterNodeList.module.css'

interface NodeDrawerProps {
  node: GraphNode | null
  isOpen: boolean
  onClose: () => void
  onDeleteNode?: (nodeId: string) => Promise<void>
  expandedChild?: GraphNode | null
  onExpandChild?: (child: GraphNode) => void
  onCollapseChild?: () => void
}

export function NodeDrawer({
  node,
  isOpen,
  onClose,
  onDeleteNode,
  expandedChild,
  onExpandChild,
  onCollapseChild,
}: NodeDrawerProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  // Determine what to display:
  // - Root is a cluster with nothing expanded → show its child list
  // - Root is a cluster with expanded node that is ALSO a cluster → show that cluster's list (nested)
  // - Root is a cluster with expanded leaf node → show that leaf's properties
  // - Root is a regular node → show its properties
  const isCluster = !!node?.isCluster
  const topOfStack = expandedChild ?? null
  const showList = (isCluster && !topOfStack) || !!topOfStack?.isCluster
  const listCluster: GraphNode | null = topOfStack?.isCluster ? topOfStack : (isCluster ? node : null)
  const displayNode: GraphNode | null = showList ? null : (topOfStack ?? node)

  const handleDeleteConfirm = async () => {
    if (!displayNode || !onDeleteNode) return
    setIsDeleting(true)
    try {
      await onDeleteNode(displayNode.id)
      setShowDeleteConfirm(false)
      onClose()
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
  }

  const hiddenKeys = ['project_id', 'user_id']
  const sortedProperties = displayNode
    ? Object.entries(displayNode.properties || {})
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

  const drawerTitle = node
    ? showList && listCluster
      ? `集群：${listCluster.clusterChildType ?? ''}`
      : displayNode
        ? `${displayNode.type}: ${displayNode.name}`
        : undefined
    : undefined

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      position="left"
      mode="overlay"
      title={drawerTitle}
    >
      {showList && listCluster && (
        <>
          {topOfStack && onCollapseChild && (
            <button
              className={clusterStyles.backBtn}
              onClick={onCollapseChild}
            >
              <ArrowLeft size={14} />
              返回
            </button>
          )}
          <ClusterNodeList
            cluster={listCluster}
            onSelectChild={(child) => onExpandChild?.(child)}
          />
        </>
      )}

      {displayNode && !showList && (
        <>
          {isCluster && onCollapseChild && (
            <button
              className={clusterStyles.backBtn}
              onClick={onCollapseChild}
            >
              <ArrowLeft size={14} />
              返回列表
            </button>
          )}

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitleBasicInfo}>基本信息</h3>
              {displayNode.type !== 'Domain' && displayNode.type !== 'Subdomain' && onDeleteNode && (
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
                style={{ backgroundColor: getNodeColor(displayNode) }}
              >
                {displayNode.type}
              </span>
            </div>
            <div className={styles.propertyRow}>
              <span className={styles.propertyKey}>ID</span>
              <span className={styles.propertyValue}>{displayNode.id}</span>
            </div>
            <div className={styles.propertyRow}>
              <span className={styles.propertyKey}>名称</span>
              <span className={styles.propertyValue}>
                {(() => {
                  const url = getNodeUrl(displayNode)
                  return url
                    ? <ExternalLink href={url}>{displayNode.name}</ExternalLink>
                    : displayNode.name
                })()}
              </span>
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitleProperties}>属性</h3>
            {sortedProperties.map(([key, value]) => {
              const nodeUrl = key === 'name' ? getNodeUrl(displayNode) : null
              return (
                <div key={key} className={styles.propertyRow}>
                  <span className={styles.propertyKey}>{key}</span>
                  <span className={styles.propertyValue}>
                    {nodeUrl
                      ? <ExternalLink href={nodeUrl}>{String(value)}</ExternalLink>
                      : renderPropertyValue(value)}
                  </span>
                </div>
              )
            })}
            {sortedProperties.length === 0 && (
              <p className={styles.emptyProperties}>无附加属性</p>
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
                  删除 <strong>{displayNode.type}: {displayNode.name}</strong> 将永久移除该节点及其所有关系。
                </p>
                <p className={styles.confirmWarning}>
                  这可能破坏图谱的连通性，并影响智能体解读攻击链上下文的能力。
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
