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

export default function useLeaderboard(limit = 50) {
  return useQuery({
    queryKey: ["leaderboard", limit],
    queryFn: async (): Promise<LeaderboardResponse> => {
      const response = await fetch(`/api/leaderboard?limit=${limit}`);
      if (!response.ok) throw new Error("Failed to fetch leaderboard");
      return response.json();
    },
    staleTime: 120_000,
    refetchOnWindowFocus: true,
  });
}
