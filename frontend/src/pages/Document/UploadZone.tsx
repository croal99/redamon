import React, { useCallback, useState } from "react"
import { Upload, File, FileText, Code, Binary, X } from "lucide-react"
import { documentApi, Document } from "../../api/document"

interface Props {
  onUploaded: (doc: Document) => void
}

const fileIcon = (mime?: string) => {
  if (!mime) return <File size={20} />
  if (mime.includes("pdf")) return <FileText size={20} className="text-red-400" />
  if (mime.includes("text") || mime.includes("code") || mime.includes("json")) return <Code size={20} className="text-cyber-green" />
  return <Binary size={20} className="text-purple-400" />
}

const UploadZone: React.FC<Props> = ({ onUploaded }) => {
  const [dragging, setDragging] = useState(false)
  const [files, setFiles] = useState<{ file: File; progress: number; done: boolean; error?: string }[]>([])

  const processFiles = (newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles)
    arr.forEach((file) => {
      const entry = { file, progress: 0, done: false }
      setFiles((prev) => [...prev, entry])
      documentApi.upload(file, (p) => {
        setFiles((prev) => prev.map((e) => e.file === file ? { ...e, progress: p } : e))
      }).then((doc) => {
        setFiles((prev) => prev.map((e) => e.file === file ? { ...e, done: true, progress: 100 } : e))
        onUploaded(doc)
      }).catch((err) => {
        setFiles((prev) => prev.map((e) => e.file === file ? { ...e, error: err.message } : e))
      })
    })
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    processFiles(e.dataTransfer.files)
  }, [])

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files)
  }

  return (
    <div className="space-y-4">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center w-full h-40 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
          dragging
            ? "border-cyber-cyan bg-cyber-cyan/10 shadow-cyber-cyan"
            : "border-cyber-border bg-white/3 hover:border-cyber-cyan/50 hover:bg-cyber-cyan/5"
        }`}
      >
        <input type="file" className="hidden" multiple onChange={onInputChange} />
        <Upload size={32} className={`mb-3 ${dragging ? "text-cyber-cyan animate-bounce" : "text-cyber-muted"}`} />
        <p className="font-mono text-sm text-cyber-text">Drop files here or <span className="text-cyber-cyan">click to browse</span></p>
        <p className="font-mono text-xs text-cyber-muted mt-1">PDF, Office, Source Code, Binary — max 100MB</p>
      </label>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((entry, i) => (
            <div key={i} className="glass-card p-3 flex items-center gap-3">
              {fileIcon(entry.file.type)}
              <div className="flex-1 min-w-0">
                <div className="font-mono text-sm text-cyber-text truncate">{entry.file.name}</div>
                <div className="text-xs text-cyber-muted font-mono">{(entry.file.size / 1024).toFixed(1)} KB</div>
                {!entry.done && !entry.error && (
                  <div className="mt-1.5 h-1 bg-cyber-bg3 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyber-cyan to-cyber-blue rounded-full transition-all duration-300"
                      style={{ width: `${entry.progress}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="flex-shrink-0">
                {entry.done && <span className="text-xs text-cyber-green font-mono">✓ Uploaded</span>}
                {entry.error && <span className="text-xs text-cyber-red font-mono">✗ Error</span>}
                {!entry.done && !entry.error && <span className="text-xs text-cyber-muted font-mono">{entry.progress}%</span>}
              </div>
              <button onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} className="text-cyber-muted hover:text-cyber-red transition-colors cursor-pointer">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default UploadZone
