import { useQuery } from "@tanstack/react-query";

interface TeamInfo {
  name: string;
  id: number | null;
}

interface Opponent {
  id: number;
  name: string;
  acronym: string;
  imageUrl: string | null;
}

interface MatchResult {
  teamId: number;
  score: number;
}

export interface H2HMatch {
  id: number;
  name: string;
  scheduledAt: string;
  beginAt: string | null;
  status: string;
  matchType: string;
  numberOfGames: number;
  winnerId: number | null;
  opponents: Opponent[];
  results: MatchResult[];
  league: { id: number; name: string; imageUrl: string | null } | null;
  serie: { id: number; fullName: string } | null;
  tournament: { id: number; name: string } | null;
}

interface H2HSummary {
  totalMatches: number;
  teamAWins: number;
  teamBWins: number;
  draws: number;
}

export interface H2HData {
  matches: H2HMatch[];
  teamA: TeamInfo;
  teamB: TeamInfo;
  summary: H2HSummary | null;
  error?: string;
}

export default function useHeadToHead(
  teamA: string | null,
  teamB: string | null,
  enabled: boolean
) {
  return useQuery<H2HData>({
    queryKey: ["head-to-head", teamA, teamB],
    queryFn: async () => {
      const res = await fetch(
        `/api/head-to-head?teamA=${encodeURIComponent(teamA!)}&teamB=${encodeURIComponent(teamB!)}`
      );
      if (!res.ok) throw new Error("Failed to fetch head-to-head data");
      return res.json();
    },
    enabled: enabled && !!teamA && !!teamB,
    staleTime: 6 * 60 * 60 * 1000, // 6 hours — matches with same data
    gcTime: 60 * 60 * 1000,
  });
}
