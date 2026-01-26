"use client"

import { useState, useEffect } from "react"
import { useWallet, InputTransactionData } from "@aptos-labs/wallet-adapter-react"
import { Search, Download, Share2, Trash2, File, Folder, ImageIcon, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { useDownloadFile } from "@/hooks/useDownloadFile"
import { getAptosClient } from "@/lib/shelby-client"
import { MODULE_ADDRESS } from "@/abi/config"

// Utility function to convert hex string or byte array to string
function hexOrBytesToString(value: string | number[]): string {
  if (typeof value === 'string') {
    // It's a hex string like "0x7368656c62793a2f2f..."
    const hex = value.startsWith('0x') ? value.slice(2) : value;
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return new TextDecoder().decode(new Uint8Array(bytes));
  } else if (Array.isArray(value)) {
    // It's a byte array
    return new TextDecoder().decode(new Uint8Array(value));
  }
  return String(value);
}

interface FileItem {
  id: number
  name: string
  shelby_blob_name: string
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
  const [hoveredFileId, setHoveredFileId] = useState<number | null>(null)
  const { signAndSubmitTransaction } = useWallet()
  const { downloadFile, isDownloading } = useDownloadFile()

  useEffect(() => {
    if (walletAddress) {
      fetchFiles()
    }
  }, [walletAddress, currentView, refreshTrigger])

  const fetchFiles = async () => {
    if (!walletAddress) return;

    setLoading(true)
    try {
      // Read Drive resource directly
      try {
        const driveResource = await getAptosClient().getAccountResource({
          accountAddress: walletAddress,
          resourceType: `${MODULE_ADDRESS}::drive::Drive`,
        });

        console.log("📊 Drive resource:", driveResource);

        // Extract files from old contract structure: folders[0].files
        const folders = driveResource.folders || [];
        const rootFolder = folders.find((f: any) => {
          const name = hexOrBytesToString(f.name);
          return name === "root";
        }) || folders[0];

        const filesData = rootFolder?.files || [];
        const files = filesData
          .map((file: any, index: number) => {
            const blobId = hexOrBytesToString(file.shelby_blob_name || file.blob_id);
            const fileName = hexOrBytesToString(file.name);
            const ext = file.extension ? hexOrBytesToString(file.extension) : "";
            const isDeleted = file.is_deleted || false;

            return {
              id: index,
              name: fileName,
              shelby_blob_name: blobId,
              size: Number(file.size),
              type: ext || "application/octet-stream",
              modified_at: Number(file.created_at),
              is_starred: false,
              is_deleted: isDeleted,
            };
          })
          .filter((file: FileItem) => {
            // Filter based on currentView
            if (currentView === "trash") {
              return file.is_deleted;
            }
            return !file.is_deleted; // my-drive and shared-with-me show only active files
          });

        console.log("✅ Files from blockchain:", files);
        setFiles(files);
      } catch (resourceError: any) {
        if (resourceError.status === 404 || resourceError.message?.includes("not found")) {
          console.log("⚠️ Drive not initialized, no files");
          setFiles([]);
        } else {
          throw resourceError;
        }
      }
    } catch (error) {
      console.error("Error fetching files:", error);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file: FileItem) => {
    try {
      // The blob name from contract might be in different formats:
      // - Old files: just "filename.ext" (no timestamp)
      // - New files: "timestamp-filename.ext"
      const blobNameFromContract = file.shelby_blob_name;

      console.log("📥 Downloading blob:", blobNameFromContract);
      console.log("📥 Save as:", file.name);

      // Check if this is a legacy file (no timestamp prefix)
      const isLegacyFile = !blobNameFromContract.match(/^\d{13}-/); // 13 digits = millisecond timestamp

      if (isLegacyFile) {
        console.warn("⚠️ Detected legacy file format:", blobNameFromContract);
        alert(
          `⚠️ This file was uploaded with an old version and cannot be downloaded.\n\n` +
          `File: ${file.name}\n\n` +
          `To use this file, please:\n` +
          `1. Re-upload the file\n` +
          `2. Or contact admin to migrate old data`
        );
        return;
      }

      // Try download with the blob name from contract
      await downloadFile(blobNameFromContract, file.name);

    } catch (error: any) {
      console.error("Download error:", error);

      // Provide more specific error messages
      let errorMsg = "Download failed!";
      if (error?.message?.includes("404")) {
        errorMsg = "❌ File does not exist on Shelby network. It may have been deleted or expired.";
      } else if (error?.message?.includes("network")) {
        errorMsg = "❌ Network connection error. Please check your internet connection.";
      } else if (error?.message) {
        errorMsg = `❌ ${error.message}`;
      }

      alert(errorMsg);
    }
  };

  const handleShare = async (file: FileItem) => {
    // Create shareable link
    const shareUrl = `${window.location.origin}/shared/${walletAddress}/${file.id}`;

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        alert(`✅ Link copied!\n${shareUrl}`);
      } else {
        // Fallback
        prompt("Copy this link:", shareUrl);
      }
    } catch (error) {
      console.error("Share error:", error);
      prompt("Copy this link:", shareUrl);
    }
  };

  const handleDelete = async (file: FileItem) => {
    if (!walletAddress) {
      alert("Please connect wallet!");
      return;
    }

    const confirmed = confirm(`Are you sure you want to delete file "${file.name}"?\n\n⚠️ Note: The current contract will delete the file permanently!`);
    if (!confirmed) return;

    try {
      // const MODULE_ADDR = process.env.NEXT_PUBLIC_MODULE_ADDR;

      // Old contract: delete_file_record(signer, folder_id: u64, file_index: u64)
      // Note: old contract doesn't support trash, this deletes permanently
      const deleteTransaction: InputTransactionData = {
        data: {
          function: `${MODULE_ADDRESS}::drive::delete_file_record`,
          typeArguments: [],
          functionArguments: [
            0, // folder_id - root folder
            file.id, // file_index
          ],
        },
      };

      await signAndSubmitTransaction(deleteTransaction);
      alert(`✅ File deleted: ${file.name}`);
      await fetchFiles();
    } catch (error: any) {
      console.error("Delete error:", error);
      alert(`❌ Cannot delete file: ${error.message}`);
    }
  };

  // NOTE: Trash features disabled - old contract doesn't support trash
  // To enable: deploy new contract with move_to_trash, restore_from_trash, delete_file functions
  /*
  const handleRestore = async (file: FileItem) => {
    if (!walletAddress) {
      alert("Vui lòng kết nối ví!");
      return;
    }

    try {
      const MODULE_ADDR = process.env.NEXT_PUBLIC_MODULE_ADDR;
      
      const restoreTransaction: InputTransactionData = {
        data: {
          function: `${MODULE_ADDR}::drive::restore_from_trash`,
          typeArguments: [],
          functionArguments: [
            file.id, // file_id
          ],
        },
      };

      await signAndSubmitTransaction(restoreTransaction);
      alert(`✅ Đã khôi phục: ${file.name}`);
      await fetchFiles();
    } catch (error: any) {
      console.error("Restore error:", error);
      alert(`❌ Không thể khôi phục: ${error.message}`);
    }
  };

  const handlePermanentDelete = async (file: FileItem) => {
    if (!walletAddress) {
      alert("Vui lòng kết nối ví!");
      return;
    }

    const confirmed = confirm(
      `⚠️ XÓA VĨNH VIỄN file "${file.name}"?\n\nFile sẽ không thể khôi phục!`
    );
    if (!confirmed) return;

    try {
      const MODULE_ADDR = process.env.NEXT_PUBLIC_MODULE_ADDR;
      
      const deleteTransaction: InputTransactionData = {
        data: {
          function: `${MODULE_ADDR}::drive::delete_file`,
          typeArguments: [],
          functionArguments: [
            file.id, // file_id
          ],
        },
      };

      await signAndSubmitTransaction(deleteTransaction);
      alert(`✅ Đã xóa vĩnh viễn: ${file.name}`);
      await fetchFiles();
    } catch (error: any) {
      console.error("Permanent delete error:", error);
      alert(`❌ Không thể xóa: ${error.message}`);
    }
  };
  */

  const filteredFiles = files
    .filter((f) => {
      if (currentView === "my-drive") return !f.is_deleted;
      if (currentView === "trash") return f.is_deleted;
      if (currentView === "shared") return false; // TODO: implement shared logic
      return true;
    })
    .filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const getFileIcon = (file: FileItem) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "svg"].includes(ext || "")) {
      return <ImageIcon className="w-5 h-5 text-blue-500" />;
    } else if (["txt", "md", "json"].includes(ext || "")) {
      return <FileText className="w-5 h-5 text-yellow-500" />;
    } else {
      return <File className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleDateString("vi-VN");
  };

  if (currentView === "shared") {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Share2 className="w-16 h-16 text-muted mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold mb-2">Shared with me</h3>
          <p className="text-muted-foreground">Feature under development</p>
        </div>
      </div>
    );
  }

  if (currentView === "trash") {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Trash2 className="w-16 h-16 text-muted mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold mb-2">Trash</h3>
          <p className="text-muted-foreground">Deleted files will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 overflow-hidden">
      {/* Search Bar - only show for my-drive */}
      {currentView === "my-drive" && (
        <div className="mb-6 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Button
            onClick={handleShare}
            className="bg-accent hover:bg-accent/80 text-white flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Share Drive
          </Button>
        </div>
      )}

      {/* File List */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent mb-4"></div>
              <p className="text-muted-foreground">Loading files...</p>
            </div>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Folder className="w-16 h-16 text-muted mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No files found</p>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-sm">
                <th className="text-left py-3 px-4 font-semibold">Name</th>
                <th className="text-left py-3 px-4 font-semibold">Owner</th>
                <th className="text-left py-3 px-4 font-semibold">Modified</th>
                <th className="text-left py-3 px-4 font-semibold">Size</th>
                <th className="text-right py-3 px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map((file, index) => (
                <motion.tr
                  key={file.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onMouseEnter={() => setHoveredFileId(file.id)}
                  onMouseLeave={() => setHoveredFileId(null)}
                  className="border-b border-border hover:bg-card/50 transition-colors"
                >
                  <td className="py-3 px-4 flex items-center gap-3">
                    {getFileIcon(file)}
                    <span className="font-medium">{file.name}</span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-sm">{walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</td>
                  <td className="py-3 px-4 text-muted-foreground text-sm">{formatDate(file.modified_at)}</td>
                  <td className="py-3 px-4 text-muted-foreground text-sm">{formatFileSize(file.size)}</td>
                  <td className="py-3 px-4">
                    {hoveredFileId === file.id && (
                      <div className="flex justify-end gap-2">
                        {/* Old contract doesn't support trash - only show download, share, delete */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-accent hover:bg-accent/20"
                          onClick={() => handleDownload(file)}
                          title="Download file"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-blue-500 hover:bg-blue-500/20"
                          onClick={() => handleShare(file)}
                          title="Share file"
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/20"
                          onClick={() => handleDelete(file)}
                          title="Delete file permanently"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

