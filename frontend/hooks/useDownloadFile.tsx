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
 * Hook to download file from Shelby network with robust trial system
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

      // Clean address string
      const addrStr = account.address.toString();

      const tryDownload = async (id: string, useFullPrefix: boolean): Promise<boolean> => {
        if (!id || id === "undefined" || id === "") return false;

        try {
          // Robust path construction
          // Standard is bare ID, but some SDK versions or manual trials might want shelby://account/ prefix
          const targetId = useFullPrefix && !id.startsWith("shelby://")
            ? `shelby://${addrStr}/${id}`
            : id;

          console.log(`📥 Downloading ${targetId}...`);

          const blob = await getShelbyClient().download({
            account: account.address,
            blobName: targetId,
          });

          console.log("✅ Download trial success!");
          await processDownload(blob, fileName || id);
          return true;
        } catch (err: any) {
          console.warn(`⚠️ Trial failed for ${id} (prefix=${useFullPrefix}):`, err.message);
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
        console.log("📥 ===== ROBUST DOWNLOAD SYSTEM START =====");

        // Trial 1: Raw contract blob_id (Standard for new version)
        console.log("🔍 Trial 1: Raw blob_id...");
        let success = await tryDownload(blobName, false);

        // Trial 2: Full prefixed blob_id (Just in case)
        if (!success) {
          console.log("🔄 Trial 2: Prefixed blob_id...");
          success = await tryDownload(blobName, true);
        }

        // Trial 3: Raw contract name (Recovery for swapped fields)
        if (!success && altBlobName && altBlobName !== blobName) {
          console.log("🔄 Trial 3: Raw alternative name...");
          success = await tryDownload(altBlobName, false);
        }

        // Trial 4: Full prefixed alternative name
        if (!success && altBlobName && altBlobName !== blobName) {
          console.log("🔄 Trial 4: Prefixed alternative name...");
          success = await tryDownload(altBlobName, true);
        }

        if (!success) {
          throw new Error("Failed to download blob using all variations. The file may have expired or was uploaded with an incompatible identifier.");
        }

        console.log("✅ Download complete!");
      } catch (err: any) {
        const errorMessage = err instanceof Error ? err.message : "Download failed";
        console.error("❌ Final Exhaustive Download Error:", errorMessage);
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
