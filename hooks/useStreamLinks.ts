import { useQuery } from "@tanstack/react-query";
import type { StreamData, StreamLink } from "@/app/api/stream-links/route";

interface StreamLinksResponse {
  streams: StreamData[];
  leagueChannels: Record<string, StreamLink[]>;
}

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

export default function useStreamLinks() {
  const { data } = useQuery<StreamLinksResponse>({
    queryKey: ["stream-links"],
    queryFn: async () => {
      const res = await fetch("/api/stream-links");
      if (!res.ok) throw new Error("Failed to fetch stream links");
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const getStreamForMatch = (
    teamA: string | null,
    teamB: string | null,
    league: string | null,
    status: string
  ): StreamLink | null => {
    if (!teamA || !teamB) return null;
    if (status === "resolved") return null;

    // Try live stream data first
    if (data?.streams) {
      const normA = normalize(teamA);
      const normB = normalize(teamB);

      for (const s of data.streams) {
        const sA = normalize(s.teamA);
        const sB = normalize(s.teamB);
        if (
          (sA.includes(normA) || normA.includes(sA)) &&
          (sB.includes(normB) || normB.includes(sB))
        ) {
          const mainStream = s.streams.find((l) => l.isMain && l.language === "en")
            || s.streams.find((l) => l.isMain)
            || s.streams.find((l) => l.language === "en")
            || s.streams[0];
          if (mainStream) return mainStream;
        }
        // Try reversed order
        if (
          (sA.includes(normB) || normB.includes(sA)) &&
          (sB.includes(normA) || normA.includes(sB))
        ) {
          const mainStream = s.streams.find((l) => l.isMain && l.language === "en")
            || s.streams.find((l) => l.isMain)
            || s.streams.find((l) => l.language === "en")
            || s.streams[0];
          if (mainStream) return mainStream;
        }
      }
    }

    // Fallback to static league channels
    if (league && data?.leagueChannels) {
      const normalizedLeague = league.toUpperCase().trim();
      const channels = data.leagueChannels[normalizedLeague];
      if (channels?.length) {
        return channels.find((c) => c.isMain) || channels[0];
      }
      // Partial match: "LCK Challengers" → "LCK"
      const prefix = Object.keys(data.leagueChannels).find(
        (key) => normalizedLeague.startsWith(key) || key.startsWith(normalizedLeague)
      );
      if (prefix) {
        const fallback = data.leagueChannels[prefix];
        if (fallback?.length) return fallback.find((c) => c.isMain) || fallback[0];
      }
    }

    // Last resort for matches with no league info at all
    return {
      provider: "twitch" as const,
      url: "https://www.twitch.tv/riotgames",
      language: "en",
      isMain: true,
    };
  };

  return { getStreamForMatch };
}
