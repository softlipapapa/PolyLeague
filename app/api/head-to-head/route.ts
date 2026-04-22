import { NextRequest, NextResponse } from "next/server";

const PANDASCORE_BASE = "https://api.pandascore.co";

// Cache: "teamA-vs-teamB" -> { data, timestamp }
const h2hCache = new Map<string, { data: any; timestamp: number }>();
const teamIdCache = new Map<string, number | null>();

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const TEAM_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours for team ID lookups

async function pandaFetch(path: string, token: string) {
  const res = await fetch(`${PANDASCORE_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`PandaScore API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// Resolve team name to PandaScore team ID
async function resolveTeamId(
  name: string,
  token: string
): Promise<number | null> {
  const cacheKey = name.toLowerCase();
  const cached = teamIdCache.get(cacheKey);
  if (cached !== undefined) return cached;

  try {
    // Search LoL teams by name
    const teams = await pandaFetch(
      `/lol/teams?search[name]=${encodeURIComponent(name)}&per_page=5`,
      token
    );

    if (!Array.isArray(teams) || teams.length === 0) {
      teamIdCache.set(cacheKey, null);
      return null;
    }

    // Try exact match first, then closest match
    const exact = teams.find(
      (t: any) => t.name.toLowerCase() === name.toLowerCase()
    );
    const match = exact || teams[0];
    const id = match.id as number;

    teamIdCache.set(cacheKey, id);
    return id;
  } catch (err) {
    console.error(`Failed to resolve team: ${name}`, err);
    teamIdCache.set(cacheKey, null);
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

  const params = request.nextUrl.searchParams;
  const teamA = params.get("teamA");
  const teamB = params.get("teamB");

  if (!teamA || !teamB) {
    return NextResponse.json(
      { error: "teamA and teamB are required" },
      { status: 400 }
    );
  }

  // Check cache
  const cacheKey = [teamA, teamB].sort().join("-vs-").toLowerCase();
  const cached = h2hCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  try {
    // Resolve both team IDs in parallel
    const [teamAId, teamBId] = await Promise.all([
      resolveTeamId(teamA, token),
      resolveTeamId(teamB, token),
    ]);

    if (!teamAId || !teamBId) {
      const missing = !teamAId ? teamA : teamB;
      return NextResponse.json({
        matches: [],
        teamA: { name: teamA, id: teamAId },
        teamB: { name: teamB, id: teamBId },
        summary: null,
        error: `Team not found: ${missing}`,
      });
    }

    // Fetch past matches between the two teams
    const matches = await pandaFetch(
      `/lol/matches/past?filter[opponent_id]=${teamAId},${teamBId}&sort=-scheduled_at&per_page=20`,
      token
    );

    // Parse match results
    const parsedMatches = (Array.isArray(matches) ? matches : []).map(
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
          name: m.name,
          scheduledAt: m.scheduled_at,
          beginAt: m.begin_at,
          status: m.status,
          matchType: m.match_type,
          numberOfGames: m.number_of_games,
          winnerId: m.winner_id,
          opponents,
          results,
          league: m.league
            ? { id: m.league.id, name: m.league.name, imageUrl: m.league.image_url }
            : null,
          serie: m.serie
            ? { id: m.serie.id, fullName: m.serie.full_name }
            : null,
          tournament: m.tournament
            ? { id: m.tournament.id, name: m.tournament.name }
            : null,
        };
      }
    );

    // Build summary
    let teamAWins = 0;
    let teamBWins = 0;
    for (const match of parsedMatches) {
      if (match.winnerId === teamAId) teamAWins++;
      else if (match.winnerId === teamBId) teamBWins++;
    }

    const result = {
      matches: parsedMatches,
      teamA: { name: teamA, id: teamAId },
      teamB: { name: teamB, id: teamBId },
      summary: {
        totalMatches: parsedMatches.length,
        teamAWins,
        teamBWins,
        draws: parsedMatches.length - teamAWins - teamBWins,
      },
    };

    // Cache
    h2hCache.set(cacheKey, { data: result, timestamp: Date.now() });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Head-to-head API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch head-to-head data",
      },
      { status: 500 }
    );
  }
}
