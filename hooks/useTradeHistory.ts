import { useQuery } from "@tanstack/react-query";

export type TradeActivity = {
  id: string;
  type: "TRADE" | "REDEEM" | "MERGE" | string;
  side: "BUY" | "SELL";
  asset: string;
  size: number;
  price: number;
  value: number;
  title: string;
  slug: string;
  icon: string;
  outcome: string;
  outcomeIndex: number;
  eventSlug: string;
  timestamp: string;
  transactionHash: string;
  negativeRisk: boolean;
};

export default function useTradeHistory(walletAddress: string | undefined) {
  return useQuery({
    queryKey: ["trade-history", walletAddress],
    queryFn: async (): Promise<TradeActivity[]> => {
      if (!walletAddress) return [];

      const response = await fetch(
        `/api/polymarket/trades?user=${walletAddress}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch trade history");
      }

      return response.json();
    },
    enabled: !!walletAddress,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}
