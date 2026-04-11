import React from "react"
import { useLocation } from "react-router-dom"
import { Bell, User, ChevronDown } from "lucide-react"
import { useAuthStore } from "../../store/auth.store"

const moduleNames: Record<string, string> = {
  "/home": "主页",
  "/scan": "AI Scanner",
  "/c2": "C2 Control",
  "/document": "Document AI",
  "/setting": "Settings",
}

const TopBar: React.FC = () => {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const moduleName = moduleNames[location.pathname] || "BlueNet"

  return (
    <header className="fixed top-0 left-16 right-0 h-14 bg-cyber-bg2/80 backdrop-blur-md border-b border-cyber-border flex items-center justify-between px-6 z-40">
      {/* Left: breadcrumb */}
      <div className="flex items-center gap-2">
        <span className="text-cyber-muted font-mono text-sm">合盛智核</span>
        <span className="text-cyber-muted">/</span>
        <span className="text-cyber-cyan font-mono text-sm font-semibold">{moduleName}</span>
      </div>

      {/* Center: status ticker */}
      <div className="hidden md:flex items-center gap-2 font-mono text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyber-green animate-breathing" />
          <span className="text-cyber-green">SECURE CONNECTION</span>
        </div>
        <span className="text-cyber-muted mx-2">|</span>
        <span className="text-cyber-muted">{new Date().toLocaleTimeString()}</span>
      </div>

      {/* Right: user */}
      <div className="flex items-center gap-3">
        <button className="w-8 h-8 rounded-md bg-white/5 border border-cyber-border flex items-center justify-center text-cyber-muted hover:text-cyber-cyan hover:border-cyber-cyan/30 transition-colors cursor-pointer">
          <Bell size={16} />
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 border border-cyber-border hover:border-cyber-cyan/30 transition-colors cursor-pointer">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyber-cyan to-cyber-blue flex items-center justify-center">
            <User size={12} className="text-cyber-bg" />
          </div>
          <span className="font-mono text-sm text-cyber-text">{user?.username}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${user?.role === "admin" ? "bg-red-400/20 text-red-400" : "bg-blue-400/20 text-blue-400"}`}>
            {user?.role}
          </span>
          <ChevronDown size={14} className="text-cyber-muted" />
        </div>
      </div>
    </header>
  )
}

export default TopBar
