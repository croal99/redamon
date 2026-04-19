export type CenterApiResponse<T> = {
  code: number
  message?: string
  data?: T
}

export type CenterClientInfo = {
  client_id?: string
  connect_at?: number
  remote_addr?: string
  host_id?: string
  hostname?: string
}

export type NormalizedCenterClientInfo = {
  clientId: string
  connectAt: number
  remoteAddr: string
  hostId: string
  hostname: string
}
