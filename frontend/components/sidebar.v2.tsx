"use client"

import React, { useState, useRef } from "react"
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import {
  Upload,
  HardDrive,
  Share2,
  Trash2,
  Star,
  Clock,
  Menu,
  X,
  FolderPlus,
  HardDriveUpload
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  onNavigationChange?: (view: string) => void
  storageUsed?: number
  storageLimit?: number
}

export default function Sidebar({
  isOpen,
  onToggle,
  onNavigationChange,
  storageUsed = 0,
  storageLimit = 32212254720 // 30GB default
}: SidebarProps) {
  const [selectedNav, setSelectedNav] = useState("my-drive")
  const [uploading, setUploading] = useState(false)
  const wallet = useWallet()
  const { signAndSubmitTransaction, account } = wallet
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleNavClick = (nav: string) => {
    setSelectedNav(nav)
    if (onNavigationChange) {
      onNavigationChange(nav)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!account?.address) {
      alert("Please connect wallet before uploading!")
      return
    }

    setUploading(true)

    try {
      const { uploadFile, buildAddFileTransaction } = await import("@/lib/api.v2")

      console.log("=== START UPLOAD ===")
      console.log("File:", file.name, file.size)

      const uploadResult = await uploadFile(file)
      console.log("✓ Upload success:", uploadResult)

      const extension = file.name.split(".").pop() || ""
      const mimeType = file.type || "application/octet-stream"

      const txPayload = await buildAddFileTransaction({
        folderId: 0, // Root folder
        name: file.name,
        blobId: uploadResult.blobId,
        size: uploadResult.size,
        extension,
        mimeType,
        isEncrypted: false,
      })

      if (!signAndSubmitTransaction) {
        throw new Error("Wallet not ready")
      }

      const txResponse = await signAndSubmitTransaction({
        sender: String(account.address),
        data: txPayload.payload
      })

      console.log("✅ Transaction success:", txResponse)
      alert(`File "${file.name}" uploaded successfully!`)

      // Trigger refresh
      if (onNavigationChange) {
        onNavigationChange(selectedNav)
      }
    } catch (error: any) {
      console.error("❌ Lỗi upload:", error)

      if (error.message?.includes("rejected")) {
        alert("You rejected the transaction. Upload cancelled.")
      } else {
        alert(`Error: ${error.message || "Upload failed"}`)
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const navItems = [
    { id: "my-drive", icon: HardDrive, label: "My Drive", active: true },
    { id: "shared", icon: Share2, label: "Shared with me", active: true },
    { id: "recent", icon: Clock, label: "Recent", active: true },
    { id: "starred", icon: Star, label: "Starred", active: true },
    { id: "trash", icon: Trash2, label: "Trash", active: true },
  ]

  const usagePercent = storageLimit > 0 ? (storageUsed / storageLimit) * 100 : 0
  const usageGB = (storageUsed / (1024 * 1024 * 1024)).toFixed(2)
  const limitGB = (storageLimit / (1024 * 1024 * 1024)).toFixed(0)

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen bg-card border-r border-border
          w-64 z-40 transition-transform duration-300 flex flex-col
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Mobile close button */}
        <div className="lg:hidden flex items-center justify-between px-4 py-4 border-b border-border">
          <span className="font-semibold">Menu</span>
          <Button onClick={onToggle} variant="ghost" size="sm">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Upload button */}
        <div className="p-4">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            disabled={uploading}
          />
          <Button
            onClick={handleUploadClick}
            disabled={uploading || !account?.address}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isSelected = selectedNav === item.id

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                disabled={!item.active}
                className={`
                  w-full flex items-center gap-3 px-4 py-2.5 rounded-lg
                  transition-colors text-left
                  ${isSelected
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  }
                  ${!item.active && "opacity-50 cursor-not-allowed"}
                `}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Storage indicator */}
        <div className="p-4 border-t border-border">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <HardDriveUpload className="w-4 h-4" />
              <span>Storage</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${usagePercent > 90 ? "bg-red-500" :
                    usagePercent > 70 ? "bg-yellow-500" :
                      "bg-primary"
                  }`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {usageGB} GB of {limitGB} GB used
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
