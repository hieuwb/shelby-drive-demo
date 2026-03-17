"use client"

import { useState, useEffect } from "react"
import { useWallet, InputTransactionData } from "@aptos-labs/wallet-adapter-react"
import { Search, Download, Share2, Trash2, File, Folder, ImageIcon, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { useDownloadFile } from "@/hooks/useDownloadFile"
import { getAptosClient } from "@/lib/shelby-client"
import { MODULE_ADDRESS } from "@/abi/config"

function hexOrBytesToString(value: any): string {
  if (!value) return ""

  if (typeof value === "string") {
    const hex = value.startsWith("0x") ? value.slice(2) : value
    const bytes: number[] = []
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(Number.parseInt(hex.slice(i, i + 2), 16))
    }
    return new TextDecoder().decode(new Uint8Array(bytes))
  }

  if (Array.isArray(value)) {
    return new TextDecoder().decode(new Uint8Array(value))
  }

  return String(value)
}

interface FileItem {
  id: number
  display_name: string
  contract_name: string
  contract_blob_id: string
  size: number
  mime_type: string
  is_starred: boolean
  is_deleted: boolean
  folder_id: number
  created_at: number
  modified_at: number
}

interface FileExplorerProps {
  walletAddress: string | null
  currentView?: string
  refreshTrigger?: number
}

export default function FileExplorer({ walletAddress, currentView = "my-drive", refreshTrigger = 0 }: FileExplorerProps) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [hoveredFileId, setHoveredFileId] = useState<number | null>(null)
  const { signAndSubmitTransaction } = useWallet()
  const { downloadFile, isDownloading } = useDownloadFile()

  useEffect(() => {
    if (walletAddress) {
      void fetchFiles()
    }
  }, [walletAddress, currentView, refreshTrigger])

  const fetchFiles = async () => {
    if (!walletAddress) return

    setLoading(true)
    setLoadError(null)

    try {
      const driveResource = (await getAptosClient().getAccountResource({
        accountAddress: walletAddress,
        resourceType: `${MODULE_ADDRESS}::drive::Drive`,
      })) as any

      const driveState = driveResource?.data ?? driveResource
      const filesData = Array.isArray(driveState?.files) ? driveState.files : []

      const allFiles: FileItem[] = filesData.map((file: any) => {
        const contractName = hexOrBytesToString(file.name)
        const contractBlobId = hexOrBytesToString(file.shelby_blob_name ?? file.blob_id)
        const mimeType = hexOrBytesToString(file.mime_type ?? file.extension)

        return {
          id: Number(file.id),
          display_name: contractName || "Untitled",
          contract_name: contractName,
          contract_blob_id: contractBlobId,
          size: Number(file.size),
          mime_type: mimeType || "application/octet-stream",
          is_starred: Boolean(file.is_starred),
          is_deleted: Boolean(file.is_deleted),
          folder_id: Number(file.folder_id ?? 0),
          created_at: Number(file.created_at),
          modified_at: Number(file.modified_at ?? file.created_at),
        }
      })

      setFiles(allFiles)
    } catch (error: any) {
      if (error?.status === 404 || String(error?.message || "").includes("not found")) {
        setFiles([])
        setLoadError(null)
      } else {
        console.error("Error fetching files:", error)
        setFiles([])
        setLoadError(error?.message || "Failed to load files from blockchain.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (file: FileItem) => {
    try {
      await downloadFile(file.contract_blob_id, file.display_name, file.contract_name)
    } catch (error: any) {
      console.error("Download error:", error)
      let errorMsg = "Download failed."
      if (error?.message?.includes("404")) {
        errorMsg = "File not found on Shelby network."
      } else if (error?.message) {
        errorMsg = error.message
      }
      alert(errorMsg)
    }
  }

  const handleShare = async (file: FileItem) => {
    const shareUrl = `${window.location.origin}/shared/${walletAddress}/${file.id}`
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl)
        alert(`Link copied.\n${shareUrl}`)
      } else {
        prompt("Copy this link:", shareUrl)
      }
    } catch (error) {
      console.error("Share error:", error)
      prompt("Copy this link:", shareUrl)
    }
  }

  const handleDelete = async (file: FileItem) => {
    if (!walletAddress) {
      alert("Please connect wallet.")
      return
    }
    if (!signAndSubmitTransaction) {
      alert("Connected wallet does not support transaction signing.")
      return
    }

    const confirmed = confirm(`Are you sure you want to delete file "${file.display_name}"?`)
    if (!confirmed) return

    try {
      const tx: InputTransactionData = {
        data: {
          function: `${MODULE_ADDRESS}::drive::delete_file`,
          typeArguments: [],
          functionArguments: [file.id],
        },
      }

      const response = await signAndSubmitTransaction(tx)
      await getAptosClient().waitForTransaction({ transactionHash: response.hash })
      alert("File deleted successfully.")
      await fetchFiles()
    } catch (error: any) {
      console.error("Delete error:", error)
      alert(`Failed to delete file: ${error?.message || "Unknown error"}`)
    }
  }

  const filesForView = files.filter((file) => {
    if (currentView === "trash") return file.is_deleted
    if (currentView === "starred") return !file.is_deleted && file.is_starred
    return !file.is_deleted
  })

  const filteredFiles = filesForView.filter((file) =>
    file.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  const formatDate = (timestamp: number) => new Date(timestamp * 1000).toLocaleDateString()

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <ImageIcon className="w-8 h-8 text-blue-500" />
    if (mimeType.includes("pdf")) return <FileText className="w-8 h-8 text-red-500" />
    return <File className="w-8 h-8 text-indigo-500" />
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background p-6">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-foreground">
          {currentView === "my-drive"
            ? "My Drive"
            : currentView === "recent"
            ? "Recent"
            : currentView === "starred"
            ? "Starred"
            : currentView === "trash"
            ? "Trash"
            : "Shared with me"}
        </h2>
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search in drive..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Folder className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg">Unable to load files</p>
            <p className="text-sm mt-2 text-center max-w-lg">{loadError}</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Folder className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg">No files found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 XL:grid-cols-4 gap-6">
            {filteredFiles.map((file) => (
              <motion.div
                key={file.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative bg-card border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-300"
                onMouseEnter={() => setHoveredFileId(file.id)}
                onMouseLeave={() => setHoveredFileId(null)}
              >
                <div className="aspect-video bg-secondary/30 rounded-lg flex items-center justify-center mb-4 overflow-hidden relative">
                  {getFileIcon(file.mime_type)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground truncate pr-2" title={file.display_name}>
                      {file.display_name}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                        onClick={() => handleDownload(file)}
                        disabled={isDownloading}
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                        onClick={() => handleShare(file)}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                        onClick={() => handleDelete(file)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatSize(file.size)}</span>
                    <span>{formatDate(file.created_at)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
