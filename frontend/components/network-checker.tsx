"use client"

import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import { SHELBY_NETWORK, SHELBY_NETWORK_LABEL } from "@/lib/shelby-client"

const EXPECTED_LABEL = SHELBY_NETWORK_LABEL || "shelbynet"

export function NetworkChecker() {
    const { network, changeNetwork } = useWallet()
    const [wrongNetwork, setWrongNetwork] = useState(false)
    const [switching, setSwitching] = useState(false)

    useEffect(() => {
        if (network?.name) {
            const networkName = network.name.toLowerCase()
            const accepted = new Set([EXPECTED_LABEL])
            if (EXPECTED_LABEL === "shelbynet") {
                // Petra may expose Shelbynet as custom
                accepted.add("custom")
            }
            setWrongNetwork(!accepted.has(networkName))
        } else {
            setWrongNetwork(false)
        }
    }, [network])

    const handleSwitchNetwork = async () => {
        try {
            setSwitching(true)
            if (changeNetwork) {
                await changeNetwork(SHELBY_NETWORK)
                setWrongNetwork(false)
            } else {
                throw new Error("Network switching not supported")
            }
        } catch (error) {
            console.warn("Auto-switch failed:", error)
            const instructions = `Please switch network manually in your Petra wallet:\n\n1. Open Petra wallet extension\n2. Click the network dropdown (current: ${network?.name || "Unknown"})\n3. Select ${EXPECTED_LABEL}`
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
                    You are on <strong>{network?.name || "Unknown"}</strong>.
                    This app requires <strong>{EXPECTED_LABEL}</strong>.
                </span>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSwitchNetwork}
                        disabled={switching}
                    >
                        {switching ? "Switching..." : `Switch to ${EXPECTED_LABEL}`}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                        Or switch manually in your wallet
                    </span>
                </div>
            </AlertDescription>
        </Alert>
    )
}
