"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { Cloud, Wallet, LogOut, Coins } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TokenBalance {
  apt: number;
  shelby: number;
}

export default function Header() {
  const { connected, account, disconnect, connect, wallets } = useWallet()
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [balances, setBalances] = useState<TokenBalance>({ apt: 0, shelby: 0 })

  const handleConnectWallet = async () => {
    setConnecting(true)
    setError(null)
    try {
      // Check if any Aptos wallet is available
      if (!wallets || wallets.length === 0) {
        setError("INSTALL_PETRA")
        setConnecting(false)
        return
      }

      const availableWallet = wallets[0]
      await connect(availableWallet.name)
    } catch (error: any) {
      console.error("Failed to connect wallet:", error)

      // Check if error is because wallet is not installed
      if (error?.message?.toLowerCase().includes("not installed") ||
        error?.message?.toLowerCase().includes("not found") ||
        (!wallets || wallets.length === 0)) {
        setError("INSTALL_PETRA")
      } else {
        setError(error?.message || "Failed to connect wallet. Please try again.")
      }
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await disconnect()
    } catch (error) {
      console.error("Failed to disconnect wallet:", error)
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatBalance = (balance: number) => {
    return balance.toFixed(2)
  }

  useEffect(() => {
    const fetchBalances = async () => {
      if (!account?.address) return

      try {
        const address = String(account.address)

        // Fetch APT balance using view function
        const aptResponse = await fetch(
          `https://api.shelbynet.shelby.xyz/v1/view`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              function: '0x1::coin::balance',
              type_arguments: ['0x1::aptos_coin::AptosCoin'],
              arguments: [address]
            })
          }
        )

        if (aptResponse.ok) {
          const aptData = await aptResponse.json()
          // Response is an array like ["2099219800"]
          const aptBalance = parseInt(aptData[0] || "0") / 100000000
          setBalances(prev => ({ ...prev, apt: aptBalance }))
        }

        // Fetch ShelbyUSD balance using view function (may fail if coin not registered)
        try {
          const shelbyResponse = await fetch(
            `https://api.shelbynet.shelby.xyz/v1/view`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                function: '0x1::coin::balance',
                type_arguments: ['0x1b18363a9f1fe5e6ebf247daba5cc1c18052bb232efdc4c50f556053922d98e1::shelbyusd::ShelbyUSD'],
                arguments: [address]
              })
            }
          )
          if (shelbyResponse.ok) {
            const shelbyData = await shelbyResponse.json()
            const shelbyBalance = parseInt(shelbyData[0] || "0") / 100000000
            setBalances(prev => ({ ...prev, shelby: shelbyBalance }))
          }
        } catch (shelbyError) {
          // Ignore if ShelbyUSD not registered
          console.log("ShelbyUSD not available");
        }
      } catch (error) {
        console.error("Error fetching balances:", error)
      }
    }

    fetchBalances()
    const interval = setInterval(fetchBalances, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [account?.address])

  return (
    <header className="bg-card border-b border-border h-16 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <Cloud className="w-6 h-6 text-accent" />
        <h1 className="text-xl font-bold text-foreground">Shelby Drive</h1>
      </div>

      {connected && account?.address ? (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-secondary/50 rounded-lg px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">{formatBalance(balances.apt)} APT</span>
            </div>
            {balances.shelby > 0 && (
              <>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">{formatBalance(balances.shelby)} SHELBY</span>
                </div>
              </>
            )}
          </div>
          <div className="text-sm text-muted-foreground">{formatAddress(String(account.address))}</div>
          <Button
            onClick={handleDisconnect}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-end gap-2">
          <Button
            onClick={handleConnectWallet}
            disabled={connecting}
            className="bg-primary hover:bg-blue-700 text-primary-foreground flex items-center gap-2"
          >
            <Wallet className="w-4 h-4" />
            {connecting ? "Connecting..." : "Connect Wallet"}
          </Button>
          {error && (
            <div className="relative">
              {error === "INSTALL_PETRA" ? (
                <div className="absolute right-0 top-0 bg-blue-50 border border-blue-200 text-blue-900 px-4 py-3 rounded-lg text-sm shadow-lg z-50 w-80">
                  <p className="font-semibold mb-1">Petra Wallet is not installed</p>
                  <p className="mb-2 text-xs">Please install Petra Wallet to connect.</p>
                  <a
                    href="https://petra.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    <Wallet className="w-3 h-3" />
                    Install Petra Wallet
                  </a>
                </div>
              ) : (
                <div className="absolute right-0 top-0 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-xs shadow-lg z-50 w-80">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  )
}
