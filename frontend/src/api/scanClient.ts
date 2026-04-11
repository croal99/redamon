import axios from "axios"
import { useAuthStore } from "../store/auth.store"

const scanClient = axios.create({
  baseURL: "/api/scan",
  timeout: 30000,
})

scanClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

scanClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = "/login"
    }
    console.error("Scan API Error:", error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export default scanClient
