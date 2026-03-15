import { Network, Aptos, AptosConfig } from "@aptos-labs/ts-sdk";
import { ShelbyClient } from "@shelby-protocol/sdk/browser";

const SHELBY_API_KEY = process.env.NEXT_PUBLIC_SHELBY_API_KEY;
const SHELBY_NETWORK_RAW = (process.env.NEXT_PUBLIC_SHELBY_NETWORK || "shelbynet").toLowerCase();
const SHELBY_FULLNODE = process.env.NEXT_PUBLIC_SHELBY_FULLNODE;
const SHELBY_INDEXER = process.env.NEXT_PUBLIC_SHELBY_INDEXER;
const SHELBY_FAUCET = process.env.NEXT_PUBLIC_SHELBY_FAUCET;

if (!SHELBY_API_KEY) {
  console.warn("NEXT_PUBLIC_SHELBY_API_KEY not set");
}

// Plan: centralize network resolution so frontend can switch between Shelby stages using env vars without code edits.
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

export const SHELBY_NETWORK = resolveNetwork(SHELBY_NETWORK_RAW);
export const SHELBY_NETWORK_LABEL = SHELBY_NETWORK_RAW;

const aptosConfig = SHELBY_FULLNODE
  ? new AptosConfig({
      network: Network.CUSTOM,
      fullnode: SHELBY_FULLNODE,
      indexer: SHELBY_INDEXER,
      faucet: SHELBY_FAUCET,
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
  network: SHELBY_NETWORK as any,
  apiKey: SHELBY_API_KEY || "",
});

export const getAptosClient = () => aptosClient;
export const getShelbyClient = () => shelbyClient;
