'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CypherFixTab } from '@/app/graph/components/CypherFixTab/CypherFixTab'
import { useRemediations, useCypherFixTriageWS } from '@/hooks'
import { useProject } from '@/providers/ProjectProvider'
import { WikiInfoButton } from '@/components/ui'
import styles from './page.module.css'

export default function CypherFixPage() {
  const router = useRouter()
  const { projectId, userId, isLoading: projectLoading } = useProject()

  const [showTriageProgress, setShowTriageProgress] = useState(false)

  const { refetch: refetchRemediations } = useRemediations({
    projectId: projectId || '',
    enabled: !!projectId,
  })

  const triage = useCypherFixTriageWS({
    userId: userId || '',
    projectId: projectId || '',
    onComplete: () => {
      refetchRemediations()
    },
  })

  const handleStartTriage = useCallback(() => {
    setShowTriageProgress(true)
    triage.startTriage()
  }, [triage])

  const handleCloseTriageProgress = useCallback(() => {
    setShowTriageProgress(false)
    triage.disconnect()
    if (triage.status === 'completed') {
      refetchRemediations()
    }
  }, [triage, refetchRemediations])

  if (!projectLoading && !projectId) {
    return (
      <div className={styles.page}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
          <h2>未选择项目</h2>
          <p>请从顶部下拉菜单中选择项目或创建新项目。</p>
          <button className="primaryButton" onClick={() => router.push('/projects')}>
            前往项目
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page} style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: 12, right: 16, zIndex: 5 }}>
        <WikiInfoButton target="cypherfix" title="打开 CypherFix 文档页面" />
      </div>
      <CypherFixTab
        projectId={projectId || ''}
        userId={userId || ''}
        triage={triage}
        showTriageProgress={showTriageProgress}
        onStartTriage={handleStartTriage}
        onCloseTriageProgress={handleCloseTriageProgress}
      />
    </div>
  )
}
