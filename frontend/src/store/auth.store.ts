import { create } from "zustand"
import { persist } from "zustand/middleware"
import { User } from "../api/auth"

interface AuthState {
  token: string | null
  refreshToken: string | null
  user: User | null
  login: (token: string, refreshToken: string, user: User) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      login: (token, refreshToken, user) => {
        localStorage.setItem("bluenet_token", token)
        if (typeof document !== "undefined") {
          document.cookie = `bluenet_token=${encodeURIComponent(token)}; Path=/; SameSite=Lax; Max-Age=86400`
        }
        set({ token, refreshToken, user })
      },
      logout: () => {
        localStorage.removeItem("bluenet_token")
        if (typeof document !== "undefined") {
          document.cookie = "bluenet_token=; Path=/; Max-Age=0"
        }
        set({ token: null, refreshToken: null, user: null })
      },
      isAuthenticated: () => !!get().token,
    }),
    { name: "bluenet-auth" }
  )
)
