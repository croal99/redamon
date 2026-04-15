"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AuthUser = {
  id?: string | null;
  username: string;
  email?: string | null;
  role?: "admin" | "operator" | string | null;
};

export type AuthTokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
  webapp_user_id?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setFromLogin: (payload: AuthTokenResponse) => void;
  logoutLocal: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthMeResponse = {
  authenticated: boolean;
  user?: AuthUser | null;
};

function parseAuthMeResponse(value: unknown): AuthMeResponse | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.authenticated !== "boolean") return null;
  return {
    authenticated: record.authenticated,
    user: (record.user as AuthUser | null | undefined) ?? null,
  };
}

/** AuthProvider：以 HttpOnly Cookie（bluenet_token）为准，向前端提供“是否已登录/当前用户”状态。 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        return parseAuthMeResponse(await res.json().catch(() => null));
      })
      .then((data) => {
        setIsAuthenticated(!!data?.authenticated);
        setUser(data?.user ?? null);
      })
      .catch(() => {
        setIsAuthenticated(false);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  /** setFromLogin：登录成功后立即更新前端状态；权威会话仍由 Cookie 决定。 */
  const setFromLogin = useCallback((payload: AuthTokenResponse) => {
    setUser(payload.user);
    setIsAuthenticated(true);
  }, []);

  /** logoutLocal：退出时清理前端状态；Cookie 清理由 /api/auth/logout 完成。 */
  const logoutLocal = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      isAuthenticated,
      isLoading,
      setFromLogin,
      logoutLocal,
    };
  }, [
    user,
    isAuthenticated,
    isLoading,
    setFromLogin,
    logoutLocal,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** useAuth：读取 AuthProvider 提供的认证上下文。 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
