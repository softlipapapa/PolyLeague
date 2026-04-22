import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

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

async function fetchH2H(teamA: string, teamB: string): Promise<H2HData> {
  const res = await fetch(
    `/api/head-to-head?teamA=${encodeURIComponent(teamA)}&teamB=${encodeURIComponent(teamB)}`
  );
  if (!res.ok) throw new Error("Failed to fetch head-to-head data");
  return res.json();
}

// Prefetch H2H data in the background when a card renders
export function usePrefetchHeadToHead(
  teamA: string | null,
  teamB: string | null
) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!teamA || !teamB) return;
    queryClient.prefetchQuery({
      queryKey: ["head-to-head", teamA, teamB],
      queryFn: () => fetchH2H(teamA, teamB),
      staleTime: 6 * 60 * 60 * 1000,
    });
  }, [teamA, teamB, queryClient]);
}

export default function useHeadToHead(
  teamA: string | null,
  teamB: string | null,
  enabled: boolean
) {
  return useQuery<H2HData>({
    queryKey: ["head-to-head", teamA, teamB],
    queryFn: () => fetchH2H(teamA!, teamB!),
    enabled: enabled && !!teamA && !!teamB,
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
