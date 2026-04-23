'use client'

import styles from './ClientInfo.module.css'
import type { CenterClientInfo } from '../../types/center'

function formatConnectAt(ts?: number) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString()
}

export type ClientInfoProps = {
  client: CenterClientInfo
}

export function ClientInfo({ client }: ClientInfoProps) {
  return (
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
  )
}

