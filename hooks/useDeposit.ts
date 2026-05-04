import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

// Types for Polymarket Bridge API

export interface SupportedAsset {
  chainId: string;
  chainName: string;
  token: {
    name: string;
    symbol: string;
    address: string;
    decimals: number;
  };
  minCheckoutUsd: number;
}

export interface DepositAddresses {
  evm: string;
  svm?: string;
  btc?: string;
  tvm?: string;
}

export type DepositStatus =
  | "DEPOSIT_DETECTED"
  | "PROCESSING"
  | "ORIGIN_TX_CONFIRMED"
  | "SUBMITTED"
  | "COMPLETED"
  | "FAILED";

export interface DepositTransaction {
  fromChainId: string;
  fromTokenAddress: string;
  fromAmountBaseUnit: string;
  toChainId: string;
  toTokenAddress: string;
  status: DepositStatus;
  txHash?: string;
  createdTimeMs: number;
}

export interface QuoteResult {
  estCheckoutTimeMs: number;
  estInputUsd: number;
  estOutputUsd: number;
  estToTokenBaseUnit: string;
  quoteId: string;
  estFeeBreakdown: {
    gasUsd: number;
    appFeeUsd: number;
    totalImpactUsd: number;
    minReceived: number;
    maxSlippage: number;
  };
}

// Fetch supported chains/tokens (cached via React Query)
export function useSupportedAssets() {
  return useQuery<SupportedAsset[]>({
    queryKey: ["bridge-supported-assets"],
    queryFn: async () => {
      const res = await fetch("/api/bridge?action=supported-assets");
      if (!res.ok) throw new Error("Failed to fetch supported assets");
      const data = await res.json();
      return data.supportedAssets ?? [];
    },
    staleTime: 60 * 60 * 1000, // 1h
  });
}

// Main deposit hook
export function useDeposit(walletAddress: string | undefined) {
  const [depositAddresses, setDepositAddresses] =
    useState<DepositAddresses | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [transactions, setTransactions] = useState<DepositTransaction[]>([]);

  // Generate deposit addresses for the deposit wallet
  const generateDepositAddresses = useCallback(async () => {
    if (!walletAddress) return;
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/bridge?action=deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: walletAddress }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate deposit address");
      }
      const data = await res.json();
      setDepositAddresses(data.address);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  }, [walletAddress]);

  // Poll deposit status
  const startPolling = useCallback(
    (depositAddress: string) => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      setIsPolling(true);

      const poll = async () => {
        try {
          const res = await fetch(
            `/api/bridge?action=status&address=${depositAddress}`
          );
          if (!res.ok) return;
          const data = await res.json();
          const txs: DepositTransaction[] = data.transactions ?? [];
          setTransactions(txs);

          // Stop polling if all transactions are terminal
          const allTerminal = txs.length > 0 && txs.every(
            (tx) => tx.status === "COMPLETED" || tx.status === "FAILED"
          );
          if (allTerminal) {
            stopPolling();
          }
        } catch {
          // Silently retry on next interval
        }
      };

      poll(); // immediate first check
      pollingRef.current = setInterval(poll, 15000); // every 15s
    },
    []
  );

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Get a fee quote
  const getQuote = useCallback(
    async (params: {
      fromAmountBaseUnit: string;
      fromChainId: string;
      fromTokenAddress: string;
    }): Promise<QuoteResult | null> => {
      if (!walletAddress) return null;
      try {
        const res = await fetch("/api/bridge?action=quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...params,
            recipientAddress: walletAddress,
            toChainId: "137",
            toTokenAddress: "0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB", // pUSD
          }),
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },
    [walletAddress]
  );

  return {
    depositAddresses,
    isGenerating,
    error,
    generateDepositAddresses,
    transactions,
    isPolling,
    startPolling,
    stopPolling,
    getQuote,
  };
}
