import React, { useEffect, useState } from "react"
import { c2Api } from "../../api/c2"
import { useC2Store } from "../../store/c2.store"
import AgentList from "./AgentList"
import CommandConsole from "./CommandConsole"
import { Radio } from "lucide-react"

const C2Page: React.FC = () => {
  const { agents, activeAgent, setAgents, setActiveAgent } = useC2Store()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = () => {
      c2Api.listAgents().then(setAgents).catch(console.error).finally(() => setLoading(false))
    }
    fetch()
    const interval = setInterval(fetch, 15000)
    return () => clearInterval(interval)
  }, [])

  const onlineCount = agents.filter((a) => a.connected || a.status === "online").length

  return (
    <div className="p-6 h-[calc(100vh-3.5rem)] flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-mono font-bold text-cyber-text flex items-center gap-2">
            <Radio size={22} className="text-cyber-cyan" />
            C2 Command & Control
          </h1>
          <p className="text-cyber-muted text-sm font-mono mt-1">Real-time agent management and command execution</p>
        </div>
        <div className="text-right font-mono">
          <div className="text-3xl font-bold text-cyber-green">{onlineCount}</div>
          <div className="text-xs text-cyber-muted">online agents</div>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Left: agent list */}
        <div className="w-72 flex-shrink-0 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-cyber-muted font-mono text-sm">Loading agents...</div>
          ) : (
            <AgentList agents={agents} activeId={activeAgent?.id} onSelect={setActiveAgent} />
          )}
        </div>
        {/* Right: console */}
        <div className="flex-1 min-w-0">
          {activeAgent ? (
            <CommandConsole agent={activeAgent} />
          ) : (
            <div className="glass-card h-full flex items-center justify-center text-cyber-muted font-mono text-sm">
              <div className="text-center">
                <Radio size={48} className="mx-auto mb-4 opacity-20" />
                <p>Select an agent to open terminal</p>
                <p className="text-xs mt-2 opacity-60">{agents.length === 0 ? "No agents registered yet" : `${agents.length} agent(s) available`}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default C2Page
