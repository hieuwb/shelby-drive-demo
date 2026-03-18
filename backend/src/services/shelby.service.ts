/// <reference path="../types/shelby-sdk.d.ts" />

import { Account, Ed25519PrivateKey, Network } from "@aptos-labs/ts-sdk";

// SECURITY: load private key only from environment/secret manager. Never hardcode or commit private keys.
// Plan: default backend Shelby client to testnet while preserving env-driven network overrides for Shelby stages.
const normalizeNetworkName = (name: string): string => name.toLowerCase().trim().replace(/[\s_-]+/g, "");

const resolveNetwork = (name: string): Network => {
  switch (normalizeNetworkName(name)) {
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
  switch (normalizeNetworkName(name)) {
    case "local":
      return Network.LOCAL;
    case "shelbynet":
      return Network.SHELBYNET;
    case "testnet":
      return Network.TESTNET;
    case "devnet":
      // Shelby storage currently uses testnet-grade RPC endpoints for devnet deployments.
      return Network.TESTNET;
    default:
      return resolveNetwork(name);
  }
};

const sanitizeEnvValue = (value: string): string => value.trim().replace(/^['\"]|['\"]$/g, "");

const normalizePrivateKey = (value: string): string => {
  const sanitized = sanitizeEnvValue(value);
  if (sanitized.startsWith("ed25519-priv-")) {
    return sanitized.slice("ed25519-priv-".length);
  }
  return sanitized;
};

function getRequiredEnv(name: "SHELBY_API_KEY" | "SHELBY_ACCOUNT_PRIVATE_KEY"): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} not set in environment`);
  }

  return sanitizeEnvValue(value);
}

function getShelbyNetwork(): Network {
  const shelbyNetworkRaw = (process.env.SHELBY_NETWORK || "testnet").toLowerCase();
  const shelbyStorageNetworkRaw = (process.env.SHELBY_STORAGE_NETWORK || shelbyNetworkRaw).toLowerCase();
  return resolveShelbyStorageNetwork(shelbyStorageNetworkRaw);
}

// Keep a native dynamic import in CommonJS mode. TS can transpile `import()` to `require()`,
// but this SDK only exposes an ESM `import` condition for `./node`.
const dynamicImport = new Function("specifier", "return import(specifier);") as (
  specifier: string,
) => Promise<{ ShelbyNodeClient?: any }>;

let cachedClient: any | null = null;
let cachedClientKey: string | null = null;
let cachedSigner: any | null = null;
let cachedSignerKey: string | null = null;

async function getShelbyClient(): Promise<any> {
  const apiKey = getRequiredEnv("SHELBY_API_KEY");
  const network = getShelbyNetwork();
  const clientKey = `${network}:${apiKey}`;

  if (cachedClient && cachedClientKey === clientKey) return cachedClient;

  const sdk = await dynamicImport("@shelby-protocol/sdk/node");
  const ShelbyNodeClient = sdk.ShelbyNodeClient;

  if (typeof ShelbyNodeClient !== "function") {
    throw new Error("Shelby SDK node client export is unavailable");
  }

  cachedClient = new ShelbyNodeClient({
    network,
    apiKey,
  });
  cachedClientKey = clientKey;

  return cachedClient;
}

function getSigner(): any {
  const privateKey = getRequiredEnv("SHELBY_ACCOUNT_PRIVATE_KEY");
  const normalizedPrivateKey = normalizePrivateKey(privateKey);

  if (cachedSigner && cachedSignerKey === normalizedPrivateKey) {
    return cachedSigner;
  }

  cachedSigner = Account.fromPrivateKey({
    privateKey: new Ed25519PrivateKey(normalizedPrivateKey),
  });
  cachedSignerKey = normalizedPrivateKey;

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
