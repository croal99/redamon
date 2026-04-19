'use client'

import styles from './LinkClient.module.css'
import type { CenterClientInfo } from '../../types/center'

function formatConnectAt(ts?: number) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString()
}

export type LinkClientProps = {
  client: CenterClientInfo
  onBack?: () => void
}

export function LinkClient({ client, onBack }: LinkClientProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4 className={styles.title}>Client 信息</h4>
        {onBack ? (
          <button type="button" className={styles.backBtn} onClick={onBack}>
            返回
          </button>
        ) : null}
      </div>

      <div className={styles.grid}>
        <div className={styles.label}>client_id</div>
        <div className={styles.value} title={client.client_id ?? ''}>
          {client.client_id ?? ''}
        </div>

        <div className={styles.label}>hostname</div>
        <div className={styles.value} title={client.hostname ?? ''}>
          {client.hostname ?? ''}
        </div>

        <div className={styles.label}>host_id</div>
        <div className={styles.value} title={client.host_id ?? ''}>
          {client.host_id ?? ''}
        </div>

        <div className={styles.label}>remote_addr</div>
        <div className={styles.value} title={client.remote_addr ?? ''}>
          {client.remote_addr ?? ''}
        </div>

        <div className={styles.label}>connect_at</div>
        <div className={styles.value} title={client.connect_at ? String(client.connect_at) : ''}>
          {formatConnectAt(client.connect_at)}
        </div>
      </div>
    </div>
  )
}
