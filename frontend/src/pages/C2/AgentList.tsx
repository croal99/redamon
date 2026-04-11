import React from "react"
import { Agent } from "../../api/c2"
import { Monitor, Apple, Server, Wifi, WifiOff } from "lucide-react"

interface Props {
  agents: Agent[]
  activeId?: string
  onSelect: (agent: Agent) => void
}

const osIcon = (os?: string) => {
  if (!os) return <Server size={16} className="text-cyber-muted" />
  const lower = os.toLowerCase()
  if (lower.includes("windows")) return <Monitor size={16} className="text-blue-400" />
  if (lower.includes("mac") || lower.includes("darwin")) return <Apple size={16} className="text-gray-400" />
  return <Server size={16} className="text-cyber-green" />
}

const AgentList: React.FC<Props> = ({ agents, activeId, onSelect }) => {
  const online = agents.filter((a) => a.connected || a.status === "online")
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-mono font-bold text-cyber-cyan uppercase tracking-wider">Agents</h3>
        <div className="flex items-center gap-1.5 text-xs font-mono text-cyber-green">
          <span className="w-1.5 h-1.5 rounded-full bg-cyber-green animate-breathing" />
          {online.length} online
        </div>
      </div>
      {agents.length === 0 && (
        <div className="text-center py-8 text-cyber-muted font-mono text-xs">No agents registered</div>
      )}
      {agents.map((agent) => {
        const isOnline = agent.connected || agent.status === "online"
        return (
          <div
            key={agent.id}
            onClick={() => onSelect(agent)}
            className={`glass-card p-3 cursor-pointer transition-all duration-200 hover:border-cyber-cyan/30 ${
              activeId === agent.id ? "border-cyber-cyan/50 bg-cyber-cyan/5" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                {osIcon(agent.os)}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-cyber-bg ${
                    isOnline ? "bg-cyber-green animate-breathing" : "bg-cyber-muted"
                  }`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-sm text-cyber-text truncate">{agent.name}</div>
                <div className="text-xs text-cyber-muted font-mono truncate">{agent.ip_internal || agent.ip_external || "unknown"}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className={`text-xs font-mono flex items-center gap-1 ${isOnline ? "text-cyber-green" : "text-cyber-muted"}`}>
                  {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                  {isOnline ? "online" : "offline"}
                </div>
                <div className="text-xs text-cyber-muted font-mono">{agent.os || "unknown"}</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default AgentList
