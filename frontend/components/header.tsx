"use client"

import { useState, useEffect, useCallback } from "react"
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { Cloud, Wallet, LogOut, Coins, ExternalLink, PlusCircle, RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { aptosClient } from "@/lib/shelby-client"
import { MODULE_ADDRESS as MODULE_ADDR, SHELBY_COIN_ADDRESS } from "@/abi/config"

interface TokenBalance {
  apt: number;
  shelby: number;
}

export default function Header() {
  const { connected, account, disconnect, connect, wallets, signAndSubmitTransaction } = useWallet()
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [balances, setBalances] = useState<TokenBalance>({ apt: 0, shelby: 0 })
  const [isDriveInitialized, setIsDriveInitialized] = useState<boolean | null>(null)
  const [initializing, setInitializing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const handleConnectWallet = async () => {
    setConnecting(true)
    setError(null)
    try {
      if (!wallets || wallets.length === 0) {
        setError("INSTALL_PETRA")
        setConnecting(false)
        return
      }

      const availableWallet = wallets[0]
      await connect(availableWallet.name)
    } catch (error: any) {
      console.error("Failed to connect wallet:", error)
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

  const fetchBalances = useCallback(async () => {
    if (!account?.address) return

    try {
      const address = String(account.address)

      // Helper to ensure 0x prefix and lowercase
      const formatAddr = (addr: string) => addr.startsWith('0x') ? addr.toLowerCase() : `0x${addr}`.toLowerCase();
      const userAddr = formatAddr(address);
      const metadataAddr = formatAddr(SHELBY_COIN_ADDRESS);

      console.log("📊 Fetching balances for:", userAddr);

      // 1. Fetch APT balance (Legacy CoinStore check)
      try {
        const aptBalanceData = await aptosClient.view({
          payload: {
            function: "0x1::coin::balance",
            typeArguments: ["0x1::aptos_coin::AptosCoin"],
            functionArguments: [userAddr],
          },
        });
        setBalances(prev => ({ ...prev, apt: Number(aptBalanceData[0] || 0) / 100_000_000 }));
      } catch (aptError: any) {
        // Fallback to simpler check if view fails
        setBalances(prev => ({ ...prev, apt: 0 }));
      }

      // 2. Fetch ShelbyUSD (Fungible Asset)
      let shelbyBalance = 0;
      try {
        // Try with 1 type argument as Shelbynet RPC expects
        const shelbyBalanceData = await aptosClient.view({
          payload: {
            function: "0x1::primary_fungible_store::balance",
            typeArguments: ["0x1::fungible_asset::Metadata"],
            functionArguments: [userAddr, metadataAddr],
          },
        });
        shelbyBalance = Number(shelbyBalanceData[0] || 0);
      } catch (shelbyError: any) {
        // Fallback 1: Try WITHOUT type arguments
        try {
          const fallbackData = await aptosClient.view({
            payload: {
              function: "0x1::primary_fungible_store::balance",
              typeArguments: [],
              functionArguments: [userAddr, metadataAddr],
            },
          });
          shelbyBalance = Number(fallbackData[0] || 0);
        } catch (e) {
          // Fallback 2: Check for ANY FungibleStore resource if view fails
          shelbyBalance = 0;
        }
      }
      setBalances(prev => ({ ...prev, shelby: shelbyBalance / 100_000_000 }));

      // 3. Check if Drive is initialized
      try {
        await aptosClient.getAccountResource({
          accountAddress: userAddr,
          resourceType: `${MODULE_ADDR}::drive::Drive`,
        });
        setIsDriveInitialized(true);
      } catch (resourceError: any) {
        if (resourceError.status === 404 || resourceError.message?.includes("not found")) {
          setIsDriveInitialized(false);
        }
      }
    } catch (error) {
      console.error("Critical error in balance fetch system:", error);
    }
  }, [account?.address]);

  useEffect(() => {
    fetchBalances()
    const interval = setInterval(fetchBalances, 15000)
    return () => clearInterval(interval)
  }, [fetchBalances])

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBalances();
    setTimeout(() => setRefreshing(false), 500);
  }

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
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">{formatBalance(balances.shelby)} SHELBY</span>
            </div>
          </div>
          <div className="text-sm text-muted-foreground font-mono">{formatAddress(String(account.address))}</div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => window.open("https://docs.shelby.xyz/apis/faucet/shelbyusd", "_blank")}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 border-yellow-200 bg-yellow-50/30 text-yellow-700 hover:bg-yellow-50 h-8 text-xs font-semibold"
            >
              <ExternalLink className="w-3 h-3" />
              Faucet APT & SHELBY
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className={`h-8 w-8 p-0 ${refreshing ? 'animate-spin' : ''}`}
              title="Reload Balance"
            >
              <RefreshCcw className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>

          {isDriveInitialized === false && (
            <Button
              onClick={async () => {
                try {
                  setInitializing(true);
                  const tx: any = {
                    data: {
                      function: `${MODULE_ADDR}::drive::initialize_drive`,
                      typeArguments: [],
                      functionArguments: [],
                    }
                  };
                  const response = await signAndSubmitTransaction(tx);
                  await aptosClient.waitForTransaction({ transactionHash: response.hash });
                  setIsDriveInitialized(true);
                  alert("✅ Drive initialized successfully!");
                  await fetchBalances();
                } catch (error: any) {
                  console.error("Initialization error:", error);
                  alert("❌ Failed to initialize drive: " + error.message);
                } finally {
                  setInitializing(false);
                }
              }}
              disabled={initializing}
              variant="default"
              size="sm"
              className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white"
            >
              <PlusCircle className="w-4 h-4" />
              {initializing ? "Initializing..." : "Initialize Drive"}
            </Button>
          )}

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
