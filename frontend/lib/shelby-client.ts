import { Network, Aptos, AptosConfig } from "@aptos-labs/ts-sdk";
import { ShelbyClient } from "@shelby-protocol/sdk/browser";

const SHELBY_API_KEY = process.env.NEXT_PUBLIC_SHELBY_API_KEY;
const SHELBY_NETWORK_RAW = (process.env.NEXT_PUBLIC_SHELBY_NETWORK || "testnet").toLowerCase();
const SHELBY_STORAGE_NETWORK_RAW = (process.env.NEXT_PUBLIC_SHELBY_STORAGE_NETWORK || SHELBY_NETWORK_RAW).toLowerCase();
const SHELBY_FULLNODE = process.env.NEXT_PUBLIC_SHELBY_FULLNODE;
const SHELBY_INDEXER = process.env.NEXT_PUBLIC_SHELBY_INDEXER;
const SHELBY_FAUCET = process.env.NEXT_PUBLIC_SHELBY_FAUCET;
const SHELBY_EXPLORER = process.env.NEXT_PUBLIC_SHELBY_EXPLORER;

const normalizeNetworkName = (value: string): string => value.toLowerCase().trim().replace(/[\s_-]+/g, "");

const DEFAULT_ENDPOINTS: Record<string, { fullnode: string; indexer: string; faucet: string; explorer: string }> = {
  testnet: {
    fullnode: "https://api.testnet.aptoslabs.com/v1",
    indexer: "https://indexer-testnet.staging.gcp.aptosdev.com/v1/graphql",
    faucet: "https://faucet.testnet.aptoslabs.com",
    explorer: "https://explorer.aptoslabs.com/?network=testnet",
  },
  devnet: {
    fullnode: "https://api.devnet.aptoslabs.com/v1",
    indexer: "https://indexer-devnet.staging.gcp.aptosdev.com/v1/graphql",
    faucet: "https://faucet.devnet.aptoslabs.com",
    explorer: "https://explorer.aptoslabs.com/?network=devnet",
  },
  shelbynet: {
    fullnode: "https://api.shelbynet.shelby.xyz/v1",
    indexer: "https://indexer.shelbynet.shelby.xyz/v1/graphql",
    faucet: "https://faucet.shelbynet.shelby.xyz",
    explorer: "https://explorer.shelby.xyz/shelbynet",
  },
};
const normalizedNetworkLabel = normalizeNetworkName(SHELBY_NETWORK_RAW);
const NETWORK_ENDPOINTS = DEFAULT_ENDPOINTS[normalizedNetworkLabel] || DEFAULT_ENDPOINTS.testnet;

if (!SHELBY_API_KEY) {
  console.warn("NEXT_PUBLIC_SHELBY_API_KEY not set");
}

// Plan: default app network to Aptos testnet while keeping explicit env overrides for Shelby-specific stages.
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

export const SHELBY_NETWORK = resolveNetwork(normalizedNetworkLabel);
export const SHELBY_NETWORK_LABEL = normalizedNetworkLabel;
export const SHELBY_FULLNODE_URL = SHELBY_FULLNODE || NETWORK_ENDPOINTS.fullnode;
export const SHELBY_INDEXER_URL = SHELBY_INDEXER || NETWORK_ENDPOINTS.indexer;
export const SHELBY_FAUCET_URL = SHELBY_FAUCET || NETWORK_ENDPOINTS.faucet;
export const SHELBY_EXPLORER_URL = SHELBY_EXPLORER || NETWORK_ENDPOINTS.explorer;

const NETWORK_LABEL_ALIASES: Record<string, string[]> = {
  mainnet: ["mainnet", "aptosmainnet"],
  testnet: ["testnet", "aptostestnet", "shelbytestnet"],
  devnet: ["devnet", "aptosdevnet"],
  shelbynet: ["shelbynet", "shelbynetwork"],
};

const allowCustomWalletNetwork = Boolean(SHELBY_FULLNODE || SHELBY_INDEXER || SHELBY_FAUCET);

export function isExpectedWalletNetworkName(networkName?: string | null): boolean {
  if (!networkName) return false;
  const normalized = normalizeNetworkName(networkName);
  const accepted = new Set(NETWORK_LABEL_ALIASES[SHELBY_NETWORK_LABEL] || [SHELBY_NETWORK_LABEL]);
  if (allowCustomWalletNetwork || SHELBY_NETWORK_LABEL === "shelbynet") {
    accepted.add("custom");
  }
  return accepted.has(normalized);
}

const resolveShelbyStorageNetwork = (name: string): Network => {
  switch (normalizeNetworkName(name)) {
    case "local":
      return Network.LOCAL;
    case "shelbynet":
      return Network.SHELBYNET;
    case "testnet":
      // Shelby SDK currently supports LOCAL and SHELBYNET storage backends.
      return Network.SHELBYNET;
    default:
      return Network.SHELBYNET;
  }
};

export const SHELBY_STORAGE_NETWORK = resolveShelbyStorageNetwork(SHELBY_STORAGE_NETWORK_RAW);

const aptosConfig = SHELBY_FULLNODE || SHELBY_INDEXER || SHELBY_FAUCET
  ? new AptosConfig({
      network: Network.CUSTOM,
      fullnode: SHELBY_FULLNODE_URL,
      indexer: SHELBY_INDEXER_URL,
      faucet: SHELBY_FAUCET_URL,
      clientConfig: {
        API_KEY: SHELBY_API_KEY,
      },
    })
  : new AptosConfig({
      network: SHELBY_NETWORK,
      clientConfig: {
        API_KEY: SHELBY_API_KEY,
      },
    });

export const aptosClient = new Aptos(aptosConfig);

export const shelbyClient = new ShelbyClient({
  network: SHELBY_STORAGE_NETWORK as any,
  apiKey: SHELBY_API_KEY || "",
});

export const getAptosClient = () => aptosClient;
export const getShelbyClient = () => shelbyClient;
