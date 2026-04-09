import { NextRequest, NextResponse } from "next/server";
import { GAMMA_API_URL } from "@/constants/api";

const LOL_TAG_ID = 65; // "league of legends" tag

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get("limit") || "50");
  const includeResolved = searchParams.get("include_resolved") === "true";
  const league = searchParams.get("league"); // e.g. "LPL", "LCK", "LFL"

  try {
    const url = `${GAMMA_API_URL}/events?tag_id=${LOL_TAG_ID}&limit=${limit}&order=startDate&ascending=false`;

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

    // Parse LoL events into structured data
    const lolEvents = events
      .filter((event: any) => {
        if (!includeResolved && event.closed) return false;
        return true;
      })
      .map((event: any) => {
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

        const parsedLeague = titleMatch ? titleMatch[4].trim() : null;
        const teamA = titleMatch ? titleMatch[1].trim() : null;
        const teamB = titleMatch ? titleMatch[2].trim() : null;
        const bestOf = titleMatch ? parseInt(titleMatch[3]) : null;

        // Find the main match winner market (first market, usually has team names as outcomes)
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
          gameStartTime: markets[0]?.gameStartTime || null,
        };
      });

    // Filter by league if specified
    const filtered = league
      ? lolEvents.filter(
          (e: any) => e.league && e.league.toLowerCase().includes(league.toLowerCase())
        )
      : lolEvents;

    // Extract all unique leagues for the filter UI
    const leagues = [
      ...new Set(
        lolEvents
          .map((e: any) => e.league)
          .filter(Boolean)
      ),
    ].sort();

    return NextResponse.json({ events: filtered, leagues });
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
