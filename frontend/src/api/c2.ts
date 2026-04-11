import apiClient from "./client"

export type AgentStatus = "online" | "offline" | "idle"
export type CommandStatus = "pending" | "sent" | "running" | "completed" | "failed" | "timeout"

export interface Agent {
  id: string
  name: string
  hostname?: string
  os?: string
  arch?: string
  ip_internal?: string
  ip_external?: string
  status: AgentStatus
  version?: string
  last_heartbeat?: string
  registered_at: string
  connected?: boolean
}

export interface Command {
  id: string
  agent_id: string
  command: string
  status: CommandStatus
  output?: string
  exit_code?: number
  issued_by?: string
  issued_at: string
  completed_at?: string
  timeout_seconds: number
}

export const c2Api = {
  listAgents: () => apiClient.get<Agent[]>("/c2/agents").then((r) => r.data),
  getAgent: (id: string) => apiClient.get<Agent>(`/c2/agents/${id}`).then((r) => r.data),
  issueCommand: (agentId: string, command: string, timeout = 60) =>
    apiClient.post<Command>(`/c2/agents/${agentId}/commands`, { command, timeout_seconds: timeout }).then((r) => r.data),
  listCommands: (agentId: string) =>
    apiClient.get<Command[]>(`/c2/agents/${agentId}/commands`).then((r) => r.data),
  getCommand: (id: string) => apiClient.get<Command>(`/c2/commands/${id}`).then((r) => r.data),
}
