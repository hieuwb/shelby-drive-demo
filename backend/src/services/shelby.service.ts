import { Account, Ed25519PrivateKey, Network, AccountAddress } from "@aptos-labs/ts-sdk";
import { ShelbyNodeClient } from "@shelby-protocol/sdk/node";

const SHELBY_API_KEY = process.env.SHELBY_API_KEY;
const SHELBY_ACCOUNT_PRIVATE_KEY = process.env.SHELBY_ACCOUNT_PRIVATE_KEY;

if (!SHELBY_API_KEY) {
  throw new Error("SHELBY_API_KEY not set in environment");
}

if (!SHELBY_ACCOUNT_PRIVATE_KEY) {
  throw new Error("SHELBY_ACCOUNT_PRIVATE_KEY not set in environment");
}

// Initialize Shelby client for Shelbynet
const client = new ShelbyNodeClient({
  network: Network.SHELBYNET,
  apiKey: SHELBY_API_KEY,
});

// Create signer account
const signer = Account.fromPrivateKey({
  privateKey: new Ed25519PrivateKey(SHELBY_ACCOUNT_PRIVATE_KEY),
});

export interface UploadToShelbyParams {
  fileBuffer: Buffer;
  fileName: string;
  accountAddress: string;
}

export interface DownloadFromShelbyParams {
  blobName: string;
  accountAddress: string;
}

/**
 * Upload file to Shelby network
 * Returns the blob name that can be stored on-chain
 */
export async function uploadToShelby(params: UploadToShelbyParams): Promise<string> {
  const { fileBuffer, fileName, accountAddress } = params;

  // Create blob name: account/filename
  const blobName = `${accountAddress}/${fileName}`;

  // Upload to Shelby (30 days expiration)
  const expirationMicros = Date.now() * 1000 + (30 * 24 * 60 * 60 * 1_000_000);

  await client.upload({
    blobData: fileBuffer,
    signer,
    blobName,
    expirationMicros,
  });

  console.log(`✅ Uploaded ${blobName} to Shelby network`);
  return blobName;
}

/**
 * Download file from Shelby network
 */
export async function downloadFromShelby(params: DownloadFromShelbyParams): Promise<Buffer> {
  const { blobName, accountAddress } = params;

  const blob = await client.download({
    account: AccountAddress.fromString(accountAddress),
    blobName,
  });

  // Convert readable stream to buffer
  const chunks: Uint8Array[] = [];
  const reader = blob.readable.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), totalLength);

  console.log(`✅ Downloaded ${blobName} from Shelby network`);
  return buffer;
}

/**
 * List blobs for an account
 */
export async function listAccountBlobs(accountAddress: string) {
  const blobs = await client.coordination.getAccountBlobs({
    account: AccountAddress.fromString(accountAddress),
  });

  return blobs;
}

export default {
  uploadToShelby,
  downloadFromShelby,
  listAccountBlobs,
};
