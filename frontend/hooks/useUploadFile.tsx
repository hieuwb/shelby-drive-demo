"use client";

import { useWallet, InputTransactionData } from "@aptos-labs/wallet-adapter-react";
import { useState, useCallback } from "react";
import {
  ClayErasureCodingProvider,
  generateCommitments,
  ShelbyBlobClient,
  expectedTotalChunksets,
} from "@shelby-protocol/sdk/browser";
import { getShelbyClient } from "@/lib/shelby-client";
import { MODULE_ADDRESS as MODULE_ADDR } from "@/abi/config";


interface UseUploadFileReturn {
  uploadFile: (file: File, folderId?: number) => Promise<void>;
  isUploading: boolean;
  error: string | null;
}

/**
 * Hook to upload file to Shelby network
 * Flow:
 * 1. Generate commitments for file
 * 2. Register blob on blockchain
 * 3. Upload actual data to Shelby RPC
 */
export const useUploadFile = (): UseUploadFileReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { account, signAndSubmitTransaction } = useWallet();

  const uploadFile = useCallback(
    async (file: File, folderId: number = 0) => {
      if (!account) {
        throw new Error("Wallet not connected");
      }

      setIsUploading(true);
      setError(null);

      try {
        console.log("=== START FILE UPLOAD ===");
        console.log(`📝 File: ${file.name}, Size: ${file.size} bytes`);
        const address = account.address.toString();
        console.log(`🔑 Account: ${address}`);

        // Check balance first
        try {
          const resources = await getShelbyClient().aptos.getAccountCoinsData({
            accountAddress: account.address,
          });
          console.log("💰 Account coins:", resources);

          const aptCoin = resources.find((coin) =>
            coin.asset_type === "0x1::aptos_coin::AptosCoin"
          );

          if (!aptCoin || Number(aptCoin.amount) < 1000000) { // Less than 0.01 APT
            throw new Error("INSUFFICIENT_BALANCE: Please use Faucet to get test APT");
          }

          console.log(`✓ Balance: ${(Number(aptCoin.amount) / 100_000_000).toFixed(4)} APT`);
        } catch (balanceError: any) {
          if (balanceError.message?.includes("INSUFFICIENT_BALANCE")) {
            throw balanceError;
          }
          console.warn("⚠️ Could not check balance:", balanceError.message);
          // Continue anyway - might be account not found, which faucet will fix
        }

        // 1. Generate commitments
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const provider = await ClayErasureCodingProvider.create();
        const commitments = await generateCommitments(provider, fileBuffer);

        console.log("✓ Generated commitments:", commitments.blob_merkle_root);

        // 2. Create blob name
        // - Short name for storing in contract: timestamp-filename
        // - Full name for Shelby network: shelby://account/timestamp-filename
        const timestamp = Date.now();
        const shortBlobName = `${timestamp}-${file.name}`;
        // Standard: Registration name is just the path/name, account namespace is handled by API
        const blobRegistrationName = shortBlobName;

        // 3. Register blob on blockchain using BARE NAME
        const payload = ShelbyBlobClient.createRegisterBlobPayload({
          account: account.address, // directly from account for correct type
          blobName: blobRegistrationName,
          blobMerkleRoot: commitments.blob_merkle_root,
          numChunksets: expectedTotalChunksets(commitments.raw_data_size),
          expirationMicros: (Date.now() + 30 * 24 * 60 * 60 * 1000) * 1000, // 30 days
          blobSize: commitments.raw_data_size,
        });

        console.log("⚙ Submitting blockchain transaction for:", blobRegistrationName);
        const txResult = await signAndSubmitTransaction({ data: payload });
        console.log("✓ Transaction submitted:", txResult.hash);

        // Wait for transaction confirmation
        await getShelbyClient().aptos.waitForTransaction({
          transactionHash: txResult.hash,
        });
        console.log("✓ Transaction confirmed");

        // 4. Upload to Shelby RPC using BARE NAME
        console.log("⚙ Uploading to Shelby network...");
        await getShelbyClient().rpc.putBlob({
          account: account.address,
          blobName: blobRegistrationName,
          blobData: new Uint8Array(fileBuffer),
        });

        console.log("✓ Uploaded to Shelby:", blobRegistrationName);

        // 5. Add file record to drive contract using SHORT NAME
        // Current contract signature: add_file(signer, shelby_blob_name, name, size, mime_type, folder_id)
        console.log("⚙ Adding file record to drive...");

        const addFileTransaction: InputTransactionData = {
          data: {
            function: `${MODULE_ADDR}::drive::add_file`,
            typeArguments: [],
            functionArguments: [
              Array.from(new TextEncoder().encode(blobRegistrationName)),
              Array.from(new TextEncoder().encode(file.name)),
              file.size,
              Array.from(new TextEncoder().encode(file.type || "application/octet-stream")),
              folderId,
            ],
          },
        };

        const addFileResult = await signAndSubmitTransaction(addFileTransaction);
        console.log("✅ File record added:", addFileResult.hash);

        // Wait for transaction confirmation
        await getShelbyClient().aptos.waitForTransaction({
          transactionHash: addFileResult.hash,
        });
        console.log("✅ Upload complete!");

      } catch (err: any) {
        console.error("❌ Upload error details:", err);
        const errorMessage = err?.message || err?.toString() || "Upload failed";
        console.error("❌ Error message:", errorMessage);

        // Log specific error details
        if (err?.response) {
          console.error("❌ Response error:", err.response);
        }
        if (err?.code) {
          console.error("❌ Error code:", err.code);
        }

        setError(errorMessage);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [account, signAndSubmitTransaction]
  );

  return {
    uploadFile,
    isUploading,
    error,
  };
};
