import { useQuery } from "@tanstack/react-query";

export interface PricePoint {
  t: number; // unix timestamp
  p: number; // price (0-1)
}

interface PriceHistoryResponse {
  history: PricePoint[];
}

type Interval = "1h" | "6h" | "1d" | "1w" | "1m" | "all";

const FIDELITY_MAP: Record<Interval, number> = {
  "1h": 1,
  "6h": 5,
  "1d": 15,
  "1w": 60,
  "1m": 120,
  all: 360,
};

interface UsePriceHistoryOptions {
  tokenId: string | null;
  interval?: Interval;
  enabled?: boolean;
}

export default function usePriceHistory({
  tokenId,
  interval = "1d",
  enabled = true,
}: UsePriceHistoryOptions) {
  return useQuery({
    queryKey: ["price-history", tokenId, interval],
    queryFn: async (): Promise<PricePoint[]> => {
      const fidelity = FIDELITY_MAP[interval] || 60;
      const response = await fetch(
        `/api/price-history?market=${tokenId}&interval=${interval}&fidelity=${fidelity}`
      );
      if (!response.ok) throw new Error("Failed to fetch price history");
      const data: PriceHistoryResponse = await response.json();
      return data.history || [];
    },
    enabled: enabled && !!tokenId,
    staleTime: 300_000, // 5 min
    refetchOnWindowFocus: false,
  });
}
