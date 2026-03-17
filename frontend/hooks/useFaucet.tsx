"use client"

import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { useState } from "react"
import { aptosClient, SHELBY_FAUCET_URL } from "@/lib/shelby-client"

const FAUCET_URL = SHELBY_FAUCET_URL
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
            console.log(`Requesting ${type} faucet funds for:`, account.address)

            // Plan: prefer SDK faucet flow for Aptos testnet and keep HTTP fallback for Shelby faucet compatibility.
            if (type === "apt") {
                try {
                    await aptosClient.fundAccount({
                        accountAddress: account.address,
                        amount: FAUCET_AMOUNT,
                    })
                    return true
                } catch (sdkError: any) {
                    console.warn("SDK faucet failed, falling back to direct endpoint:", sdkError?.message || sdkError)
                }
            }

            const isAptosLabsFaucet = FAUCET_URL.includes("aptoslabs.com")

            if (type === "shelbyusd" && isAptosLabsFaucet) {
                throw new Error(
                    "ShelbyUSD faucet is unavailable on Aptos public testnet faucet. Configure NEXT_PUBLIC_SHELBY_FAUCET to a Shelby faucet URL."
                )
            }

            const endpointCandidates =
                type === "apt"
                    ? [`${FAUCET_URL}/fund`, `${FAUCET_URL}/mint?address=${account.address}&amount=${FAUCET_AMOUNT}`]
                    : [`${FAUCET_URL}/shelbyusd`]

            let lastError = "Faucet request failed"
            for (const endpoint of endpointCandidates) {
                const body = endpoint.includes("/mint?")
                    ? undefined
                    : JSON.stringify({
                        address: account.address,
                        amount: FAUCET_AMOUNT,
                    })

                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: body ? { "Content-Type": "application/json" } : undefined,
                    body,
                })

                if (response.ok) {
                    const result = await response.json().catch(() => null)
                    console.log(`${type} faucet request successful:`, result)
                    await new Promise(resolve => setTimeout(resolve, 2000))
                    return true
                }

                const errorText = await response.text()
                lastError = `Faucet request failed (${endpoint}): ${errorText}`
            }

            throw new Error(lastError)
        } catch (err: any) {
            console.error(`${type} faucet error:`, err)
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
