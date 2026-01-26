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
        console.log(`🔑 Account: ${account.address}`);

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
        const fullBlobName = `shelby://${account.address}/${shortBlobName}`;

        // 3. Register blob on blockchain using FULL NAME
        const payload = ShelbyBlobClient.createRegisterBlobPayload({
          account: account.address,
          blobName: fullBlobName,
          blobMerkleRoot: commitments.blob_merkle_root,
          numChunksets: expectedTotalChunksets(commitments.raw_data_size),
          expirationMicros: (Date.now() + 30 * 24 * 60 * 60 * 1000) * 1000, // 30 days
          blobSize: commitments.raw_data_size,
        });

        console.log("⚙ Submitting blockchain transaction for:", fullBlobName);
        const txResult = await signAndSubmitTransaction({ data: payload });
        console.log("✓ Transaction submitted:", txResult.hash);

        // Wait for transaction confirmation
        await getShelbyClient().aptos.waitForTransaction({
          transactionHash: txResult.hash,
        });
        console.log("✓ Transaction confirmed");

        // 4. Upload to Shelby RPC using FULL NAME
        console.log("⚙ Uploading to Shelby network...");
        await getShelbyClient().rpc.putBlob({
          account: account.address,
          blobName: fullBlobName,
          blobData: new Uint8Array(fileBuffer),
        });

        console.log("✓ Uploaded to Shelby:", fullBlobName);

        // 5. Add file record to drive contract using SHORT NAME
        // Old contract signature: add_file(signer, folder_id: u64, blob_id: vector<u8>, name: vector<u8>, size: u64, extension: vector<u8>, is_encrypted: bool)
        console.log("⚙ Adding file record to drive...");

        const extMatch = file.name.match(/\.([^.]+)$/);
        const extension = extMatch ? extMatch[1] : "";

        const addFileTransaction: InputTransactionData = {
          data: {
            function: `${MODULE_ADDR}::drive::add_file`,
            typeArguments: [],
            functionArguments: [
              0, // 1. folder_id - root folder
              Array.from(new TextEncoder().encode(file.name)),     // 2. name - display name
              Array.from(new TextEncoder().encode(fullBlobName)),  // 3. blob_id - full URI for storage
              file.size,                                         // 4. size
              Array.from(new TextEncoder().encode(extension)),     // 5. extension
              false,                                             // 6. is_encrypted
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
