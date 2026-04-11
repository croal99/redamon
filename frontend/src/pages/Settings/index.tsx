import React, { useEffect, useState } from "react"
import { settingsApi } from "../../api/settings"
import { userApi, User } from "../../api/auth"
import { useAuthStore } from "../../store/auth.store"
import { Brain, Users, ScrollText, Cpu, CheckCircle, XCircle, Loader, Plus, Trash2 } from "lucide-react"

const tabs = [
  { id: "ai", label: "AI Config", icon: Brain },
  { id: "users", label: "Users", icon: Users },
  { id: "audit", label: "Audit Log", icon: ScrollText },
  { id: "system", label: "System", icon: Cpu },
]

const providers = [
  { id: "ollama", label: "Ollama", desc: "Local LLM (privacy-first)", color: "text-cyber-green" },
  { id: "openai", label: "OpenAI", desc: "GPT-4o / GPT-4o-mini", color: "text-cyber-cyan" },
  { id: "claude", label: "Claude", desc: "Anthropic Claude 3.5", color: "text-purple-400" },
]

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("ai")
  const [selectedProvider, setSelectedProvider] = useState("ollama")
  const [model, setModel] = useState("llama3.2")
  const [apiKey, setApiKey] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "ok" | "error">("idle")
  const [testMsg, setTestMsg] = useState("")
  const [mcpHealth, setMcpHealth] = useState<Record<string, { status: string; url: string }>>({})
  const [users, setUsers] = useState<User[]>([])
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "operator" })
  const currentUser = useAuthStore((s) => s.user)

  useEffect(() => {
    settingsApi.getMcpHealth().then(setMcpHealth).catch(console.error)
    if (currentUser?.role === "admin") {
      userApi.list().then(setUsers).catch(console.error)
    }
  }, [])

  const handleTestProvider = () => {
    setTestStatus("loading")
    settingsApi.testProvider({ provider: selectedProvider, model, api_key: apiKey, base_url: baseUrl })
      .then((r) => { setTestStatus("ok"); setTestMsg(r.response) })
      .catch((e) => { setTestStatus("error"); setTestMsg(e.message) })
  }

  const handleCreateUser = () => {
    userApi.create({ username: newUser.username, password: newUser.password, role: newUser.role })
      .then((u) => {
        setUsers((prev) => [...prev, u])
        setNewUser({ username: "", password: "", role: "operator" })
      })
      .catch(console.error)
  }

  const handleDeleteUser = (id: string) => {
    userApi.delete(id).then(() => setUsers((prev) => prev.filter((u) => u.id !== id))).catch(console.error)
  }

  return (
    <div className="p-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-mono font-bold text-cyber-text">Settings</h1>
        <p className="text-cyber-muted text-sm font-mono mt-1">Platform configuration and management</p>
      </div>

      <div className="flex gap-6">
        {/* Left nav */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-mono text-sm transition-all duration-200 cursor-pointer ${
                  activeTab === id
                    ? "bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/30"
                    : "text-cyber-muted hover:text-cyber-text hover:bg-white/5"
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* AI Config */}
          {activeTab === "ai" && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-sm font-mono font-bold text-cyber-cyan uppercase tracking-wider">AI Provider Configuration</h2>
              <div className="grid grid-cols-3 gap-3">
                {providers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProvider(p.id)}
                    className={`glass-card p-4 text-left transition-all duration-200 cursor-pointer ${
                      selectedProvider === p.id ? "border-cyber-cyan/50 shadow-cyber-cyan" : "hover:border-cyber-cyan/20"
                    }`}
                  >
                    <div className={`font-mono font-bold text-sm ${p.color}`}>{p.label}</div>
                    <div className="text-xs text-cyber-muted font-mono mt-1">{p.desc}</div>
                  </button>
                ))}
              </div>
              <div className="space-y-3 glass-card p-4">
                <div>
                  <label className="block text-xs font-mono text-cyber-muted mb-1 uppercase">Model</label>
                  <input value={model} onChange={(e) => setModel(e.target.value)} className="cyber-input w-full" placeholder="llama3.2 / gpt-4o-mini / claude-3-5-haiku" />
                </div>
                {selectedProvider !== "ollama" && (
                  <div>
                    <label className="block text-xs font-mono text-cyber-muted mb-1 uppercase">API Key</label>
                    <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="cyber-input w-full" placeholder="sk-..." />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-mono text-cyber-muted mb-1 uppercase">Base URL (optional)</label>
                  <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className="cyber-input w-full" placeholder="http://localhost:11434" />
                </div>
                <button onClick={handleTestProvider} disabled={testStatus === "loading"} className="cyber-btn flex items-center gap-2">
                  {testStatus === "loading" ? <Loader size={14} className="animate-spin" /> : <Brain size={14} />}
                  Test Connection
                </button>
                {testStatus === "ok" && <p className="text-cyber-green font-mono text-xs flex items-center gap-1"><CheckCircle size={12} />Success: {testMsg}</p>}
                {testStatus === "error" && <p className="text-cyber-red font-mono text-xs flex items-center gap-1"><XCircle size={12} />{testMsg}</p>}
              </div>

              {/* MCP Health */}
              <div>
                <h3 className="text-sm font-mono font-bold text-cyber-cyan uppercase tracking-wider mb-3">MCP Tool Services</h3>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(mcpHealth).map(([name, info]) => (
                    <div key={name} className="glass-card p-3 flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${info.status === "ok" ? "bg-cyber-green animate-breathing" : "bg-cyber-red"}`} />
                      <div>
                        <div className="font-mono text-xs text-cyber-text">{name.replace(/_/g, "-")}</div>
                        <div className="font-mono text-xs text-cyber-muted">{info.status.toUpperCase()}</div>
                      </div>
                    </div>
                  ))}
                  {Object.keys(mcpHealth).length === 0 && (
                    <div className="col-span-3 text-center py-4 text-cyber-muted font-mono text-xs">Loading MCP health...</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Users */}
          {activeTab === "users" && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-sm font-mono font-bold text-cyber-cyan uppercase tracking-wider">User Management</h2>
              {currentUser?.role === "admin" && (
                <div className="glass-card p-4 flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-mono text-cyber-muted mb-1">Username</label>
                    <input value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} className="cyber-input w-full" placeholder="New username" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-mono text-cyber-muted mb-1">Password</label>
                    <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="cyber-input w-full" placeholder="Password" />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-cyber-muted mb-1">Role</label>
                    <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="cyber-input">
                      <option value="operator">operator</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>
                  <button onClick={handleCreateUser} className="cyber-btn flex items-center gap-1.5 py-2">
                    <Plus size={14} />Add
                  </button>
                </div>
              )}
              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.id} className="glass-card px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyber-cyan to-cyber-blue flex items-center justify-center text-cyber-bg font-mono text-xs font-bold">
                        {u.username[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-mono text-sm text-cyber-text">{u.username}</div>
                        <div className="text-xs text-cyber-muted font-mono">{u.email || "No email"}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-mono ${u.role === "admin" ? "bg-red-400/20 text-red-400" : "bg-blue-400/20 text-blue-400"}`}>
                        {u.role}
                      </span>
                      <span className={`text-xs font-mono ${u.is_active ? "text-cyber-green" : "text-cyber-muted"}`}>
                        {u.is_active ? "active" : "inactive"}
                      </span>
                      {currentUser?.role === "admin" && u.id !== currentUser?.id && (
                        <button onClick={() => handleDeleteUser(u.id)} className="text-cyber-muted hover:text-cyber-red transition-colors cursor-pointer">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System */}
          {activeTab === "system" && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-sm font-mono font-bold text-cyber-cyan uppercase tracking-wider">System Information</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Platform", value: "BlueNet v1.0.0" },
                  { label: "Auth Service", value: "Python 3.11 + FastAPI" },
                  { label: "Scan Service", value: "Python 3.11 + Celery" },
                  { label: "AI Service", value: "LangChain + DeepAgents" },
                  { label: "C2 Service", value: "Go 1.22 + Fiber" },
                  { label: "Document Service", value: "Go 1.22 + Fiber" },
                  { label: "Database", value: "PostgreSQL 16" },
                  { label: "Message Queue", value: "Redis 7" },
                ].map(({ label, value }) => (
                  <div key={label} className="glass-card p-3">
                    <div className="text-xs font-mono text-cyber-muted uppercase">{label}</div>
                    <div className="text-sm font-mono text-cyber-cyan mt-1">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "audit" && (
            <div className="animate-fade-in">
              <h2 className="text-sm font-mono font-bold text-cyber-cyan uppercase tracking-wider mb-4">Audit Log</h2>
              <div className="text-center py-12 text-cyber-muted font-mono text-sm glass-card">Audit log viewer — connect to database to view operations</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
