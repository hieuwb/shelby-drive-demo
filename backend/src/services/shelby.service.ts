import { Account, Ed25519PrivateKey, Network } from "@aptos-labs/ts-sdk";

// SECURITY: load private key only from environment/secret manager. Never hardcode or commit private keys.
// Plan: default backend Shelby client to testnet while preserving env-driven network overrides for Shelby stages.
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
      return Network.TESTNET;
  }
};

const resolveShelbyStorageNetwork = (name: string): Network => {
  switch (name) {
    case "local":
      return Network.LOCAL;
    case "shelbynet":
      return Network.SHELBYNET;
    case "testnet":
      // Shelby SDK currently supports LOCAL and SHELBYNET storage backends.
      return Network.SHELBYNET;
    default:
      return resolveNetwork(name);
  }
};

function getRequiredEnv(name: "SHELBY_API_KEY" | "SHELBY_ACCOUNT_PRIVATE_KEY"): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} not set in environment`);
  }

  return value;
}

function getShelbyNetwork(): Network {
  const shelbyNetworkRaw = (process.env.SHELBY_NETWORK || "testnet").toLowerCase();
  const shelbyStorageNetworkRaw = (process.env.SHELBY_STORAGE_NETWORK || shelbyNetworkRaw).toLowerCase();
  return resolveShelbyStorageNetwork(shelbyStorageNetworkRaw);
}

let cachedClient: any | null = null;
let cachedClientKey: string | null = null;
let cachedSigner: any | null = null;
let cachedSignerKey: string | null = null;

async function getShelbyClient(): Promise<any> {
  const apiKey = getRequiredEnv("SHELBY_API_KEY");
  const network = getShelbyNetwork();
  const clientKey = `${network}:${apiKey}`;

  if (cachedClient && cachedClientKey === clientKey) return cachedClient;

  const sdk = await import("@shelby-protocol/sdk/dist/node/index.mjs");
  const ShelbyNodeClient = (sdk as any).ShelbyNodeClient;

  cachedClient = new ShelbyNodeClient({
    network,
    apiKey,
  });
  cachedClientKey = clientKey;

  return cachedClient;
}

function getSigner(): any {
  const privateKey = getRequiredEnv("SHELBY_ACCOUNT_PRIVATE_KEY");

  if (cachedSigner && cachedSignerKey === privateKey) {
    return cachedSigner;
  }

  cachedSigner = Account.fromPrivateKey({
    privateKey: new Ed25519PrivateKey(privateKey),
  });
  cachedSignerKey = privateKey;

  return cachedSigner;
}

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
  const signer = getSigner();

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
