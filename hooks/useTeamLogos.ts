import { useQuery } from "@tanstack/react-query";

export default function useTeamLogos(teamNames: string[]) {
  const uniqueTeams = [...new Set(teamNames.filter(Boolean))];

  return useQuery({
    queryKey: ["team-logos", uniqueTeams.sort().join(",")],
    queryFn: async (): Promise<Record<string, string | null>> => {
      if (uniqueTeams.length === 0) return {};

      const response = await fetch("/api/team-logos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teams: uniqueTeams }),
      });

      if (!response.ok) return {};
      return response.json();
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    enabled: uniqueTeams.length > 0,
  });
}
