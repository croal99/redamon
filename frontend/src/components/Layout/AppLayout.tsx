import React from "react"
import { Outlet } from "react-router-dom"
import SideNav from "./SideNav"
import TopBar from "./TopBar"

const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-cyber-bg">
      <SideNav />
      <TopBar />
      <main className="ml-16 pt-14 min-h-screen">
        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout
