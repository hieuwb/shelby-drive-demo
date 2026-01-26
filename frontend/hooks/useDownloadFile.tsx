"use client";

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useState, useCallback } from "react";
import { getShelbyClient } from "@/lib/shelby-client";

interface UseDownloadFileReturn {
  downloadFile: (blobName: string, fileName?: string) => Promise<void>;
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
    async (blobName: string, fileName?: string) => {
      if (!account) {
        throw new Error("Wallet not connected");
      }

      setIsDownloading(true);
      setError(null);

      try {
        console.log("📥 ===== DOWNLOAD DEBUG =====");
        console.log("📥 Input blob name from contract:", blobName);
        console.log("📥 Account address:", account.address);
        console.log("📥 Target file name:", fileName || blobName);

        // Construct full blob name: shelby://account/blobname
        // The contract stores short name (e.g., "1768975407551-file.png")
        // But SDK upload/download needs full name (e.g., "shelby://0x.../1768975407551-file.png")
        const fullBlobName = `shelby://${account.address}/${blobName}`;
        console.log("📥 Constructed full blob name:", fullBlobName);

        // Download from Shelby using full blob name
        const blob = await getShelbyClient().download({
          account: account.address,
          blobName: fullBlobName,
        });

        console.log("✅ Download API call successful");

        // Convert readable stream to blob
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

        // Create download link
        const fileBlob = new Blob([fileData]);
        const url = URL.createObjectURL(fileBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName || blobName.split("/").pop() || "download";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log("✅ Downloaded successfully");
      } catch (err: any) {
        const errorMessage = err instanceof Error ? err.message : "Download failed";
        console.error("❌ Download error:", errorMessage);
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
