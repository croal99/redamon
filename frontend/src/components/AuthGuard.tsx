import React, { useEffect } from "react"
import { Navigate } from "react-router-dom"
import { useAuthStore } from "../store/auth.store"

interface Props {
  children: React.ReactNode
}

const AuthGuard: React.FC<Props> = ({ children }) => {
  const token = useAuthStore((s) => s.token)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  if (!isAuthenticated) return <Navigate to="/login" replace />

  useEffect(() => {
    if (!token) return
    if (typeof document === "undefined") return
    if (document.cookie.includes("bluenet_token=")) return
    document.cookie = `bluenet_token=${encodeURIComponent(token)}; Path=/; SameSite=Lax; Max-Age=86400`
  }, [token])

  return <>{children}</>
}

export default AuthGuard
