import "dotenv/config";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

const aptosRestUrl = process.env.APTOS_REST;

if (!aptosRestUrl) {
  throw new Error(
    "APTOS_REST environment variable is required. Please set it in your .env file.\n" +
    "Example: APTOS_REST=https://fullnode.testnet.aptoslabs.com/v1"
  );
}

const config = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: aptosRestUrl,
});

export const aptos = new Aptos(config);
