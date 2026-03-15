"use client"

import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react"
import { SHELBY_NETWORK, SHELBY_NETWORK_LABEL } from "@/lib/shelby-client"
import type { ReactNode } from "react"

const SHELBY_API_KEY = process.env.NEXT_PUBLIC_SHELBY_API_KEY

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <AptosWalletAdapterProvider
      autoConnect={true}
      dappConfig={{
        network: SHELBY_NETWORK,
        aptosApiKeys: SHELBY_API_KEY
          ? ({ [SHELBY_NETWORK_LABEL]: SHELBY_API_KEY } as Record<string, string>)
          : undefined,
      }}
      onError={(error) => {
        console.log("Wallet adapter error:", error)
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  )
}
