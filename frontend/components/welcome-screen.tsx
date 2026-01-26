"use client"

import { useState } from "react"
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { Cloud, Wallet, Shield, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function WelcomeScreen() {
  const { connect, wallets } = useWallet()
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

      // Try to connect to the first available wallet (usually Petra)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Logo and Title */}
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="bg-primary/10 p-4 rounded-2xl">
              <Cloud className="w-12 h-12 text-accent" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground">Shelby Drive</h1>
          <p className="text-muted-foreground text-lg">Decentralized Cloud Storage on Aptos</p>
        </div>

        {/* Features */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-left">
            <Shield className="w-5 h-5 text-accent flex-shrink-0" />
            <span className="text-foreground">Secure & Encrypted</span>
          </div>
          <div className="flex items-center gap-3 text-left">
            <Zap className="w-5 h-5 text-accent flex-shrink-0" />
            <span className="text-foreground">Web3 Powered</span>
          </div>
          <div className="flex items-center gap-3 text-left">
            <Cloud className="w-5 h-5 text-accent flex-shrink-0" />
            <span className="text-foreground">Unlimited Storage</span>
          </div>
        </div>

        {/* Connect Wallet Button */}
        <Button
          onClick={handleConnectWallet}
          disabled={connecting}
          className="w-full bg-primary hover:bg-blue-700 text-primary-foreground h-12 text-lg flex items-center justify-center gap-2 rounded-lg"
        >
          <Wallet className="w-5 h-5" />
          {connecting ? "Connecting Wallet..." : "Connect Wallet"}
        </Button>

        {error && (
          <div className={`border px-4 py-3 rounded-lg text-sm ${error === "INSTALL_PETRA"
            ? "bg-blue-50 border-blue-200 text-blue-900"
            : "bg-red-50 border-red-200 text-red-700"
            }`}>
            {error === "INSTALL_PETRA" ? (
              <div className="space-y-2">
                <p className="font-semibold">Petra Wallet is not installed</p>
                <p>Please install Petra Wallet to connect with Shelby Drive.</p>
                <a
                  href="https://petra.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Wallet className="w-4 h-4" />
                  Install Petra Wallet
                </a>
              </div>
            ) : (
              error
            )}
          </div>
        )}

        {/* Info Text */}
        <p className="text-sm text-muted-foreground">
          Click the button above and authorize the connection in your Aptos wallet to get started.
        </p>
      </div>
    </div>
  )
}
