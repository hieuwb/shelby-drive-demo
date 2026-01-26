"use client"

import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { useState } from "react"
import { aptosClient } from "@/lib/shelby-client"

const FAUCET_URL = "https://faucet.shelbynet.shelby.xyz"
const FAUCET_AMOUNT = 100_000_000 // 1 APT in Octas

export function useFaucet() {
    const { account } = useWallet()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const requestFunds = async (type: "apt" | "shelbyusd" = "apt") => {
        if (!account?.address) {
            setError("Wallet not connected")
            return false
        }

        setLoading(true)
        setError(null)

        try {
            console.log(`🚰 Requesting ${type} faucet funds for:`, account.address)

            let endpoint = `${FAUCET_URL}/fund`;
            let body: any = {
                address: account.address,
                amount: FAUCET_AMOUNT,
            };

            if (type === "shelbyusd") {
                endpoint = `${FAUCET_URL}/shelbyusd`;
                // Assume the same body structure for now
            }

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`Faucet request failed: ${errorText}`)
            }

            const result = await response.json()
            console.log(`✅ ${type} faucet request successful:`, result)

            // Wait a bit for the transaction to be processed
            await new Promise(resolve => setTimeout(resolve, 2000))

            return true
        } catch (err: any) {
            console.error(`❌ ${type} faucet error:`, err)
            setError(err.message || `Failed to request ${type} faucet funds`)
            return false
        } finally {
            setLoading(false)
        }
    }

    return {
        requestFunds,
        loading,
        error,
    }
}
