'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type AuthUser = {
  id: string
  username: string
  email?: string | null
  role: 'admin' | 'operator'
  is_active: boolean
  last_login?: string | null
  created_at: string
}

export type AuthTokenResponse = {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: AuthUser
}

type AuthContextValue = {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  setFromLogin: (payload: AuthTokenResponse) => void
  logoutLocal: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_ACCESS = 'redamon-auth-access-token'
const STORAGE_REFRESH = 'redamon-auth-refresh-token'
const STORAGE_USER = 'redamon-auth-user'

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const savedAccess = localStorage.getItem(STORAGE_ACCESS)
    const savedRefresh = localStorage.getItem(STORAGE_REFRESH)
    const savedUser = safeJsonParse<AuthUser>(localStorage.getItem(STORAGE_USER))

    setAccessToken(savedAccess)
    setRefreshToken(savedRefresh)
    setUser(savedUser)
    setIsLoading(false)
  }, [])

  const setFromLogin = useCallback((payload: AuthTokenResponse) => {
    setAccessToken(payload.access_token)
    setRefreshToken(payload.refresh_token)
    setUser(payload.user)

    localStorage.setItem(STORAGE_ACCESS, payload.access_token)
    localStorage.setItem(STORAGE_REFRESH, payload.refresh_token)
    localStorage.setItem(STORAGE_USER, JSON.stringify(payload.user))
  }, [])

  const logoutLocal = useCallback(() => {
    setAccessToken(null)
    setRefreshToken(null)
    setUser(null)
    localStorage.removeItem(STORAGE_ACCESS)
    localStorage.removeItem(STORAGE_REFRESH)
    localStorage.removeItem(STORAGE_USER)
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      accessToken,
      refreshToken,
      isAuthenticated: !!accessToken,
      isLoading,
      setFromLogin,
      logoutLocal,
    }
  }, [user, accessToken, refreshToken, isLoading, setFromLogin, logoutLocal])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

