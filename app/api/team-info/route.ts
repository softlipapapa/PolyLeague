import { NextRequest, NextResponse } from "next/server";

const PANDASCORE_BASE = "https://api.pandascore.co";

// Cache: teamName -> { data, timestamp }
const teamInfoCache = new Map<string, { data: any; timestamp: number }>();
// Cache: teamName -> full team object from search (includes players)
const teamSearchCache = new Map<string, any | null>();

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function pandaFetch(path: string, token: string) {
  const res = await fetch(`${PANDASCORE_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`PandaScore API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// Resolve team name to full PandaScore team object (search results include players)
async function resolveTeam(
  name: string,
  token: string
): Promise<any | null> {
  const cacheKey = name.toLowerCase();
  const cached = teamSearchCache.get(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const teams = await pandaFetch(
      `/lol/teams?search[name]=${encodeURIComponent(name)}&per_page=5`,
      token
    );

    if (!Array.isArray(teams) || teams.length === 0) {
      teamSearchCache.set(cacheKey, null);
      return null;
    }

    const exact = teams.find(
      (t: any) => t.name.toLowerCase() === name.toLowerCase()
    );
    const match = exact || teams[0];
    teamSearchCache.set(cacheKey, match);
    return match;
  } catch (err) {
    console.error(`Failed to resolve team: ${name}`, err);
    teamSearchCache.set(cacheKey, null);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const token = process.env.PANDASCORE_API_KEY;
  if (!token) {
    return NextResponse.json(
      { error: "PANDASCORE_API_KEY not configured" },
      { status: 500 }
    );
  }

  const teamName = request.nextUrl.searchParams.get("team");
  if (!teamName) {
    return NextResponse.json(
      { error: "team parameter is required" },
      { status: 400 }
    );
  }

  // Check cache
  const cacheKey = teamName.toLowerCase();
  const cached = teamInfoCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  try {
    const teamDetail = await resolveTeam(teamName, token);
    if (!teamDetail) {
      return NextResponse.json({
        team: null,
        error: `Team not found: ${teamName}`,
      });
    }

    const teamId = teamDetail.id;

    // Fetch recent matches (team detail from search already has players)
    const recentMatches = await pandaFetch(
      `/lol/matches/past?filter[opponent_id]=${teamId}&sort=-scheduled_at&per_page=10`,
      token
    );

    // Parse players from team search result
    const players = (teamDetail.players || []).map((p: any) => ({
      id: p.id,
      name: p.name, // in-game name
      firstName: p.first_name,
      lastName: p.last_name,
      role: p.role, // top, jun, mid, adc, sup
      imageUrl: p.image_url,
      nationality: p.nationality,
    }));

    // Parse recent matches
    const matches = (Array.isArray(recentMatches) ? recentMatches : []).map(
      (m: any) => {
        const opponents = (m.opponents || []).map((o: any) => ({
          id: o.opponent?.id,
          name: o.opponent?.name,
          acronym: o.opponent?.acronym,
          imageUrl: o.opponent?.image_url,
        }));

        const results = (m.results || []).map((r: any) => ({
          teamId: r.team_id,
          score: r.score,
        }));

        return {
          id: m.id,
          scheduledAt: m.scheduled_at,
          status: m.status,
          matchType: m.match_type,
          numberOfGames: m.number_of_games,
          winnerId: m.winner_id,
          opponents,
          results,
          league: m.league
            ? { name: m.league.name, imageUrl: m.league.image_url }
            : null,
        };
      }
    );

    // Calculate recent form (W/L from last 10)
    let wins = 0;
    let losses = 0;
    const form: ("W" | "L")[] = [];
    for (const match of matches) {
      if (match.winnerId === teamId) {
        wins++;
        form.push("W");
      } else if (match.winnerId) {
        losses++;
        form.push("L");
      }
    }

    const result = {
      team: {
        id: teamDetail.id,
        name: teamDetail.name,
        acronym: teamDetail.acronym,
        imageUrl: teamDetail.image_url,
        location: teamDetail.location,
      },
      players,
      recentMatches: matches,
      recentForm: {
        wins,
        losses,
        total: wins + losses,
        winrate: wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0,
        form, // e.g. ["W", "L", "W", "W", ...]
      },
    };

    teamInfoCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Team info API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch team info",
      },
      { status: 500 }
    );
  }
}
