import { useQuery } from "@tanstack/react-query";

export interface WinrateStats {
  wins: number;
  losses: number;
  totalResolved: number;
  winrate: number | null;
  totalRealizedPnl: number;
}

export interface LeaderboardTrader {
  proxyWallet: string;
  name: string;
  pseudonym: string;
  profileImage: string;
  profileImageOptimized: string;
  displayUsernamePublic: boolean;
  totalAmount: number;
  marketCount: number;
  positions: {
    eventTitle: string;
    outcome: string;
    amount: number;
  }[];
  winrate: WinrateStats | null;
}

interface LeaderboardResponse {
  traders: LeaderboardTrader[];
  totalMarkets: number;
}

export type Period = "1d" | "7d" | "30d" | "all";

export default function useLeaderboard(limit = 50, period: Period = "all") {
  return useQuery({
    queryKey: ["leaderboard", limit, period],
    queryFn: async (): Promise<LeaderboardResponse> => {
      const response = await fetch(`/api/leaderboard?limit=${limit}&period=${period}`);
      if (!response.ok) throw new Error("Failed to fetch leaderboard");
      return response.json();
    },
    staleTime: 120_000,
    refetchOnWindowFocus: true,
  });
}
