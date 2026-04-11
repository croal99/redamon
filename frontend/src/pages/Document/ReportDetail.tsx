import React, { useEffect, useState } from "react"
import { Document, AnalysisResult, documentApi } from "../../api/document"
import { FileText, AlertTriangle, Info, ChevronDown, Download, Shield } from "lucide-react"

interface Props {
  document: Document
  onClose: () => void
}

const sevGroups = ["critical", "high", "medium", "low", "info"] as const

const ReportDetail: React.FC<Props> = ({ document, onClose }) => {
  const [results, setResults] = useState<AnalysisResult[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ critical: true, high: true })

  useEffect(() => {
    documentApi.getResults(document.id)
      .then(setResults)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [document.id])

  const byGroup = sevGroups.reduce((acc, sev) => {
    acc[sev] = results.filter((r) => r.severity === sev)
    return acc
  }, {} as Record<string, AnalysisResult[]>)

  const sevStyle: Record<string, string> = {
    critical: "text-red-400 border-red-400/30 bg-red-400/5",
    high: "text-orange-400 border-orange-400/30 bg-orange-400/5",
    medium: "text-yellow-400 border-yellow-400/30 bg-yellow-400/5",
    low: "text-blue-400 border-blue-400/30 bg-blue-400/5",
    info: "text-gray-400 border-gray-400/30 bg-gray-400/5",
  }

  return (
    <div className="glass-card flex flex-col h-full animate-slide-in-right overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-cyber-border">
        <div className="flex items-center gap-3 min-w-0">
          <FileText size={18} className="text-cyber-cyan flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-mono font-bold text-cyber-text truncate">{document.original_name}</p>
            <p className="text-xs text-cyber-muted font-mono">{document.finding_count} findings found</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => documentApi.downloadReport(document.id)}
            className="cyber-btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5"
          >
            <Download size={14} />Export PDF
          </button>
          <button onClick={onClose} className="text-cyber-muted hover:text-cyber-red transition-colors cursor-pointer text-xl font-mono">✕</button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center py-8 text-cyber-muted font-mono text-sm">Loading analysis results...</div>
        ) : results.length === 0 ? (
          <div className="text-center py-8 text-cyber-muted font-mono text-sm">
            <Shield size={32} className="mx-auto mb-3 opacity-20" />
            No findings detected
          </div>
        ) : (
          sevGroups.map((sev) => {
            const group = byGroup[sev]
            if (group.length === 0) return null
            return (
              <div key={sev} className={`rounded-lg border ${sevStyle[sev]} overflow-hidden`}>
                <button
                  onClick={() => setExpanded((p) => ({ ...p, [sev]: !p[sev] }))}
                  className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/3 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} />
                    <span className="font-mono text-sm font-bold uppercase">{sev}</span>
                    <span className="text-xs font-mono opacity-70">({group.length})</span>
                  </div>
                  <ChevronDown size={14} className={`transition-transform ${expanded[sev] ? "rotate-180" : ""}`} />
                </button>
                {expanded[sev] && (
                  <div className="divide-y divide-cyber-border/30">
                    {group.map((r) => (
                      <div key={r.id} className="px-4 py-3">
                        <div className="font-mono text-sm font-semibold mb-1">{r.title}</div>
                        {r.description && <p className="text-xs opacity-70 font-mono">{r.description}</p>}
                        {r.content && (
                          <pre className="text-xs mt-2 p-2 bg-black/30 rounded font-mono overflow-x-auto opacity-60 max-h-24 overflow-y-auto">{r.content}</pre>
                        )}
                        {r.location && <p className="text-xs mt-1 font-mono opacity-50">📍 {r.location}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default ReportDetail
