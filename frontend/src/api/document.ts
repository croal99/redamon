import apiClient from "./client"

export type AnalysisStatus = "pending" | "extracting" | "analyzing" | "completed" | "failed"
export type FindingType = "sensitive_info" | "vulnerability" | "malware" | "credential" | "pii" | "other"
export type Severity = "info" | "low" | "medium" | "high" | "critical"

export interface Document {
  id: string
  filename: string
  original_name: string
  mime_type?: string
  size_bytes: number
  analysis_status: AnalysisStatus
  finding_count: number
  uploaded_by?: string
  uploaded_at: string
  analyzed_at?: string
}

export interface AnalysisResult {
  id: string
  document_id: string
  finding_type: FindingType
  severity: Severity
  title: string
  description?: string
  content?: string
  location?: string
  ai_analysis?: string
  confidence: number
  created_at: string
}

export const documentApi = {
  upload: (file: File, onProgress?: (p: number) => void) => {
    const fd = new FormData()
    fd.append("file", file)
    return apiClient.post<Document>("/document/documents/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => onProgress && onProgress(Math.round((e.loaded / (e.total || 1)) * 100)),
    }).then((r) => r.data)
  },
  list: () => apiClient.get<Document[]>("/document/documents").then((r) => r.data),
  get: (id: string) => apiClient.get<Document>(`/document/documents/${id}`).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/document/documents/${id}`),
  analyze: (id: string) => apiClient.post(`/document/documents/${id}/analyze`),
  getResults: (id: string) => apiClient.get<AnalysisResult[]>(`/document/documents/${id}/results`).then((r) => r.data),
  downloadReport: (id: string) => {
    const token = localStorage.getItem("bluenet_token")
    window.open(`/api/document/documents/${id}/report?token=${token}`, "_blank")
  },
}
