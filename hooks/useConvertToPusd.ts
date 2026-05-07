import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTrading } from "@/providers/TradingProvider";
import { createUsdcTransferCall } from "@/utils/transfer";
import { getAssetAddress } from "@/utils/convert";
import type { TokenBalance } from "@/hooks/usePolygonBalances";

export default function useConvertToPusd() {
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { relayClient, depositWalletAddress } = useTrading();
  const queryClient = useQueryClient();
  const depositAddrCache = useRef<string | null>(null);

  const convert = useCallback(
    async (token: TokenBalance) => {
      if (!relayClient || !depositWalletAddress) {
        setError("Trading session not ready");
        return false;
      }

      if (token.symbol !== "USDC" && token.symbol !== "USDC.e") {
        setError("Only USDC and USDC.e can be converted");
        return false;
      }

      if (token.balance < 2) {
        setError("Bridge minimum is $2");
        return false;
      }

      setIsConverting(true);
      setError(null);

      try {
        // Get bridge deposit address (cached after first call)
        let bridgeAddr = depositAddrCache.current;
        if (!bridgeAddr) {
          const res = await fetch("/api/bridge?action=deposit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ address: depositWalletAddress }),
          });
          if (!res.ok) throw new Error("Failed to get bridge deposit address");
          const data = await res.json();
          bridgeAddr = data.address?.evm;
          if (!bridgeAddr) throw new Error("No EVM deposit address returned");
          depositAddrCache.current = bridgeAddr;
        }

        // Transfer token from deposit wallet to bridge address
        const assetAddress = getAssetAddress(token.symbol as "USDC" | "USDC.e");
        const call = createUsdcTransferCall({
          recipient: bridgeAddr as `0x${string}`,
          amount: token.raw,
          tokenAddress: assetAddress,
        });

        const deadline = String(Math.floor(Date.now() / 1000) + 3600);
        const response = await relayClient.executeDepositWalletBatch(
          [call],
          depositWalletAddress,
          deadline
        );
        await response.wait();

        // Refresh balances after a short delay for bridge processing
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["polygon-balances"] });
        }, 5000);
        // Refresh again after longer delay when bridge likely completes
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["polygon-balances"] });
        }, 30000);

        return true;
      } catch (err) {
        console.error("Convert to pUSD failed:", err);
        const msg = err instanceof Error ? err.message : "Conversion failed";
        setError(msg);
        return false;
      } finally {
        setIsConverting(false);
      }
    },
    [relayClient, depositWalletAddress, queryClient]
  );

  return { convert, isConverting, error };
}
