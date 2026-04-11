import React, { useState, useEffect } from "react"
import { Agent, c2Api, Command } from "../../api/c2"
import Terminal, { TerminalLine } from "../../components/Terminal"
import { useC2Store } from "../../store/c2.store"

interface Props {
  agent: Agent
}

const CommandConsole: React.FC<Props> = ({ agent }) => {
  const { commands, addCommand, setCommands } = useC2Store()
  const agentCmds = commands[agent.id] || []
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: "system", content: `Connected to agent: ${agent.name} (${agent.ip_internal || agent.ip_external})` },
    { type: "system", content: `OS: ${agent.os || "unknown"} | Status: ${agent.status}` },
    { type: "system", content: "─────────────────────────────────────────────" },
  ])

  useEffect(() => {
    c2Api.listCommands(agent.id)
      .then((cmds) => {
        setCommands(agent.id, cmds)
        const historicLines: TerminalLine[] = []
        cmds.slice().reverse().forEach((cmd) => {
          historicLines.push({ type: "input", content: cmd.command })
          if (cmd.output) historicLines.push({ type: "output", content: cmd.output })
          if (cmd.status === "failed") historicLines.push({ type: "error", content: `Exit code: ${cmd.exit_code ?? "unknown"}` })
        })
        setLines((prev) => [...prev, ...historicLines])
      })
      .catch(console.error)
  }, [agent.id])

  const handleCommand = (cmd: string) => {
    setLines((prev) => [...prev, { type: "input", content: cmd }])
    c2Api.issueCommand(agent.id, cmd)
      .then((command: Command) => {
        addCommand(agent.id, command)
        setLines((prev) => [...prev, {
          type: "system",
          content: `[${new Date().toLocaleTimeString()}] Command queued (ID: ${command.id.substring(0, 8)})`,
        }])
        // Poll for result
        const poll = setInterval(() => {
          c2Api.getCommand(command.id)
            .then((c) => {
              if (c.status === "completed" || c.status === "failed") {
                clearInterval(poll)
                if (c.output) {
                  setLines((prev) => [...prev, { type: c.status === "failed" ? "error" : "output", content: c.output! }])
                }
              }
            })
            .catch(() => clearInterval(poll))
        }, 1500)
        setTimeout(() => clearInterval(poll), 120000)
      })
      .catch((err) => {
        setLines((prev) => [...prev, { type: "error", content: `Error: ${err.message}` }])
      })
  }

  const isOnline = agent.connected || agent.status === "online"

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Agent info header */}
      <div className="glass-card px-4 py-3 flex items-center justify-between">
        <div className="font-mono text-sm">
          <span className="text-cyber-muted">agent://</span>
          <span className="text-cyber-cyan font-bold">{agent.name}</span>
          <span className="text-cyber-muted ml-2">({agent.ip_internal || "?"})</span>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className={isOnline ? "text-cyber-green" : "text-cyber-muted"}>
            {isOnline ? "● CONNECTED" : "○ OFFLINE"}
          </span>
          <span className="text-cyber-muted">{agentCmds.length} cmds</span>
        </div>
      </div>
      {/* Terminal */}
      <div className="flex-1 min-h-0">
        <Terminal
          lines={lines}
          onCommand={handleCommand}
          placeholder="Enter shell command..."
          disabled={!isOnline}
        />
      </div>
    </div>
  )
}

export default CommandConsole
