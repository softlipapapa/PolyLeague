import { NextRequest, NextResponse } from "next/server";
import { GAMMA_API_URL } from "@/constants/api";

const DATA_API_URL = "https://data-api.polymarket.com";
const LOL_TAG_ID = 65;

interface WinrateStats {
  wins: number;
  losses: number;
  totalResolved: number;
  winrate: number | null; // null if no resolved positions
  totalRealizedPnl: number;
}

interface HolderEntry {
  proxyWallet: string;
  name: string;
  pseudonym: string;
  profileImage: string;
  profileImageOptimized: string;
  displayUsernamePublic: boolean;
  // Aggregated stats
  totalAmount: number;
  marketCount: number;
  positions: {
    eventTitle: string;
    outcome: string;
    amount: number;
  }[];
  // Lifetime LoL winrate (added after aggregation)
  winrate?: WinrateStats | null;
}

function getPeriodCutoff(period: string): number | null {
  const now = Date.now();
  switch (period) {
    case "1d": return now - 24 * 60 * 60 * 1000;
    case "7d": return now - 7 * 24 * 60 * 60 * 1000;
    case "30d": return now - 30 * 24 * 60 * 60 * 1000;
    default: return null; // "all"
  }
}

async function fetchWinrate(proxyWallet: string, cutoffMs: number | null): Promise<WinrateStats> {
  try {
    // Fetch closed LoL positions for this trader (up to 100)
    const url = `${DATA_API_URL}/closed-positions?user=${proxyWallet}&title=LoL&limit=100&sortBy=TIMESTAMP&sortDirection=DESC`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      return { wins: 0, losses: 0, totalResolved: 0, winrate: null, totalRealizedPnl: 0 };
    }

    const positions = await res.json();

    if (!Array.isArray(positions) || positions.length === 0) {
      return { wins: 0, losses: 0, totalResolved: 0, winrate: null, totalRealizedPnl: 0 };
    }

    let wins = 0;
    let losses = 0;
    let totalRealizedPnl = 0;

    for (const pos of positions) {
      // Filter by time period if set
      if (cutoffMs) {
        const posTime = pos.resolvedAt ? new Date(pos.resolvedAt).getTime()
          : pos.createdAt ? new Date(pos.createdAt).getTime() : 0;
        if (posTime < cutoffMs) continue;
      }

      totalRealizedPnl += pos.realizedPnl || 0;
      if (pos.realizedPnl > 0) {
        wins++;
      } else if (pos.realizedPnl < 0) {
        losses++;
      }
    }

    const totalResolved = wins + losses;
    return {
      wins,
      losses,
      totalResolved,
      winrate: totalResolved > 0 ? (wins / totalResolved) * 100 : null,
      totalRealizedPnl,
    };
  } catch {
    return { wins: 0, losses: 0, totalResolved: 0, winrate: null, totalRealizedPnl: 0 };
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get("limit") || "50");
  const period = searchParams.get("period") || "all";
  const cutoffMs = getPeriodCutoff(period);

  try {
    // 1. Fetch active LoL events from Gamma API
    const eventsUrl = `${GAMMA_API_URL}/events?tag_id=${LOL_TAG_ID}&limit=50&order=startDate&ascending=false`;
    const eventsRes = await fetch(eventsUrl, {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 120 },
    });

    if (!eventsRes.ok) throw new Error(`Gamma API error: ${eventsRes.status}`);
    const events = await eventsRes.json();

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ traders: [], totalMarkets: 0 });
    }

    // 2. Collect conditionIds from active (non-closed) events
    const marketMeta: { conditionId: string; title: string; outcomes: string[] }[] = [];
    for (const event of events) {
      if (event.closed) continue;
      for (const market of event.markets || []) {
        if (market.conditionId && market.outcomes) {
          const outcomes = typeof market.outcomes === "string"
            ? JSON.parse(market.outcomes)
            : market.outcomes;
          // Only main match-winner markets (2 outcomes, no props)
          if (
            outcomes.length === 2 &&
            !market.question?.includes("Baron") &&
            !market.question?.includes("Dragon") &&
            !market.question?.includes("Handicap") &&
            !market.question?.includes("Total") &&
            !market.question?.includes("First") &&
            !market.question?.includes("Kill") &&
            !market.question?.includes("Inhibitor")
          ) {
            marketMeta.push({
              conditionId: market.conditionId,
              title: event.title,
              outcomes,
            });
          }
        }
      }
    }

    if (marketMeta.length === 0) {
      return NextResponse.json({ traders: [], totalMarkets: 0 });
    }

    // 3. Fetch holders in batches to avoid 414 URI Too Long
    const BATCH_SIZE = 10;
    const holdersData: any[] = [];

    for (let i = 0; i < marketMeta.length; i += BATCH_SIZE) {
      const batch = marketMeta.slice(i, i + BATCH_SIZE);
      const conditionIds = batch.map((m) => m.conditionId).join(",");
      const holdersUrl = `${DATA_API_URL}/holders?market=${encodeURIComponent(conditionIds)}&limit=20&minBalance=1`;

      const holdersRes = await fetch(holdersUrl, {
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 120 },
      });

      if (!holdersRes.ok) {
        console.warn(`Data API batch error: ${holdersRes.status}, skipping batch ${i}`);
        continue;
      }

      const batchData = await holdersRes.json();
      if (Array.isArray(batchData)) {
        holdersData.push(...batchData);
      }
    }

    // 4. Aggregate by trader across all markets
    const traderMap = new Map<string, HolderEntry>();

    {
      for (const tokenGroup of holdersData) {
        for (const holder of tokenGroup.holders || []) {
          const key = holder.proxyWallet;
          const existing = traderMap.get(key);

          // Try to find which market this belongs to by matching conditionId
          const meta = marketMeta.find((m) =>
            holdersData.some(
              (tg: any) =>
                tg.holders?.some((h: any) => h.proxyWallet === key) &&
                tg.token
            )
          );
          const eventTitle = meta?.title || "Unknown";
          const outcome =
            meta?.outcomes[holder.outcomeIndex] ||
            `Outcome ${holder.outcomeIndex}`;

          if (existing) {
            existing.totalAmount += holder.amount;
            existing.marketCount += 1;
            existing.positions.push({
              eventTitle,
              outcome,
              amount: holder.amount,
            });
          } else {
            traderMap.set(key, {
              proxyWallet: holder.proxyWallet,
              name: holder.name || "",
              pseudonym: holder.pseudonym || "",
              profileImage: holder.profileImage || "",
              profileImageOptimized: holder.profileImageOptimized || "",
              displayUsernamePublic: holder.displayUsernamePublic || false,
              totalAmount: holder.amount,
              marketCount: 1,
              positions: [{ eventTitle, outcome, amount: holder.amount }],
            });
          }
        }
      }
    }

    // 5. Sort by total amount and take top N
    const topTraders = Array.from(traderMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, limit);

    // 6. Fetch winrates for all top traders in parallel
    const winrateResults = await Promise.all(
      topTraders.map((t) => fetchWinrate(t.proxyWallet, cutoffMs))
    );

    const traders = topTraders.map((t, i) => ({
      ...t,
      winrate: winrateResults[i],
    }));

    return NextResponse.json({
      traders,
      totalMarkets: marketMeta.length,
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch leaderboard",
      },
      { status: 500 }
    );
  }
}
