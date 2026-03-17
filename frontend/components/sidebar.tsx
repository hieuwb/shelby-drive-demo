"use client"

import React from "react"
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { Upload, HardDrive, Share2, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { useUploadFile } from "@/hooks/useUploadFile"

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  onNavigationChange?: (view: string) => void
  onUploadSuccess?: () => void
}

function mapUploadError(error: any): string {
  const primary = String(error?.message || "Unknown error")
  const secondary = String(error?.data?.message || "")
  const normalized = `${primary} ${secondary}`.toUpperCase()

  if (normalized.includes("TRANSACTION_EXPIRED")) {
    return "Transaction expired before execution. Please sync device time and retry."
  }
  if (normalized.includes("MODULE_NOT_FOUND") || normalized.includes("FUNCTION_NOT_FOUND")) {
    return "Drive contract is unavailable on the current network. Please verify deployment/network config."
  }
  if (normalized.includes("INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE") || normalized.includes("INSUFFICIENT_BALANCE")) {
    return "Insufficient gas fee. Please use Faucet to get more APT."
  }
  if (normalized.includes("ACCOUNT_NOT_FOUND")) {
    return "Account not activated. Please use Faucet to initialize the account."
  }

  return primary
}

export default function Sidebar({ isOpen, onToggle, onNavigationChange, onUploadSuccess }: SidebarProps) {
  const [selectedNav, setSelectedNav] = useState("my-drive")
  const { account } = useWallet()
  const { uploadFile, isUploading } = useUploadFile()
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleNavClick = (nav: string) => {
    setSelectedNav(nav)
    onNavigationChange?.(nav)
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!account?.address) {
      alert("Please connect wallet before uploading.")
      return
    }

    try {
      await uploadFile(file, 0)
      alert(`Upload success: ${file.name}`)
      onUploadSuccess?.()

      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error: any) {
      console.error("Upload failed:", error)
      alert(`Upload failed: ${mapUploadError(error)}`)
    }
  }

  return (
    <>
      <button
        onClick={onToggle}
        className="fixed top-20 left-4 z-40 lg:hidden bg-card p-2 rounded-lg border border-border"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <aside
        className={`${isOpen ? "w-64" : "w-0"
          } bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col overflow-hidden lg:relative fixed lg:w-64 h-[calc(100vh-64px)] z-30`}
      >
        <div className="p-6 space-y-4">
          <Button
            onClick={handleUploadClick}
            disabled={isUploading}
            className="w-full bg-primary hover:bg-blue-700 text-primary-foreground flex items-center justify-center gap-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            {isUploading ? "Uploading..." : "New/Upload"}
          </Button>

          <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" />

          <nav className="space-y-2">
            <NavItem
              icon={<HardDrive className="w-5 h-5" />}
              label="My Drive"
              isSelected={selectedNav === "my-drive"}
              onClick={() => handleNavClick("my-drive")}
            />
            <NavItem
              icon={<Share2 className="w-5 h-5" />}
              label="Shared with me"
              isSelected={selectedNav === "shared"}
              onClick={() => handleNavClick("shared")}
            />
          </nav>
        </div>
      </aside>

      {isOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={onToggle} />}
    </>
  )
}

function NavItem({
  icon,
  label,
  isSelected,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isSelected
        ? "bg-sidebar-primary text-sidebar-primary-foreground"
        : "text-sidebar-foreground hover:bg-sidebar-accent/20"
        }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  )
}
