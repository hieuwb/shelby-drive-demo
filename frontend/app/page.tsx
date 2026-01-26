"use client"

import { useState } from "react"
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import Header from "@/components/header"
import Sidebar from "@/components/sidebar"
import FileExplorer from "@/components/file-explorer"
import WelcomeScreen from "@/components/welcome-screen"
import { NetworkChecker } from "@/components/network-checker"

export default function DrivePage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [currentView, setCurrentView] = useState("my-drive")
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const { connected, account } = useWallet()
  const walletAddress = account?.address ? String(account.address) : null

  const handleUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  if (!connected) {
    return <WelcomeScreen />
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onNavigationChange={setCurrentView}
        onUploadSuccess={handleUploadSuccess}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="p-4">
          <NetworkChecker />
        </div>
        <FileExplorer
          walletAddress={walletAddress}
          currentView={currentView}
          refreshTrigger={refreshTrigger}
        />
      </div>
    </div>
  )
}
