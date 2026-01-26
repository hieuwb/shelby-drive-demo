"use client";

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useState, useCallback } from "react";
import { getShelbyClient } from "@/lib/shelby-client";

interface UseDownloadFileReturn {
  downloadFile: (blobName: string, fileName?: string, altBlobName?: string) => Promise<void>;
  isDownloading: boolean;
  error: string | null;
}

/**
 * Hook to download file from Shelby network
 */
export const useDownloadFile = (): UseDownloadFileReturn => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { account } = useWallet();

  const downloadFile = useCallback(
    async (blobName: string, fileName?: string, altBlobName?: string) => {
      if (!account) {
        throw new Error("Wallet not connected");
      }

      setIsDownloading(true);
      setError(null);

      const tryDownload = async (id: string): Promise<boolean> => {
        if (!id || id === "undefined" || id === "") return false;

        try {
          const fullId = id.startsWith("shelby://") ? id : `shelby://${account.address}/${id}`;
          console.log("📥 Attempting download with ID:", fullId);
          console.log("📥 BaseURL:", getShelbyClient().baseUrl);

          const blob = await getShelbyClient().download({
            account: account.address,
            blobName: fullId,
          });

          await processDownload(blob, fileName || id);
          return true;
        } catch (err) {
          console.warn(`⚠️ Download trial failed for ${id}:`, err);
          return false;
        }
      };

      const processDownload = async (blob: any, name: string) => {
        const reader = blob.readable.getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const fileData = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          fileData.set(chunk, offset);
          offset += chunk.length;
        }
        const fileBlob = new Blob([fileData]);
        const url = URL.createObjectURL(fileBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name || "download";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };

      try {
        console.log("📥 ===== DOWNLOAD SYSTEM START =====");

        // Trial 1: Principal blob_id
        let success = await tryDownload(blobName);

        // Trial 2: Alternative name (if swapped)
        if (!success && altBlobName) {
          console.log("🔄 Trial 1 failed, trying alternative ID...");
          success = await tryDownload(altBlobName);
        }

        if (!success) {
          throw new Error("Failed to download blob using all known IDs. The file might be expired or the identifier is incorrect.");
        }

        console.log("✅ Downloaded successfully");
      } catch (err: any) {
        const errorMessage = err instanceof Error ? err.message : "Download failed";
        console.error("❌ Final Download Error:", errorMessage);
        setError(errorMessage);
        throw err;
      } finally {
        setIsDownloading(false);
      }
    },
    [account]
  );

  return {
    downloadFile,
    isDownloading,
    error,
  };
};
