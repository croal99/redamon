import scanClient from "./scanClient"

export type ScanType = "port" | "vulnerability" | "webscan"
export type ScanStatus = "pending" | "running" | "completed" | "failed" | "cancelled"
export type Severity = "info" | "low" | "medium" | "high" | "critical"

export interface ScanTask {
  id: string
  name: string
  type: ScanType
  target: string
  status: ScanStatus
  config: Record<string, unknown>
  progress: number
  ai_summary?: string
  ai_remediation?: string
  error_message?: string
  created_by?: string
  started_at?: string
  finished_at?: string
  created_at: string
}

export interface ScanResult {
  id: string
  task_id: string
  host?: string
  port?: number
  protocol?: string
  service?: string
  severity: Severity
  title?: string
  description?: string
  detail: Record<string, unknown>
  created_at: string
}

const unwrapArray = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[]
  if (!payload || typeof payload !== "object") return []

  const obj = payload as Record<string, unknown>
  const candidates = [obj.data, obj.items, obj.results]
  for (const c of candidates) {
    if (Array.isArray(c)) return c as T[]
  }
  return []
}

export const scanApi = {
  createTask: (data: { name: string; type: ScanType; target: string; config?: Record<string, unknown> }) =>
    scanClient.post<ScanTask>("/tasks", data).then((r) => r.data),
  listTasks: (limit = 50, offset = 0) =>
    scanClient.get<unknown>(`/tasks?limit=${limit}&offset=${offset}`).then((r) => unwrapArray<ScanTask>(r.data)),
  getTask: (id: string) => scanClient.get<ScanTask>(`/tasks/${id}`).then((r) => r.data),
  cancelTask: (id: string) => scanClient.delete(`/tasks/${id}`),
  getResults: (taskId: string) =>
    scanClient.get<unknown>(`/results/${taskId}`).then((r) => unwrapArray<ScanResult>(r.data)),
}

export const createSSEStream = (taskId: string, token: string, onProgress: (data: { status: string; progress: number }) => void, onDone: () => void) => {
  const url = `/api/scan/tasks/${taskId}/stream?token=${token}`
  const es = new EventSource(url)
  es.addEventListener("progress", (e) => {
    onProgress(JSON.parse(e.data))
  })
  es.addEventListener("done", () => {
    onDone()
    es.close()
  })
  es.addEventListener("error", () => es.close())
  return es
}
