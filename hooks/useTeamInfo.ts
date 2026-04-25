import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

interface Player {
  id: number;
  name: string; // IGN
  firstName: string | null;
  lastName: string | null;
  role: string | null; // top, jun, mid, adc, sup
  imageUrl: string | null;
  nationality: string | null;
}

interface RecentMatch {
  id: number;
  scheduledAt: string;
  status: string;
  matchType: string;
  numberOfGames: number;
  winnerId: number | null;
  opponents: {
    id: number;
    name: string;
    acronym: string;
    imageUrl: string | null;
  }[];
  results: { teamId: number; score: number }[];
  league: { name: string; imageUrl: string | null } | null;
}

interface RecentForm {
  wins: number;
  losses: number;
  total: number;
  winrate: number;
  form: ("W" | "L")[];
}

export interface TeamInfoData {
  team: {
    id: number;
    name: string;
    acronym: string;
    imageUrl: string | null;
    location: string | null;
  } | null;
  players: Player[];
  recentMatches: RecentMatch[];
  recentForm: RecentForm;
  error?: string;
}

async function fetchTeamInfo(teamName: string): Promise<TeamInfoData> {
  const res = await fetch(
    `/api/team-info?team=${encodeURIComponent(teamName)}`
  );
  if (!res.ok) throw new Error("Failed to fetch team info");
  return res.json();
}

export function usePrefetchTeamInfo(teamName: string | null) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!teamName) return;
    queryClient.prefetchQuery({
      queryKey: ["team-info", teamName],
      queryFn: () => fetchTeamInfo(teamName),
      staleTime: 6 * 60 * 60 * 1000,
    });
  }, [teamName, queryClient]);
}

export default function useTeamInfo(
  teamName: string | null,
  enabled: boolean
) {
  return useQuery<TeamInfoData>({
    queryKey: ["team-info", teamName],
    queryFn: () => fetchTeamInfo(teamName!),
    enabled: enabled && !!teamName,
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
