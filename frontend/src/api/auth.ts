import apiClient from "./client"

export interface LoginRequest {
  username: string
  password: string
}

export interface User {
  id: string
  username: string
  email?: string
  role: "admin" | "operator"
  is_active: boolean
  last_login?: string
  created_at: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: User
}

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<TokenResponse>("/auth/login", data).then((r) => r.data),

  logout: () => apiClient.post("/auth/logout"),

  refresh: (refresh_token: string) =>
    apiClient.post<TokenResponse>("/auth/refresh", { refresh_token }).then((r) => r.data),

  getMe: () => apiClient.get<User>("/auth/users/me").then((r) => r.data),
}

export const userApi = {
  list: () => apiClient.get<User[]>("/auth/users").then((r) => r.data),
  create: (data: { username: string; password: string; role: string; email?: string }) =>
    apiClient.post<User>("/auth/users", data).then((r) => r.data),
  update: (id: string, data: Partial<{ email: string; role: string; is_active: boolean; password: string }>) =>
    apiClient.put<User>(`/auth/users/${id}`, data).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/auth/users/${id}`),
}
