import React from "react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { Shield, Crosshair, Radio, FileSearch, Settings, LogOut, Activity } from "lucide-react"
import { useAuthStore } from "../../store/auth.store"

const navItems = [
  { to: "/home", icon: Shield, label: "主页" },
  { to: "/scan", icon: Crosshair, label: "智核·星图" },
  { to: "/c2", icon: Radio, label: "智核·锋矢" },
  { to: "/document", icon: FileSearch, label: "智核·洞鉴" },
  { to: "/setting", icon: Settings, label: "设置" },
]

const SideNav: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <nav className="fixed left-0 top-0 h-screen w-16 hover:w-52 bg-cyber-bg2 border-r border-cyber-border flex flex-col transition-all duration-300 z-50 group overflow-hidden">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-cyber-border">
        <div className="w-8 h-8 flex-shrink-0 bg-gradient-to-br from-cyber-cyan to-cyber-blue rounded-md flex items-center justify-center animate-pulse-cyan">
          <Shield size={16} className="text-cyber-bg" />
        </div>
        <span className="font-mono font-bold text-cyber-cyan whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          合盛智核
        </span>
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-cyber-border">
        <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
          <Activity size={14} className="text-cyber-green" />
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          <div className="text-xs font-mono text-cyber-green">SYSTEM ONLINE</div>
          <div className="text-xs text-cyber-muted font-mono">{user?.username}</div>
        </div>
      </div>

      {/* Nav items */}
      <div className="flex-1 py-4">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isExternal = to === "/document" || to === "/scan" || to === "/c2"
          const isActive = location.pathname === to
          const base = "flex items-center gap-3 px-4 py-3 mx-2 rounded-md transition-all duration-200 group/item"
          const activeCls = "bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan shadow-cyber-cyan"
          const idleCls = "text-cyber-muted hover:text-cyber-text hover:bg-white/5"
          const cls = `${base} ${isActive ? activeCls : idleCls}`

          if (isExternal) {
            const href = to === "/scan" ? "/scan" : to === "/document" ? "/document" : "/c2"
            return (
              <a key={to} href={href} className={cls}>
                <Icon size={18} className={`flex-shrink-0 ${isActive ? "text-cyber-cyan" : ""}`} />
                <span className="font-mono text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {label}
                </span>
                {isActive && <div className="absolute left-0 w-0.5 h-6 bg-cyber-cyan rounded-r" />}
              </a>
            )
          }

          return (
            <NavLink key={to} to={to} className={({ isActive }) => `${base} ${isActive ? activeCls : idleCls}`}>
              {({ isActive }) => (
                <>
                  <Icon size={18} className={`flex-shrink-0 ${isActive ? "text-cyber-cyan" : ""}`} />
                  <span className="font-mono text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {label}
                  </span>
                  {isActive && <div className="absolute left-0 w-0.5 h-6 bg-cyber-cyan rounded-r" />}
                </>
              )}
            </NavLink>
          )
        })}
      </div>

      {/* Logout */}
      <div className="border-t border-cyber-border p-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-cyber-muted hover:text-cyber-red hover:bg-red-400/5 transition-all duration-200 cursor-pointer"
        >
          <LogOut size={18} className="flex-shrink-0" />
          <span className="font-mono text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            Logout
          </span>
        </button>
      </div>
    </nav>
  )
}

export default SideNav
