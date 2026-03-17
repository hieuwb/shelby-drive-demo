import "dotenv/config";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

let cachedAptos: Aptos | null = null;

function getAptosRestUrl(): string {
  const aptosRestUrl = process.env.APTOS_REST;

  if (!aptosRestUrl) {
    throw new Error(
      "APTOS_REST environment variable is required. Please set it in your .env file.\n" +
      "Example: APTOS_REST=https://fullnode.testnet.aptoslabs.com/v1"
    );
  }

  return aptosRestUrl;
}

export function getAptosClient(): Aptos {
  if (cachedAptos) {
    return cachedAptos;
  }

  const config = new AptosConfig({
    network: Network.CUSTOM,
    fullnode: getAptosRestUrl(),
  });

  cachedAptos = new Aptos(config);
  return cachedAptos;
}
