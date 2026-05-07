import { NextRequest, NextResponse } from "next/server";
import { GAMMA_API_URL } from "@/constants/api";

const LOL_TAG_ID = 65; // "league of legends" tag
const PAGE_SIZE = 20;

const KNOWN_LEAGUES = [
  "LCK", "LPL", "LEC", "LCS", "LTA", "CBLOL", "LJL", "PCS", "VCS",
  "LFL", "TCL", "LLA", "LCL", "NACL", "LCK CL", "LDL",
] as const;

const TEAM_LEAGUE: Record<string, string> = {
  // LCK
  "T1": "LCK", "Gen.G": "LCK", "Hanwha Life Esports": "LCK", "Dplus KIA": "LCK",
  "KT Rolster": "LCK", "DRX": "LCK", "Kwangdong Freecs": "LCK", "Nongshim Red Force": "LCK",
  "BNK FEARX": "LCK", "BNK FearX": "LCK", "OKSavingsBank BRION": "LCK",
  "Ninjas in Pyjamas": "LCK", "FOX": "LCK", "ANC": "LCK", "NBS": "LCK",
  // LCK CL
  "T1 Academy": "LCK CL", "DRX Challengers": "LCK CL", "KT Rolster Challengers": "LCK CL",
  "BNK FearX Youth": "LCK CL",
  // LPL
  "JD Gaming": "LPL", "Top Esports": "LPL", "Bilibili Gaming": "LPL",
  "Weibo Gaming": "LPL", "LNG Esports": "LPL", "Invictus Gaming": "LPL",
  "Royal Never Give Up": "LPL", "OMG": "LPL", "Edward Gaming": "LPL",
  "FunPlus Phoenix": "LPL", "TES": "LPL", "AL": "LPL", "JDG": "LPL",
  "GAM Esports": "VCS", "MGN Vikings Esports": "VCS",
  "DNF.C": "LPL", "BFXY": "LPL", "TES.C": "LPL", "RG": "LPL", "MCN": "LPL",
  "FN": "LPL", "FSK": "LPL",
  // LEC
  "G2 Esports": "LEC", "Fnatic": "LEC", "GIANTX": "LEC", "Movistar KOI": "LEC",
  "Karmine Corp": "LEC", "SK Gaming": "LEC", "Team Vitality": "LEC",
  "Team BDS": "LEC", "Rogue": "LEC", "MAD Lions KOI": "LEC", "Movistar": "LEC",
  // LTA (Americas)
  "FlyQuest": "LTA", "100 Thieves": "LTA", "Cloud9": "LTA", "Team Liquid": "LTA",
  "NRG": "LTA", "Dignitas": "LTA", "Immortals": "LTA", "Shopify Rebellion": "LTA",
  "Vivo Keyd Stars": "LTA", "LOUD": "LTA", "paiN Gaming": "LTA",
  "FURIA": "LTA", "RED Canids": "LTA", "Isurus": "LTA", "Estral Esports": "LTA",
  // LFL / EMEA Masters
  "Gentle Mates": "LFL", "Karmine Corp Blue": "LFL", "Vitality.Bee": "LFL",
  "GIANTX PRIDE": "LFL", "Los Heretics": "LFL", "Barça eSports": "LFL",
  "Team Phantasma": "LFL", "Los Ratones": "LFL", "Forsaken": "LFL",
  "Verdant": "LFL", "ROSSMANN Centaurs": "LFL", "Odivelas Sports Club": "LFL",
  "Entropiq": "LFL", "Colossal Gaming": "LFL", "eSuba": "LFL",
  "Misa Esports": "LFL", "StormMedia Fajnie Mieć Skład": "LFL",
  "Zero Tenacity": "LFL", "Partizan Sangal": "LFL", "GnG Amazigh": "LFL",
  "Senshi Esports Club": "LFL", "Veni Vidi Vici": "LFL", "Galions": "LFL",
  "Galions Pearl": "LFL", "G2 HEL": "LFL", "Team Orange Gaming": "LFL",
  "Rich Gang": "LFL", "FlameHard": "LFL", "NightBirds": "LFL",
  "Geekay": "LFL", "SPIKE Syndicate": "LFL", "ULF Esports": "LFL",
  "Unicorns Of Love Sexy Edition": "LFL", "The Otter Side": "LFL",
  "Gamespace Mediterranean College Esports": "LFL", "Zena Esports": "LFL",
  "GMBLERS ESPORTS": "LFL", "Team Insidious": "LFL",
  "Berlin International Gaming": "LFL", "Bushido Wildcats": "LFL",
  // TCL
  "Beşiktaş Esports": "TCL", "ZennIT": "TCL",
  // Abbreviations that appear in short-form titles
  "USE": "LFL", "SPK": "LFL", "VITB": "LFL", "CZV": "LFL",
  "VVV": "LFL", "FLH": "LFL",
};

function cleanLeagueName(raw: string): string {
  return raw.replace(/\s*(Regular Season|Playoffs|Play-Ins?|Groups?|Finals?)\s*/gi, "").trim();
}

function inferLeagueFromTeams(teamA: string | null, teamB: string | null): string | null {
  if (teamA && TEAM_LEAGUE[teamA]) return TEAM_LEAGUE[teamA];
  if (teamB && TEAM_LEAGUE[teamB]) return TEAM_LEAGUE[teamB];
  return null;
}

function parseTitle(title: string): {
  teamA: string | null;
  teamB: string | null;
  bestOf: number | null;
  league: string | null;
} {
  // Format 1: "LoL: Team A vs Team B (BOx) - League Name"
  let m = title.match(/^LoL:\s*(.+?)\s+vs\.?\s+(.+?)\s*\(BO(\d+)\)\s*-\s*(.+)$/);
  if (m) {
    return { teamA: m[1].trim(), teamB: m[2].trim(), bestOf: parseInt(m[3]), league: cleanLeagueName(m[4]) };
  }

  // Format 2: "League: Team A vs. Team B" (e.g. "LEC: G2 Esports vs. GIANTX")
  const leaguePrefix = KNOWN_LEAGUES.join("|");
  m = title.match(new RegExp(`^(${leaguePrefix}):\\s*(.+?)\\s+vs\\.?\\s+(.+?)(?:\\s*\\(BO(\\d+)\\))?$`));
  if (m) {
    return { teamA: m[2].trim(), teamB: m[3].trim(), bestOf: m[4] ? parseInt(m[4]) : null, league: m[1].trim() };
  }

  // Format 3: "LoL: Team A vs Team B (BOx)" — no league
  m = title.match(/^LoL:\s*(.+?)\s+vs\.?\s+(.+?)\s*\(BO(\d+)\)$/);
  if (m) {
    const teamA = m[1].trim();
    const teamB = m[2].trim();
    return { teamA, teamB, bestOf: parseInt(m[3]), league: inferLeagueFromTeams(teamA, teamB) };
  }

  // Format 4: "LoL: Team A vs Team B" — no BO, no league
  m = title.match(/^LoL:\s*(.+?)\s+vs\.?\s+(.+?)$/);
  if (m) {
    const teamA = m[1].trim();
    const teamB = m[2].trim();
    return { teamA, teamB, bestOf: null, league: inferLeagueFromTeams(teamA, teamB) };
  }

  return { teamA: null, teamB: null, bestOf: null, league: null };
}

function parseEvent(event: any) {
  const markets = (event.markets || []).map((m: any) => ({
    id: m.id,
    question: m.question,
    slug: m.slug,
    outcomes: m.outcomes ? JSON.parse(m.outcomes) : [],
    outcomePrices: m.outcomePrices ? JSON.parse(m.outcomePrices) : [],
    clobTokenIds: m.clobTokenIds ? JSON.parse(m.clobTokenIds) : [],
    volume: parseFloat(m.volume || "0"),
    liquidity: parseFloat(m.liquidity || "0"),
    closed: m.closed,
    gameStartTime: m.gameStartTime,
    negRisk: m.negRisk || false,
    conditionId: m.conditionId,
    endDate: m.endDate,
    acceptingOrders: m.acceptingOrders,
    bestBid: m.bestBid,
    bestAsk: m.bestAsk,
    lastTradePrice: m.lastTradePrice,
    spread: m.spread,
  }));

  const { teamA, teamB, bestOf, league: parsedLeague } = parseTitle(event.title);

  // Find the main match winner market
  const mainMarket = markets.find(
    (m: any) =>
      m.outcomes.length === 2 &&
      !m.question.includes("Baron") &&
      !m.question.includes("Dragon") &&
      !m.question.includes("Inhibitor") &&
      !m.question.includes("Kill") &&
      !m.question.includes("Handicap") &&
      !m.question.includes("Total") &&
      !m.question.includes("First")
  );

  const gameStartTime = markets[0]?.gameStartTime || null;
  const now = new Date();
  const gameStart = gameStartTime ? new Date(gameStartTime) : null;

  // Check if main market is still accepting orders
  const isAcceptingOrders = mainMarket?.acceptingOrders !== false;

  // Check if outcome prices indicate a decided match (one side >= 95¢)
  const maxOutcomePrice = mainMarket
    ? Math.max(...mainMarket.outcomePrices.map((p: string) => parseFloat(p) || 0))
    : 0;
  const effectivelyDecided = maxOutcomePrice >= 1.0;

  let status: "live" | "upcoming" | "resolved" | "settling";
  if (event.closed) {
    status = "resolved";
  } else if (gameStart && now >= gameStart && (!isAcceptingOrders || effectivelyDecided)) {
    status = "settling";
  } else if (gameStart && now >= gameStart) {
    status = "live";
  } else {
    status = "upcoming";
  }

  // Determine winner for resolved matches
  let winner: string | null = null;
  if (status === "resolved" && mainMarket) {
    const winnerIdx = mainMarket.outcomePrices.indexOf("1");
    if (winnerIdx >= 0 && mainMarket.outcomes[winnerIdx]) {
      winner = mainMarket.outcomes[winnerIdx];
    }
  }

  return {
    id: event.id,
    title: event.title,
    slug: event.slug,
    ticker: event.ticker,
    image: event.image,
    icon: event.icon,
    startDate: event.startDate,
    endDate: event.endDate,
    closed: event.closed,
    volume: event.volume || 0,
    liquidity: event.liquidity || 0,
    league: parsedLeague,
    teamA,
    teamB,
    bestOf,
    mainMarket: mainMarket || null,
    markets,
    marketCount: markets.length,
    gameStartTime,
    status,
    winner,
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const offset = parseInt(searchParams.get("offset") || "0");
  const limit = parseInt(searchParams.get("limit") || String(PAGE_SIZE));
  const league = searchParams.get("league");
  const statusFilter = searchParams.get("status"); // "live", "upcoming", "all"

  try {
    // Fetch more than needed to account for filtering
    const fetchLimit = Math.max(limit * 3, 100);
    let url = `${GAMMA_API_URL}/events?tag_id=${LOL_TAG_ID}&limit=${fetchLimit}&offset=${offset}&order=startDate&ascending=false`;
    // Include closed events when requesting resolved matches
    if (statusFilter === "resolved") {
      url += "&closed=true";
    }

    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Gamma API error: ${response.status}`);
    }

    const events = await response.json();

    if (!Array.isArray(events)) {
      return NextResponse.json(
        { error: "Invalid API response" },
        { status: 500 }
      );
    }

    // Parse all events
    let lolEvents = events
      .filter((event: any) => !event.closed || statusFilter === "all" || statusFilter === "resolved")
      .map(parseEvent);

    // Filter by status
    if (statusFilter && statusFilter !== "all") {
      lolEvents = lolEvents.filter((e: any) => e.status === statusFilter);
    }

    // Sort upcoming by game start time ascending (soonest first)
    if (statusFilter === "upcoming") {
      lolEvents.sort((a: any, b: any) => {
        if (!a.gameStartTime) return 1;
        if (!b.gameStartTime) return -1;
        return new Date(a.gameStartTime).getTime() - new Date(b.gameStartTime).getTime();
      });
    }

    // Filter by league
    if (league) {
      lolEvents = lolEvents.filter(
        (e: any) => e.league && e.league.toLowerCase().includes(league.toLowerCase())
      );
    }

    // Extract leagues from all events (before pagination)
    const leagues = [
      ...new Set(lolEvents.map((e: any) => e.league).filter(Boolean)),
    ].sort();

    // Paginate
    const paginatedEvents = lolEvents.slice(0, limit);
    const hasMore = lolEvents.length > limit;

    return NextResponse.json({
      events: paginatedEvents,
      leagues,
      hasMore,
      nextOffset: offset + fetchLimit,
    });
  } catch (error) {
    console.error("Error fetching LoL markets:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch LoL markets",
      },
      { status: 500 }
    );
  }
}
