"use client"

import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react"
import { SHELBY_NETWORK, SHELBY_NETWORK_LABEL } from "@/lib/shelby-client"
import { useEffect, useMemo, useState, type ReactNode } from "react"

const APTOS_API_KEY = process.env.NEXT_PUBLIC_APTOS_API_KEY || process.env.NEXT_PUBLIC_SHELBY_API_KEY

export function WalletProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const dappConfig = useMemo(
    () => ({
      network: SHELBY_NETWORK,
      aptosApiKeys: APTOS_API_KEY
        ? ({ [SHELBY_NETWORK_LABEL]: APTOS_API_KEY } as Record<string, string>)
        : undefined,
    }),
    []
  )

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <AptosWalletAdapterProvider
      autoConnect={true}
      dappConfig={dappConfig}
      onError={(error) => {
        console.error("Wallet adapter error:", error)
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  )
}
