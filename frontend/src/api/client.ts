import axios from "axios"
import { useAuthStore } from "../store/auth.store"

const apiClient = axios.create({
  baseURL: "/api",
  timeout: 30000,
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = "/login"
    }
    console.error("API Error:", error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export default apiClient
