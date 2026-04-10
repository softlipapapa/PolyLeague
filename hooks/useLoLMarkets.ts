import { useInfiniteQuery } from "@tanstack/react-query";

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
  status: "live" | "upcoming" | "resolved";
}

interface LoLMarketsPage {
  events: LoLEvent[];
  leagues: string[];
  hasMore: boolean;
  nextOffset: number;
}

export type MatchStatus = "live" | "upcoming";

interface UseLoLMarketsOptions {
  league?: string | null;
  status?: MatchStatus;
  limit?: number;
}

export default function useLoLMarkets(options: UseLoLMarketsOptions = {}) {
  const { league = null, status = "live", limit = 20 } = options;

  return useInfiniteQuery({
    queryKey: ["lol-markets", league, status, limit],
    queryFn: async ({ pageParam = 0 }): Promise<LoLMarketsPage> => {
      let url = `/api/lol-markets?limit=${limit}&offset=${pageParam}&status=${status}`;
      if (league) url += `&league=${encodeURIComponent(league)}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch LoL markets");
      return response.json();
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextOffset : undefined,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}
