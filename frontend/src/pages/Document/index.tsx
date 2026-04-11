import React, { useEffect, useState } from "react"
import { documentApi, Document } from "../../api/document"
import UploadZone from "./UploadZone"
import ReportDetail from "./ReportDetail"
import { FileSearch, Brain, Clock, AlertCircle, CheckCircle, Loader } from "lucide-react"

const statusIcon: Record<string, React.ReactNode> = {
  pending: <Clock size={14} className="text-cyber-muted" />,
  extracting: <Loader size={14} className="text-cyber-cyan animate-spin" />,
  analyzing: <Brain size={14} className="text-cyber-cyan animate-pulse" />,
  completed: <CheckCircle size={14} className="text-cyber-green" />,
  failed: <AlertCircle size={14} className="text-cyber-red" />,
}

const DocumentPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([])
  const [activeDoc, setActiveDoc] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    documentApi.list().then(setDocuments).catch(console.error).finally(() => setLoading(false))
    const interval = setInterval(() => {
      documentApi.list().then(setDocuments).catch(console.error)
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleUploaded = (doc: Document) => {
    setDocuments((prev) => [doc, ...prev])
  }

  const handleAnalyze = (doc: Document) => {
    documentApi.analyze(doc.id)
      .then(() => {
        setDocuments((prev) => prev.map((d) => d.id === doc.id ? { ...d, analysis_status: "analyzing" } : d))
      })
      .catch(console.error)
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-mono font-bold text-cyber-text flex items-center gap-2">
            <FileSearch size={22} className="text-cyber-cyan" />
            Document AI Analysis
          </h1>
          <p className="text-cyber-muted text-sm font-mono mt-1">AI-powered security analysis for files and documents</p>
        </div>
        <div className="text-right font-mono">
          <div className="text-3xl font-bold text-cyber-cyan">{documents.length}</div>
          <div className="text-xs text-cyber-muted">documents</div>
        </div>
      </div>

      <UploadZone onUploaded={handleUploaded} />

      <div className={`grid gap-6 ${activeDoc ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
        {/* Document grid */}
        <div>
          <h3 className="text-sm font-mono font-bold text-cyber-cyan uppercase tracking-wider mb-3">Documents</h3>
          {loading ? (
            <div className="text-center py-8 text-cyber-muted font-mono text-sm">Loading...</div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12 text-cyber-muted font-mono text-sm">No documents uploaded yet</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {documents.map((doc) => (
                <div key={doc.id} className="glass-card p-4 space-y-3 hover:border-cyber-cyan/30 transition-all duration-200">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-sm text-cyber-text truncate">{doc.original_name}</p>
                      <p className="text-xs text-cyber-muted font-mono">{formatSize(doc.size_bytes)}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {statusIcon[doc.analysis_status] || statusIcon.pending}
                    </div>
                  </div>
                  {doc.finding_count > 0 && (
                    <div className="text-xs font-mono text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded px-2 py-1">
                      {doc.finding_count} findings
                    </div>
                  )}
                  <div className="flex gap-2">
                    {doc.analysis_status === "pending" && (
                      <button
                        onClick={() => handleAnalyze(doc)}
                        className="cyber-btn text-xs px-3 py-1.5 flex items-center gap-1.5"
                      >
                        <Brain size={12} />Analyze
                      </button>
                    )}
                    {doc.analysis_status === "completed" && (
                      <button
                        onClick={() => setActiveDoc(doc)}
                        className="cyber-btn-ghost text-xs px-3 py-1.5"
                      >
                        View Report
                      </button>
                    )}
                    {doc.analysis_status === "analyzing" && (
                      <span className="text-xs text-cyber-cyan font-mono flex items-center gap-1">
                        <Loader size={12} className="animate-spin" />Analyzing...
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Report detail */}
        {activeDoc && (
          <div className="h-96 lg:h-auto">
            <ReportDetail document={activeDoc} onClose={() => setActiveDoc(null)} />
          </div>
        )}
      </div>
    </div>
  )
}

export default DocumentPage
