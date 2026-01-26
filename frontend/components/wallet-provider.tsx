"use client"

import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react"
import { Network } from "@aptos-labs/ts-sdk"
import type { ReactNode } from "react"
import { aptosClient } from "@/lib/shelby-client"

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <AptosWalletAdapterProvider
      autoConnect={true}
      dappConfig={{
        network: Network.SHELBYNET,
        transactionSubmitter: aptosClient as any,
        aptosApiKeys: {
          shelbynet: process.env.NEXT_PUBLIC_SHELBY_API_KEY,
        },
      }}
      onError={(error) => {
        console.log("Wallet adapter error:", error)
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  )
}
