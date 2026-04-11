import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Shield, Eye, EyeOff, Lock, User, AlertTriangle } from "lucide-react"
import { authApi } from "../../api/auth"
import { useAuthStore } from "../../store/auth.store"

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    authApi.login({ username, password })
      .then((data) => {
        login(data.access_token, data.refresh_token, data.user)
        navigate("/home", { replace: true })
      })
      .catch((err) => {
        setError(err.response?.data?.detail || "认证失败")
      })
      .finally(() => setLoading(false))
  }

  return (
    <div className="min-h-screen bg-cyber-bg flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated grid background */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: "linear-gradient(rgba(0,212,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.05) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* Scan line animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-full h-px bg-gradient-to-r from-transparent via-cyber-cyan/20 to-transparent animate-scan-line"
          style={{ animationDuration: "6s" }}
        />
      </div>

      {/* Brand */}
      <div className="text-center mb-10 z-10">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-cyber-cyan to-cyber-blue rounded-xl flex items-center justify-center animate-pulse-cyan">
            <Shield size={24} className="text-cyber-bg" />
          </div>
          <h1
            className="text-5xl font-black font-mono animate-glow"
            style={{ background: "linear-gradient(135deg, #00D4FF, #0A84FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            合盛智核​
          </h1>
        </div>
        <p className="text-cyber-muted font-mono text-sm tracking-[0.2em]">高级渗透平台</p>
      </div>

      {/* Login card */}
      <div className="w-full max-w-md z-10 mx-4">
        <div className="glass-card p-8" style={{ boxShadow: "0 0 40px rgba(0, 212, 255, 0.1), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
          <h2 className="text-xl font-mono font-bold text-cyber-text mb-2">操作员认证</h2>
          <p className="text-cyber-muted text-sm font-mono mb-6">输入账号密码以访问平台</p>

          {error && (
            <div className="mb-4 flex items-center gap-2 p-3 rounded-md bg-red-400/10 border border-red-400/30 text-red-400 text-sm font-mono animate-fade-in">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-cyber-muted mb-1.5 uppercase tracking-wider">用户名</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-muted" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  required
                  className="cyber-input w-full pl-10"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-mono text-cyber-muted mb-1.5 uppercase tracking-wider">密码</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-muted" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  required
                  className="cyber-input w-full pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cyber-muted hover:text-cyber-cyan transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="cyber-btn w-full mt-6 py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-cyber-bg/30 border-t-cyber-bg rounded-full animate-spin" />
                  正在认证...
                </span>
              ) : (
                "进入系统"
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center z-10">
        <p className="text-cyber-muted font-mono text-xs">BlueNet v1.0.0 — 仅限授权使用</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <AlertTriangle size={12} className="text-yellow-500" />
          <p className="text-yellow-500/70 font-mono text-xs">未经授权访问被禁止，违规者可能被追责</p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
