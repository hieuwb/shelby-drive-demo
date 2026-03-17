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

const MIN_APT_BALANCE_OCTAS = 1_000_000; // 0.01 APT
const EXPIRATION_SECONDS_FROM_NOW = 600;
const REGISTER_BLOB_MAX_GAS = 200_000;
const ADD_FILE_MAX_GAS = 120_000;
const MIN_GAS_UNIT_PRICE = 100;
const MAX_GAS_UNIT_PRICE = 300;

// Plan: cap gas/expiration options for wallet submissions so upload flow avoids false "insufficient gas" failures on testnet.
async function getTransactionOptions(maxGasAmount: number) {
  let gasUnitPrice = MIN_GAS_UNIT_PRICE;
  try {
    const estimation = await getShelbyClient().aptos.getGasPriceEstimation();
    const estimate = Number(estimation?.gas_estimate || MIN_GAS_UNIT_PRICE);
    gasUnitPrice = Math.min(Math.max(estimate, MIN_GAS_UNIT_PRICE), MAX_GAS_UNIT_PRICE);
  } catch (error: any) {
    console.warn("Failed to estimate gas price, using fallback:", error?.message || error);
  }

  return {
    maxGasAmount,
    gasUnitPrice,
    expirationSecondsFromNow: EXPIRATION_SECONDS_FROM_NOW,
  };
}

function normalizeUploadError(err: any): Error {
  const rawMessage = String(err?.message || err?.toString() || "Upload failed");
  const upper = rawMessage.toUpperCase();

  if (upper.includes("TRANSACTION_EXPIRED")) {
    return new Error(
      "TRANSACTION_EXPIRED: Transaction expired before execution. Please sync device time and retry."
    );
  }

  if (upper.includes("MODULE_NOT_FOUND") || upper.includes("FUNCTION_NOT_FOUND")) {
    return new Error(
      "MODULE_NOT_FOUND: Drive contract is not available on the active network. Verify module deployment/network config."
    );
  }

  return new Error(rawMessage);
}

/**
 * Hook to upload file to Shelby network
 * Flow:
 * 1. Generate commitments for file
 * 2. Register blob on-chain
 * 3. Upload data to Shelby RPC
 * 4. Write metadata to Drive module
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
        const address = account.address.toString();
        console.log("Starting upload:", { file: file.name, size: file.size, address });

        try {
          const resources = await getShelbyClient().aptos.getAccountCoinsData({
            accountAddress: account.address,
          });

          const aptCoin = resources.find((coin) => coin.asset_type === "0x1::aptos_coin::AptosCoin");
          if (!aptCoin || Number(aptCoin.amount) < MIN_APT_BALANCE_OCTAS) {
            throw new Error("INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE");
          }
        } catch (balanceError: any) {
          if (String(balanceError?.message || "").includes("INSUFFICIENT_BALANCE")) {
            throw balanceError;
          }
          console.warn("Balance pre-check failed, continuing:", balanceError?.message || balanceError);
        }

        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const provider = await ClayErasureCodingProvider.create();
        const commitments = await generateCommitments(provider, fileBuffer);

        const blobRegistrationName = `${Date.now()}-${file.name}`;

        const registerPayload = ShelbyBlobClient.createRegisterBlobPayload({
          account: account.address,
          blobName: blobRegistrationName,
          blobMerkleRoot: commitments.blob_merkle_root,
          numChunksets: expectedTotalChunksets(commitments.raw_data_size),
          expirationMicros: (Date.now() + 30 * 24 * 60 * 60 * 1000) * 1000,
          blobSize: commitments.raw_data_size,
        });

        const registerBlobTx = await signAndSubmitTransaction({
          data: registerPayload,
          options: await getTransactionOptions(REGISTER_BLOB_MAX_GAS),
        });
        await getShelbyClient().aptos.waitForTransaction({
          transactionHash: registerBlobTx.hash,
        });

        await getShelbyClient().rpc.putBlob({
          account: account.address,
          blobName: blobRegistrationName,
          blobData: new Uint8Array(fileBuffer),
        });

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
          options: await getTransactionOptions(ADD_FILE_MAX_GAS),
        };

        const addFileTx = await signAndSubmitTransaction(addFileTransaction);
        await getShelbyClient().aptos.waitForTransaction({
          transactionHash: addFileTx.hash,
        });
      } catch (err: any) {
        const normalized = normalizeUploadError(err);
        console.error("Upload failed:", normalized.message, err);
        setError(normalized.message);
        throw normalized;
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
