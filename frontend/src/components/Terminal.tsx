import React, { useEffect, useRef, useState } from "react"
import { Terminal as TerminalIcon, ChevronRight } from "lucide-react"

export interface TerminalLine {
  type: "input" | "output" | "error" | "system"
  content: string
  timestamp?: string
}

interface TerminalProps {
  lines: TerminalLine[]
  onCommand: (cmd: string) => void
  placeholder?: string
  disabled?: boolean
}

const Terminal: React.FC<TerminalProps> = ({ lines, onCommand, placeholder = "Enter command...", disabled }) => {
  const [input, setInput] = useState("")
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [lines])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || disabled) return
    onCommand(input.trim())
    setHistory((h) => [input.trim(), ...h].slice(0, 100))
    setHistIdx(-1)
    setInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      const idx = Math.min(histIdx + 1, history.length - 1)
      setHistIdx(idx)
      setInput(history[idx] || "")
    } else if (e.key === "ArrowDown") {
      const idx = Math.max(histIdx - 1, -1)
      setHistIdx(idx)
      setInput(idx === -1 ? "" : history[idx] || "")
    }
  }

  const lineColor: Record<string, string> = {
    input: "text-cyber-cyan",
    output: "text-cyber-terminal-green",
    error: "text-cyber-red",
    system: "text-cyber-muted",
  }

  return (
    <div
      className="flex flex-col h-full bg-cyber-terminal rounded-lg border border-cyber-border font-mono text-sm"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-cyber-border">
        <TerminalIcon size={14} className="text-cyber-green" />
        <span className="text-cyber-green text-xs">TERMINAL</span>
        <div className="ml-auto flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
        </div>
      </div>

      {/* Output */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 min-h-0">
        {lines.map((line, i) => (
          <div key={i} className={`flex gap-2 ${lineColor[line.type] || "text-cyber-text"}`}>
            {line.type === "input" && <ChevronRight size={14} className="mt-0.5 flex-shrink-0 text-cyber-cyan" />}
            <pre className="whitespace-pre-wrap break-all leading-5">{line.content}</pre>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 border-t border-cyber-border">
        <ChevronRight size={14} className="text-cyber-cyan flex-shrink-0" />
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "No agent connected" : placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent text-cyber-terminal-green placeholder-cyber-muted/50 outline-none caret-cyber-cyan font-mono text-sm disabled:opacity-40"
          spellCheck={false}
          autoComplete="off"
        />
      </form>
    </div>
  )
}

export default Terminal
