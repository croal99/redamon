'use client'

import { useState } from 'react'
import styles from './ClientView.module.css'
import type { CenterClientInfo } from '../../types/center'
import { ViewTabs, type ViewMode } from '../ViewTabs'
import { ClientTerminal } from '../ClientTerminal'
import { ClientInfo } from '../ClientInfo'
import { ClientAIAttack } from '../ClientAIAttack'
import { AIChat } from '../AIChat'

export type ClientViewProps = {
  client: CenterClientInfo
  onBack?: () => void
}

export function ClientView({ client, onBack }: ClientViewProps) {
  const [activeView, setActiveView] = useState<ViewMode>('sessions')

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4 className={styles.title}>【{client.hostname}】</h4>
        {onBack ? (
          <button type="button" className={styles.backBtn} onClick={onBack}>
            返回
          </button>
        ) : null}
      </div>

      <div className={styles.tabsBar}>
        <ViewTabs activeView={activeView} onViewChange={setActiveView} variant="client" />
      </div>

      <div className={styles.viewContent}>
        {activeView === 'terminal' ? (
          client.client_id ? (
            <ClientTerminal clientId={client.client_id} client={client} />
          ) : (
            <div className={styles.empty}>client_id 为空，无法打开终端</div>
          )
        ) : activeView === 'ai-attack' ? (
          <ClientAIAttack client={client} />
        ) : activeView === 'ai-chat' ? (
          <AIChat client={client} />
        ) : (
          <ClientInfo client={client} />
        )}
      </div>
    </div>
  )
}
