import { create } from "zustand"
import { Agent, Command } from "../api/c2"

interface C2State {
  agents: Agent[]
  activeAgent: Agent | null
  commands: Record<string, Command[]>
  setAgents: (agents: Agent[]) => void
  setActiveAgent: (agent: Agent | null) => void
  addCommand: (agentId: string, cmd: Command) => void
  setCommands: (agentId: string, cmds: Command[]) => void
}

export const useC2Store = create<C2State>((set) => ({
  agents: [],
  activeAgent: null,
  commands: {},
  setAgents: (agents) => set({ agents }),
  setActiveAgent: (agent) => set({ activeAgent: agent }),
  addCommand: (agentId, cmd) =>
    set((s) => ({
      commands: { ...s.commands, [agentId]: [cmd, ...(s.commands[agentId] || [])] },
    })),
  setCommands: (agentId, cmds) =>
    set((s) => ({ commands: { ...s.commands, [agentId]: cmds } })),
}))
