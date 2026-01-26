"use client"

import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react"
import { Network } from "@aptos-labs/ts-sdk"
import type { ReactNode } from "react"

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <AptosWalletAdapterProvider
      autoConnect={true}
      dappConfig={{
        network: Network.SHELBYNET,
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
