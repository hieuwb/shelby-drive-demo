"use client"

import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { Network } from "@aptos-labs/ts-sdk"
import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export function NetworkChecker() {
    const { network, changeNetwork } = useWallet()
    const [wrongNetwork, setWrongNetwork] = useState(false)
    const [switching, setSwitching] = useState(false)

    useEffect(() => {
        if (network?.name) {
            const networkName = network.name.toLowerCase()
            // Accept both 'shelbynet' and 'custom' since Petra reports Shelbynet as 'custom'
            const isValidNetwork = networkName === "shelbynet" || networkName === "custom"
            setWrongNetwork(!isValidNetwork)
        } else {
            setWrongNetwork(false)
        }
    }, [network])

    const handleSwitchNetwork = async () => {
        try {
            setSwitching(true)
            if (changeNetwork) {
                await changeNetwork(Network.SHELBYNET)
                setWrongNetwork(false)
            } else {
                throw new Error("Network switching not supported")
            }
        } catch (error) {
            console.warn("Auto-switch failed:", error)
            // Show manual instructions
            const instructions = `Please switch to Shelbynet manually in your Petra wallet:
      
1. Open Petra wallet extension
2. Click on the network dropdown (currently showing "${network?.name || "Unknown"}")
3. Select "Shelbynet" from the list

If Shelbynet is not in the list, you may need to add it as a custom network.`

            alert(instructions)
        } finally {
            setSwitching(false)
        }
    }

    if (!wrongNetwork) return null

    return (
        <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Wrong Network</AlertTitle>
            <AlertDescription className="flex flex-col gap-3">
                <span>
                    You are on <strong>{network?.name || "Unknown"}</strong> network.
                    This app requires <strong>Shelbynet</strong>.
                </span>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSwitchNetwork}
                        disabled={switching}
                    >
                        {switching ? "Switching..." : "Switch to Shelbynet"}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                        Or switch manually in your wallet
                    </span>
                </div>
            </AlertDescription>
        </Alert>
    )
}
