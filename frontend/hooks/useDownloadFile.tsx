"use client";

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useState, useCallback } from "react";
import { getShelbyClient } from "@/lib/shelby-client";

interface UseDownloadFileReturn {
  downloadFile: (blobName: string, fileName?: string, altBlobName?: string) => Promise<void>;
  isDownloading: boolean;
  error: string | null;
}

function normalizeDownloadError(err: unknown): Error {
  const raw = String((err as any)?.message || err || "Download failed");
  const lower = raw.toLowerCase();

  if (lower.includes("not found") || lower.includes("404")) {
    return new Error("FILE_NOT_FOUND: The requested file was not found on Shelby.");
  }

  if (
    lower.includes("expired") ||
    lower.includes("invalid blob") ||
    lower.includes("incompatible identifier")
  ) {
    return new Error("BLOB_UNAVAILABLE: The blob identifier is invalid or has already expired.");
  }

  return new Error(raw);
}

function buildBlobCandidates(
  address: string,
  primary?: string,
  secondary?: string
): string[] {
  const normalize = (value?: string) => (value || "").trim();
  const maybePrefix = (value: string) =>
    value.startsWith("shelby://") ? value : `shelby://${address}/${value}`;

  const base = [normalize(primary), normalize(secondary)].filter(Boolean);
  const expanded = [...base, ...base.map((item) => maybePrefix(item))];
  return Array.from(new Set(expanded));
}

async function saveBlobToDisk(blob: any, fileName: string): Promise<void> {
  const reader = blob.readable.getReader();
  const chunks: Uint8Array[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
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
  a.download = fileName || "download";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Hook to download file from Shelby network with fallback blob-id candidates.
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

      const accountAddress = account.address.toString();
      const candidates = buildBlobCandidates(accountAddress, blobName, altBlobName);
      let lastError: unknown = null;

      try {
        for (const candidate of candidates) {
          try {
            const blob = await getShelbyClient().download({
              account: account.address,
              blobName: candidate,
            });
            await saveBlobToDisk(blob, fileName || candidate);
            return;
          } catch (attemptError) {
            lastError = attemptError;
          }
        }

        throw lastError || new Error("Failed to download blob using all identifier variations.");
      } catch (err) {
        const normalized = normalizeDownloadError(err);
        setError(normalized.message);
        throw normalized;
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
