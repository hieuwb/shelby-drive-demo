import { Account, Ed25519PrivateKey, Network } from "@aptos-labs/ts-sdk";

const SHELBY_API_KEY = process.env.SHELBY_API_KEY;
const SHELBY_ACCOUNT_PRIVATE_KEY = process.env.SHELBY_ACCOUNT_PRIVATE_KEY;
const SHELBY_NETWORK_RAW = (process.env.SHELBY_NETWORK || "shelbynet").toLowerCase();

if (!SHELBY_API_KEY) {
  throw new Error("SHELBY_API_KEY not set in environment");
}

if (!SHELBY_ACCOUNT_PRIVATE_KEY) {
  throw new Error("SHELBY_ACCOUNT_PRIVATE_KEY not set in environment");
}

// Plan: load ESM-only Shelby SDK lazily and keep network selection env-driven for Shelby stage transitions.
const resolveNetwork = (name: string): Network => {
  switch (name) {
    case "mainnet":
      return Network.MAINNET;
    case "testnet":
      return Network.TESTNET;
    case "devnet":
      return Network.DEVNET;
    case "shelbynet":
      return Network.SHELBYNET;
    default:
      return Network.SHELBYNET;
  }
};

const SHELBY_NETWORK = resolveNetwork(SHELBY_NETWORK_RAW);

let cachedClient: any | null = null;

async function getShelbyClient(): Promise<any> {
  if (cachedClient) return cachedClient;

  const sdk = await import("@shelby-protocol/sdk/dist/node/index.mjs");
  const ShelbyNodeClient = (sdk as any).ShelbyNodeClient;

  cachedClient = new ShelbyNodeClient({
    network: SHELBY_NETWORK,
    apiKey: SHELBY_API_KEY,
  });

  return cachedClient;
}

const signer: any = Account.fromPrivateKey({
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
  const client = await getShelbyClient();

  const blobName = `${accountAddress}/${fileName}`;
  const expirationMicros = Date.now() * 1000 + (30 * 24 * 60 * 60 * 1_000_000);

  await client.upload({
    blobData: fileBuffer,
    signer,
    blobName,
    expirationMicros,
  });

  console.log(`Uploaded ${blobName} to Shelby network`);
  return blobName;
}

/**
 * Download file from Shelby network
 */
export async function downloadFromShelby(params: DownloadFromShelbyParams): Promise<Buffer> {
  const { blobName, accountAddress } = params;
  const client = await getShelbyClient();

  const blob = await client.download({
    account: accountAddress,
    blobName,
  });

  const chunks: Uint8Array[] = [];
  const reader = blob.readable.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), totalLength);

  console.log(`Downloaded ${blobName} from Shelby network`);
  return buffer;
}

/**
 * List blobs for an account
 */
export async function listAccountBlobs(accountAddress: string) {
  const client = await getShelbyClient();
  const blobs = await client.coordination.getAccountBlobs({
    account: accountAddress,
  });

  return blobs;
}

export default {
  uploadToShelby,
  downloadFromShelby,
  listAccountBlobs,
};
