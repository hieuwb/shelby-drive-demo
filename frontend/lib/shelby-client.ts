import { Network, Aptos, AptosConfig } from "@aptos-labs/ts-sdk";
import { ShelbyClient } from "@shelby-protocol/sdk/browser";

const SHELBY_API_KEY = process.env.NEXT_PUBLIC_SHELBY_API_KEY;

if (!SHELBY_API_KEY) {
  console.warn("⚠️ NEXT_PUBLIC_SHELBY_API_KEY not set");
}

// Aptos client for Shelbynet
export const aptosClient = new Aptos(
  new AptosConfig({
    network: Network.CUSTOM,
    fullnode: "https://api.shelbynet.shelby.xyz/v1",
    clientConfig: {
      API_KEY: SHELBY_API_KEY,
    },
  })
);

// Shelby client for file storage
export const shelbyClient = new ShelbyClient({
  network: Network.SHELBYNET,
  apiKey: SHELBY_API_KEY || "",
});

export const getAptosClient = () => aptosClient;
export const getShelbyClient = () => shelbyClient;
