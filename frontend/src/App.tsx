import React, { useEffect } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import AuthGuard from "./components/AuthGuard"
import AppLayout from "./components/Layout/AppLayout"
import { authApi } from "./api/auth"
import LoginPage from "./pages/Login"
import HomePage from "./pages/Home"
import SettingsPage from "./pages/Settings"
import { useAuthStore } from "./store/auth.store"

const DocumentBridge: React.FC = () => {
  useEffect(() => {
    window.location.replace("/document")
  }, [])
  return null
}

const C2Bridge: React.FC = () => {
  useEffect(() => {
    window.location.replace("/c2")
  }, [])
  return null
}

const ScanBridge: React.FC = () => {
  useEffect(() => {
    window.location.replace("/scan")
  }, [])
  return null
}

const LogoutPage: React.FC = () => {
  const logout = useAuthStore((s) => s.logout)
  useEffect(() => {
    authApi
      .logout()
      .catch(() => null)
      .finally(() => {
        logout()
        window.location.replace("/login")
      })
  }, [logout])
  return null
}

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/logout" element={<LogoutPage />} />
      <Route
        element={
          <AuthGuard>
            <AppLayout />
          </AuthGuard>
        }
      >
        <Route index element={<Navigate to="/scan" replace />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/scan" element={<ScanBridge />} />
        <Route path="/c2" element={<C2Bridge />} />
        <Route path="/document" element={<DocumentBridge />} />
        <Route path="/setting" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/scan" replace />} />
    </Routes>
  )
}

export default App
