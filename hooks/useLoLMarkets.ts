import { useQuery } from "@tanstack/react-query";

export interface LoLMarket {
  id: string;
  question: string;
  slug: string;
  outcomes: string[];
  outcomePrices: string[];
  clobTokenIds: string[];
  volume: number;
  liquidity: number;
  closed: boolean;
  gameStartTime: string | null;
  negRisk: boolean;
  conditionId: string;
  endDate: string;
  acceptingOrders: boolean;
  bestBid: number | null;
  bestAsk: number | null;
  lastTradePrice: number | null;
  spread: number | null;
}

export interface LoLEvent {
  id: string;
  title: string;
  slug: string;
  ticker: string;
  image: string;
  icon: string;
  startDate: string;
  endDate: string;
  closed: boolean;
  volume: number;
  liquidity: number;
  league: string | null;
  teamA: string | null;
  teamB: string | null;
  bestOf: number | null;
  mainMarket: LoLMarket | null;
  markets: LoLMarket[];
  marketCount: number;
  gameStartTime: string | null;
}

interface LoLMarketsResponse {
  events: LoLEvent[];
  leagues: string[];
}

interface UseLoLMarketsOptions {
  league?: string | null;
  includeResolved?: boolean;
  limit?: number;
}

export default function useLoLMarkets(options: UseLoLMarketsOptions = {}) {
  const { league = null, includeResolved = false, limit = 50 } = options;

  return useQuery({
    queryKey: ["lol-markets", league, includeResolved, limit],
    queryFn: async (): Promise<LoLMarketsResponse> => {
      let url = `/api/lol-markets?limit=${limit}`;
      if (league) url += `&league=${encodeURIComponent(league)}`;
      if (includeResolved) url += `&include_resolved=true`;

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch LoL markets");
      return response.json();
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}
