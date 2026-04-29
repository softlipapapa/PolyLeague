import { NextResponse } from "next/server";

const LOL_ESPORTS_API = "https://esports-api.lolesports.com/persisted/gw";
const LOL_API_KEY = "0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z";
const PANDASCORE_BASE = "https://api.pandascore.co";

// Cache live streams for 2 minutes
let liveCache: { data: StreamData[]; timestamp: number } | null = null;
const LIVE_CACHE_TTL = 2 * 60 * 1000;

// Cache PandaScore streams for 5 minutes
let pandaCache: { data: StreamData[]; timestamp: number } | null = null;
const PANDA_CACHE_TTL = 5 * 60 * 1000;

export interface StreamData {
  teamA: string;
  teamB: string;
  league: string | null;
  streams: StreamLink[];
  source: "lolesports" | "pandascore" | "fallback";
}

export interface StreamLink {
  provider: "twitch" | "youtube";
  url: string;
  language: string;
  isMain: boolean;
}

// Static fallback channels for major leagues
const LEAGUE_CHANNELS: Record<string, StreamLink[]> = {
  LCK: [
    { provider: "twitch", url: "https://www.twitch.tv/lck", language: "en", isMain: true },
    { provider: "youtube", url: "https://www.youtube.com/@LCK", language: "ko", isMain: false },
  ],
  LPL: [
    { provider: "youtube", url: "https://www.youtube.com/@LPL", language: "en", isMain: true },
  ],
  LEC: [
    { provider: "twitch", url: "https://www.twitch.tv/lec", language: "en", isMain: true },
    { provider: "youtube", url: "https://www.youtube.com/@LEC", language: "en", isMain: false },
  ],
  LCS: [
    { provider: "twitch", url: "https://www.twitch.tv/lcs", language: "en", isMain: true },
  ],
  LTA: [
    { provider: "twitch", url: "https://www.twitch.tv/lta", language: "en", isMain: true },
  ],
  "LCK CL": [
    { provider: "twitch", url: "https://www.twitch.tv/lck", language: "en", isMain: true },
  ],
  LDL: [
    { provider: "youtube", url: "https://www.youtube.com/@LPL", language: "en", isMain: true },
  ],
  CBLOL: [
    { provider: "twitch", url: "https://www.twitch.tv/cblol", language: "pt", isMain: true },
  ],
  LJL: [
    { provider: "twitch", url: "https://www.twitch.tv/ljl", language: "ja", isMain: true },
  ],
  PCS: [
    { provider: "twitch", url: "https://www.twitch.tv/lolpacific", language: "en", isMain: true },
  ],
  VCS: [
    { provider: "youtube", url: "https://www.youtube.com/@VCS", language: "vi", isMain: true },
  ],
  LFL: [
    { provider: "twitch", url: "https://www.twitch.tv/otplol_", language: "fr", isMain: true },
  ],
  TCL: [
    { provider: "twitch", url: "https://www.twitch.tv/riotgamesturkish", language: "tr", isMain: true },
  ],
  LLA: [
    { provider: "twitch", url: "https://www.twitch.tv/lla", language: "es", isMain: true },
  ],
};

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

async function fetchLoLEsportsLive(): Promise<StreamData[]> {
  const now = Date.now();
  if (liveCache && now - liveCache.timestamp < LIVE_CACHE_TTL) {
    return liveCache.data;
  }

  try {
    const res = await fetch(`${LOL_ESPORTS_API}/getLive?hl=en-US`, {
      headers: { "x-api-key": LOL_API_KEY },
    });

    if (!res.ok) return [];

    const data = await res.json();
    const schedule = data?.data?.schedule;
    if (!schedule?.events) return [];

    const results: StreamData[] = [];

    for (const event of schedule.events) {
      if (event.type !== "match" || !event.match?.teams) continue;

      const teams = event.match.teams;
      if (teams.length < 2) continue;

      const teamA = teams[0].name;
      const teamB = teams[1].name;
      const league = event.league?.name || null;

      const streams: StreamLink[] = [];
      if (event.streams) {
        for (const stream of event.streams) {
          const provider = stream.provider as "twitch" | "youtube";
          if (provider !== "twitch" && provider !== "youtube") continue;

          let url: string;
          if (provider === "twitch") {
            url = `https://www.twitch.tv/${stream.parameter}`;
          } else {
            url = `https://www.youtube.com/watch?v=${stream.parameter}`;
          }

          const locale = stream.locale || "en-US";
          const lang = locale.split("-")[0];
          const isMain = lang === "en" || streams.length === 0;

          streams.push({ provider, url, language: lang, isMain });
        }
      }

      if (streams.length > 0) {
        // Mark the first English stream as main, or the first stream if no English
        const hasEnMain = streams.some((s) => s.language === "en" && s.isMain);
        if (!hasEnMain && streams.length > 0) {
          const enStream = streams.find((s) => s.language === "en");
          if (enStream) enStream.isMain = true;
          else streams[0].isMain = true;
        }

        results.push({ teamA, teamB, league, streams, source: "lolesports" });
      }
    }

    liveCache = { data: results, timestamp: now };
    return results;
  } catch (err) {
    console.error("LoL Esports getLive error:", err);
    return [];
  }
}

async function fetchPandaScoreStreams(): Promise<StreamData[]> {
  const token = process.env.PANDASCORE_API_KEY;
  if (!token) return [];

  const now = Date.now();
  if (pandaCache && now - pandaCache.timestamp < PANDA_CACHE_TTL) {
    return pandaCache.data;
  }

  try {
    const res = await fetch(
      `${PANDASCORE_BASE}/lol/matches/running?per_page=10`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) return [];
    const matches = await res.json();
    if (!Array.isArray(matches)) return [];

    const results: StreamData[] = [];

    for (const match of matches) {
      const opponents = match.opponents || [];
      if (opponents.length < 2) continue;

      const teamA = opponents[0]?.opponent?.name;
      const teamB = opponents[1]?.opponent?.name;
      const league = match.league?.name || null;

      const streamsList = match.streams_list || [];
      const streams: StreamLink[] = [];

      for (const s of streamsList) {
        const rawUrl: string = s.raw_url || "";
        let provider: "twitch" | "youtube";
        if (rawUrl.includes("twitch.tv")) provider = "twitch";
        else if (rawUrl.includes("youtube.com") || rawUrl.includes("youtu.be")) provider = "youtube";
        else continue;

        streams.push({
          provider,
          url: rawUrl,
          language: s.language || "en",
          isMain: s.main === true || s.official === true,
        });
      }

      if (streams.length > 0 && teamA && teamB) {
        results.push({ teamA, teamB, league, streams, source: "pandascore" });
      }
    }

    pandaCache = { data: results, timestamp: now };
    return results;
  } catch (err) {
    console.error("PandaScore streams error:", err);
    return [];
  }
}

export async function GET() {
  try {
    // Fetch from both sources in parallel
    const [lolEsportsStreams, pandaStreams] = await Promise.all([
      fetchLoLEsportsLive(),
      fetchPandaScoreStreams(),
    ]);

    // Merge: LoL Esports is primary, PandaScore fills gaps
    const merged = new Map<string, StreamData>();

    for (const stream of lolEsportsStreams) {
      const key = `${normalize(stream.teamA)}-${normalize(stream.teamB)}`;
      const keyReverse = `${normalize(stream.teamB)}-${normalize(stream.teamA)}`;
      merged.set(key, stream);
      merged.set(keyReverse, stream);
    }

    for (const stream of pandaStreams) {
      const key = `${normalize(stream.teamA)}-${normalize(stream.teamB)}`;
      const keyReverse = `${normalize(stream.teamB)}-${normalize(stream.teamA)}`;
      if (!merged.has(key) && !merged.has(keyReverse)) {
        merged.set(key, stream);
        merged.set(keyReverse, stream);
      }
    }

    // Deduplicate (both key orders point to same object)
    const unique = [...new Set(merged.values())];

    return NextResponse.json({
      streams: unique,
      leagueChannels: LEAGUE_CHANNELS,
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Stream links error:", error);
    return NextResponse.json({ streams: [], leagueChannels: LEAGUE_CHANNELS });
  }
}
