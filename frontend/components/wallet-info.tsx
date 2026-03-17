"use client";

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useEffect, useState } from "react";
import { getAptosClient, SHELBY_FAUCET_URL } from "@/lib/shelby-client";
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

    void loadBalance();
  }, [account?.address]);

  const loadBalance = async () => {
    if (!account?.address) return;

    try {
      setLoading(true);
      console.log("Loading balance for:", account.address);

      try {
        const resources = await getAptosClient().getAccountCoinsData({
          accountAddress: account.address,
        });

        const aptCoin = resources.find((coin) => coin.asset_type === "0x1::aptos_coin::AptosCoin");

        if (aptCoin) {
          const balanceInAPT = (Number(aptCoin.amount) / 100_000_000).toFixed(4);
          setBalance(balanceInAPT);
        } else {
          setBalance("0");
        }
      } catch (coinsError: any) {
        console.log("getAccountCoinsData failed, trying getAccountResource...", coinsError.message);

        try {
          const coinStore = await getAptosClient().getAccountResource({
            accountAddress: account.address,
            resourceType: "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>",
          });

          const rawBalance = coinStore.coin?.value || "0";
          const balanceInAPT = (Number(rawBalance) / 100_000_000).toFixed(4);
          setBalance(balanceInAPT);
        } catch (resourceError: any) {
          if (resourceError.status === 404) {
            setBalance("0 (Not activated)");
          } else {
            throw resourceError;
          }
        }
      }
    } catch (error: any) {
      console.error("Error loading balance:", error);
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

      try {
        await getAptosClient().fundAccount({
          accountAddress: account.address,
          amount: 100_000_000,
        });
      } catch (sdkError: any) {
        console.log("SDK faucet failed, trying direct API...");

        const endpoints = [
          `${SHELBY_FAUCET_URL}/fund?address=${account.address}&amount=100000000`,
          `${SHELBY_FAUCET_URL}/mint?address=${account.address}&amount=100000000`,
        ];

        let lastError = "Faucet API request failed";
        let ok = false;
        for (const endpoint of endpoints) {
          const response = await fetch(endpoint, { method: "POST" });
          if (response.ok) {
            ok = true;
            break;
          }
          const text = await response.text();
          lastError = `Faucet API error (${endpoint}): ${text}`;
        }

        if (!ok) throw new Error(lastError);
      }

      alert("Faucet success. You received 1 APT. Please wait a few seconds and refresh.");

      setTimeout(() => {
        void loadBalance();
      }, 3000);
    } catch (error: any) {
      console.error("Faucet error:", error);
      alert(`Faucet failed: ${error.message}`);
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
      <Button size="sm" variant="outline" onClick={requestFaucet} disabled={loading} className="text-xs">
        {loading ? "..." : "Faucet"}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => void loadBalance()} disabled={loading} className="text-xs">
        Refresh
      </Button>
    </div>
  );
}
