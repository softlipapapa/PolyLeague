import { NextResponse } from "next/server";

const LOL_ESPORTS_API = "https://esports-api.lolesports.com/persisted/gw/getTeams";
const API_KEY = "0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z";

// In-memory cache (refreshed every hour)
let cachedLogos: Record<string, string> = {};
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

async function fetchTeamLogos(): Promise<Record<string, string>> {
  const now = Date.now();
  if (Object.keys(cachedLogos).length > 0 && now - cacheTimestamp < CACHE_TTL) {
    return cachedLogos;
  }

  const response = await fetch(`${LOL_ESPORTS_API}?hl=en-US`, {
    headers: { "x-api-key": API_KEY },
  });

  if (!response.ok) {
    throw new Error(`LoL Esports API error: ${response.status}`);
  }

  const data = await response.json();
  const teams = data?.data?.teams || [];

  const logos: Record<string, string> = {};
  for (const team of teams) {
    if (!team.image) continue;
    // Store by normalized name and code
    logos[normalize(team.name)] = team.image;
    if (team.code) {
      logos[normalize(team.code)] = team.image;
    }
    // Also store by name without common suffixes
    const stripped = team.name
      .replace(/\s*(Esports|Gaming|eSports|esports|gaming)\s*$/i, "")
      .trim();
    if (stripped !== team.name) {
      logos[normalize(stripped)] = team.image;
    }
  }

  cachedLogos = logos;
  cacheTimestamp = now;
  return logos;
}

function findLogo(
  teamName: string,
  logos: Record<string, string>
): string | null {
  const normalized = normalize(teamName);

  // Direct match
  if (logos[normalized]) return logos[normalized];

  // Try without common suffixes/prefixes
  const stripped = teamName
    .replace(/\s*(Esports|Gaming|eSports|esports|gaming|FC|Team)\s*/gi, "")
    .trim();
  if (logos[normalize(stripped)]) return logos[normalize(stripped)];

  // Try partial match (team name contains or is contained in API name)
  for (const [key, url] of Object.entries(logos)) {
    if (key.includes(normalized) || normalized.includes(key)) {
      if (key.length > 2 && normalized.length > 2) {
        return url;
      }
    }
  }

  return null;
}

export async function GET() {
  try {
    const logos = await fetchTeamLogos();

    return NextResponse.json(logos, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error("Error fetching team logos:", error);
    return NextResponse.json({}, { status: 500 });
  }
}

// POST endpoint: resolve specific team names to logo URLs
export async function POST(request: Request) {
  try {
    const { teams } = await request.json();
    if (!Array.isArray(teams)) {
      return NextResponse.json({ error: "teams must be an array" }, { status: 400 });
    }

    const logos = await fetchTeamLogos();
    const result: Record<string, string | null> = {};

    for (const teamName of teams) {
      result[teamName] = findLogo(teamName, logos);
    }

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error("Error resolving team logos:", error);
    return NextResponse.json({}, { status: 500 });
  }
}
