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

export type TerminalAuthType = "key" | "password";

export type TerminalAuthMessage = {
  host_ip: string;
  host_port: number;
  auth_type?: TerminalAuthType;
  username?: string;
  privilege_key?: string;
  password?: string;
}

export type TerminalSizeMessage = {
  cols?: number;
  rows?: number;
}

export type CommandMessage<T> = {
  type: string;
  data?: T;
}
