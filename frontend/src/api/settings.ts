import apiClient from "./client"

export interface Setting {
  key: string
  value: string
  description?: string
  is_sensitive: boolean
  updated_at: string
}

export const settingsApi = {
  getProvider: () => apiClient.get("/ai/settings/provider").then((r) => r.data),
  testProvider: (data: { provider: string; model: string; api_key?: string; base_url?: string }) =>
    apiClient.post("/ai/settings/provider/test", data).then((r) => r.data),
  getMcpHealth: () => apiClient.get("/ai/settings/mcp/health").then((r) => r.data),
}
