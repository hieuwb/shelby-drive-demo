"use client";

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useEffect, useState } from "react";
import { getAptosClient } from "@/lib/shelby-client";
import { Button } from "@/components/ui/button";

export function WalletInfo() {
  const { account } = useWallet();
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!account?.address) {
      setBalance(null);
      return;
    }

    loadBalance();
  }, [account?.address]);

  const loadBalance = async () => {
    if (!account?.address) return;

    try {
      setLoading(true);
      console.log("📊 Loading balance for:", account.address);
      
      try {
        // Get coin balance using getAccountCoinsData
        const resources = await getAptosClient().getAccountCoinsData({
          accountAddress: account.address,
        });
        
        console.log("📊 Account coins data:", resources);
        
        // Find APT balance
        const aptCoin = resources.find((coin) => 
          coin.asset_type === "0x1::aptos_coin::AptosCoin"
        );
        
        if (aptCoin) {
          const balanceInAPT = (Number(aptCoin.amount) / 100_000_000).toFixed(4);
          setBalance(balanceInAPT);
          console.log(`✅ Balance: ${balanceInAPT} APT`);
        } else {
          console.log("⚠️ No APT coin found");
          setBalance("0");
        }
      } catch (coinsError: any) {
        console.log("⚠️ getAccountCoinsData failed, trying getAccountResource...", coinsError.message);
        
        // Fallback: try to get CoinStore resource directly
        try {
          const coinStore = await getAptosClient().getAccountResource({
            accountAddress: account.address,
            resourceType: "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>",
          });
          
          const balance = coinStore.coin?.value || "0";
          const balanceInAPT = (Number(balance) / 100_000_000).toFixed(4);
          setBalance(balanceInAPT);
          console.log(`✅ Balance (via resource): ${balanceInAPT} APT`);
        } catch (resourceError: any) {
          if (resourceError.status === 404) {
            console.log("⚠️ Account not activated");
            setBalance("0 (Not activated)");
          } else {
            throw resourceError;
          }
        }
      }
    } catch (error: any) {
      console.error("❌ Error loading balance:", error);
      setBalance("Error");
    } finally {
      setLoading(false);
    }
  };

  const requestFaucet = async () => {
    if (!account?.address) {
      alert("Please connect wallet first");
      return;
    }

    try {
      setLoading(true);
      console.log("🚰 Requesting faucet for:", account.address);
      
      // Try multiple faucet methods
      try {
        // Method 1: Use SDK fundAccount
        const response = await getAptosClient().fundAccount({
          accountAddress: account.address,
          amount: 100_000_000, // 1 APT
        });
        console.log("✅ Faucet success (SDK):", response);
      } catch (sdkError: any) {
        console.log("⚠️ SDK faucet failed, trying direct API...");
        
        // Method 2: Direct API call
        const response = await fetch(
          `https://faucet.shelbynet.shelby.xyz/fund?address=${account.address}&amount=100000000`,
          { method: 'POST' }
        );
        
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Faucet API error: ${text}`);
        }
        
        console.log("✅ Faucet success (API)");
      }
      
      alert("✅ Faucet success! You received 1 APT. Please wait a few seconds and refresh.");
      
      // Wait and reload balance
      setTimeout(async () => {
        await loadBalance();
      }, 3000);
      
    } catch (error: any) {
      console.error("❌ Faucet error:", error);
      alert(`❌ Faucet failed: ${error.message}\n\nPlease try the Shelby Discord faucet.`);
    } finally {
      setLoading(false);
    }
  };

  if (!account?.address) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-card border border-border rounded-lg">
      <div className="flex-1">
        <div className="text-xs text-muted-foreground">Balance</div>
        <div className="font-mono font-semibold">
          {loading ? "Loading..." : balance ? `${balance} APT` : "---"}
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={requestFaucet}
        disabled={loading}
        className="text-xs"
      >
        {loading ? "..." : "Faucet"}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={loadBalance}
        disabled={loading}
        className="text-xs"
      >
        ↻
      </Button>
    </div>
  );
}
