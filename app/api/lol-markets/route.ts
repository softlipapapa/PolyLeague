import { NextRequest, NextResponse } from "next/server";
import { GAMMA_API_URL } from "@/constants/api";

const LOL_TAG_ID = 65; // "league of legends" tag
const PAGE_SIZE = 20;

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

  // Extract league from title: "LoL: Team A vs Team B (BOx) - League Name"
  const titleMatch = event.title.match(
    /^LoL:\s*(.+?)\s+vs\s+(.+?)\s*\(BO(\d+)\)\s*-\s*(.+)$/
  );

  const rawLeague = titleMatch ? titleMatch[4].trim() : null;
  const parsedLeague = rawLeague
    ? rawLeague.replace(/\s*(Regular Season|Playoffs|Play-Ins?|Groups?|Finals?)\s*/gi, "").trim() || rawLeague
    : null;
  const teamA = titleMatch ? titleMatch[1].trim() : null;
  const teamB = titleMatch ? titleMatch[2].trim() : null;
  const bestOf = titleMatch ? parseInt(titleMatch[3]) : null;

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

  let status: "live" | "upcoming" | "resolved";
  if (event.closed) {
    status = "resolved";
  } else if (gameStart && now >= gameStart) {
    status = "live";
  } else {
    status = "upcoming";
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
    const url = `${GAMMA_API_URL}/events?tag_id=${LOL_TAG_ID}&limit=${fetchLimit}&offset=${offset}&order=startDate&ascending=false`;

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
      .filter((event: any) => !event.closed || statusFilter === "all")
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
