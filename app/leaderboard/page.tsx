"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import useLeaderboard, { type LeaderboardTrader } from "@/hooks/useLeaderboard";
import { formatAddress } from "@/utils/formatting";
import LoadingState from "@/components/shared/LoadingState";
import ErrorState from "@/components/shared/ErrorState";
import WalletAvatar from "@/components/shared/WalletAvatar";
import { POLYMARKET_PROFILE_URL } from "@/constants/api";

type Category = "volume" | "profit" | "winrate" | "loss" | "activity";

const CATEGORIES: { value: Category; label: string; description: string }[] = [
  { value: "volume", label: "Volume", description: "By total holdings" },
  { value: "profit", label: "Top Profit", description: "By realized PnL" },
  { value: "winrate", label: "Win Rate", description: "By win percentage" },
  { value: "loss", label: "Top Loss", description: "By biggest losses" },
  { value: "activity", label: "Most Active", description: "By number of bets" },
];

function formatAmount(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toFixed(0)}`;
}

function formatPnl(amount: number): string {
  const prefix = amount >= 0 ? "+" : "";
  return `${prefix}${formatAmount(amount)}`;
}

function getMetricValue(trader: LeaderboardTrader, category: Category): number {
  const wr = trader.winrate;
  switch (category) {
    case "volume": return trader.totalAmount;
    case "profit": return wr?.totalRealizedPnl ?? 0;
    case "winrate": return wr?.winrate ?? -1;
    case "loss": return wr?.totalRealizedPnl ?? 0;
    case "activity": return wr?.totalResolved ?? 0;
  }
}

function formatMetric(value: number, category: Category): string {
  switch (category) {
    case "volume": return formatAmount(value);
    case "profit": return formatPnl(value);
    case "winrate": return value >= 0 ? `${value.toFixed(0)}%` : "--";
    case "loss": return formatPnl(value);
    case "activity": return `${value} bets`;
  }
}

function metricColor(value: number, category: Category): string {
  switch (category) {
    case "profit": return value > 0 ? "text-green-400" : value < 0 ? "text-red-400" : "text-white/40";
    case "winrate": return value >= 55 ? "text-green-400" : value >= 45 ? "text-amber-400" : value >= 0 ? "text-red-400" : "text-white/20";
    case "loss": return "text-red-400";
    default: return "text-white/70";
  }
}

function sortTraders(traders: LeaderboardTrader[], category: Category): LeaderboardTrader[] {
  return [...traders].sort((a, b) => {
    const aVal = getMetricValue(a, category);
    const bVal = getMetricValue(b, category);
    if (category === "loss") return aVal - bVal; // most negative first
    return bVal - aVal; // highest first
  }).filter((t) => {
    // Filter out irrelevant traders per category
    const wr = t.winrate;
    if (category === "profit") return wr && wr.totalRealizedPnl > 0;
    if (category === "winrate") return wr && wr.winrate !== null && wr.totalResolved >= 3;
    if (category === "loss") return wr && wr.totalRealizedPnl < 0;
    if (category === "activity") return wr && wr.totalResolved > 0;
    return true;
  });
}

function TraderHoverCard({ trader, visible }: { trader: LeaderboardTrader; visible: boolean }) {
  const wr = trader.winrate;
  const hasWinrate = wr && wr.winrate !== null;
  const winPct = hasWinrate ? wr.winrate! : 0;

  return (
    <div className={`absolute left-14 top-full mt-1 z-50 w-72 glass p-4 shadow-xl shadow-black/40 transition-all duration-200 ${
      visible
        ? "opacity-100 pointer-events-auto translate-y-0"
        : "opacity-0 pointer-events-none translate-y-1"
    }`}>
      {/* Header: avatar + name */}
      <a
        href={POLYMARKET_PROFILE_URL(trader.proxyWallet)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 mb-4 hover:opacity-80 transition-opacity"
      >
        <WalletAvatar
          address={trader.proxyWallet}
          name={trader.displayUsernamePublic && trader.name ? trader.name : trader.pseudonym}
          imageUrl={trader.profileImageOptimized || trader.profileImage || null}
          size="md"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white/90 truncate hover:text-purple-400 transition-colors">
            {trader.displayUsernamePublic && trader.name
              ? trader.name
              : trader.pseudonym || formatAddress(trader.proxyWallet)}
          </p>
          <p className="text-[10px] text-white/25 font-data truncate">
            {formatAddress(trader.proxyWallet, 8, 6)}
          </p>
        </div>
      </a>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* Winrate */}
        <div className="text-center">
          <p className="text-[9px] uppercase tracking-wider text-white/25 mb-1">Winrate</p>
          {hasWinrate ? (
            <p className={`text-lg font-bold font-data ${
              winPct >= 55 ? "text-green-400" : winPct >= 45 ? "text-amber-400" : "text-red-400"
            }`}>
              {winPct.toFixed(0)}<span className="text-xs opacity-50">%</span>
            </p>
          ) : (
            <p className="text-sm text-white/15">--</p>
          )}
        </div>

        {/* Record */}
        <div className="text-center">
          <p className="text-[9px] uppercase tracking-wider text-white/25 mb-1">Record</p>
          {hasWinrate ? (
            <p className="text-sm font-data">
              <span className="text-green-400 font-bold">{wr!.wins}</span>
              <span className="text-white/15 mx-0.5">-</span>
              <span className="text-red-400 font-bold">{wr!.losses}</span>
            </p>
          ) : (
            <p className="text-sm text-white/15">--</p>
          )}
        </div>

        {/* PnL */}
        <div className="text-center">
          <p className="text-[9px] uppercase tracking-wider text-white/25 mb-1">PnL</p>
          {wr && wr.totalRealizedPnl !== 0 ? (
            <p className={`text-sm font-bold font-data ${
              wr.totalRealizedPnl > 0 ? "text-green-400" : "text-red-400"
            }`}>
              {wr.totalRealizedPnl > 0 ? "+" : ""}{formatAmount(wr.totalRealizedPnl)}
            </p>
          ) : (
            <p className="text-sm text-white/15">--</p>
          )}
        </div>
      </div>

      {/* Winrate bar */}
      {hasWinrate && wr!.totalResolved > 0 && (
        <div className="mb-4">
          <div className="h-1.5 rounded-full overflow-hidden flex bg-white/5">
            <div
              className="bg-green-500/60 rounded-l-full transition-all duration-500"
              style={{ width: `${winPct}%` }}
            />
            <div
              className="bg-red-500/60 rounded-r-full transition-all duration-500"
              style={{ width: `${100 - winPct}%` }}
            />
          </div>
          <p className="text-[9px] text-white/15 text-center mt-1 font-data">
            {wr!.totalResolved} resolved bet{wr!.totalResolved !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Active positions */}
      {trader.positions.length > 0 && (
        <div>
          <p className="text-[9px] uppercase tracking-wider text-white/25 mb-2">
            Active Positions
          </p>
          <div className="space-y-1.5">
            {trader.positions.slice(0, 5).map((pos, i) => {
              const titleMatch = pos.eventTitle.match(
                /^LoL:\s*(.+?)\s+vs\s+(.+?)\s*\(BO\d+\)/
              );
              const shortTitle = titleMatch
                ? `${titleMatch[1].trim()} vs ${titleMatch[2].trim()}`
                : pos.eventTitle;

              return (
                <div key={i} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-white/30 truncate">{shortTitle}</span>
                    <span className={`font-semibold shrink-0 ${
                      pos.outcome === titleMatch?.[1]?.trim()
                        ? "text-green-400/80"
                        : "text-red-400/80"
                    }`}>
                      {pos.outcome}
                    </span>
                  </div>
                  <span className="font-data text-white/35 shrink-0 ml-2">
                    {formatAmount(pos.amount)}
                  </span>
                </div>
              );
            })}
            {trader.positions.length > 5 && (
              <p className="text-[10px] text-white/15 text-center">
                +{trader.positions.length - 5} more
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TraderRow({
  trader,
  rank,
  category,
  maxMetric,
}: {
  trader: LeaderboardTrader;
  rank: number;
  category: Category;
  maxMetric: number;
}) {
  const displayName =
    trader.displayUsernamePublic && trader.name
      ? trader.name
      : trader.pseudonym || formatAddress(trader.proxyWallet);

  const metric = getMetricValue(trader, category);
  const absMetric = Math.abs(metric);
  const absMax = Math.abs(maxMetric);
  const barWidth = absMax > 0 ? Math.max((absMetric / absMax) * 100, 3) : 0;

  const rankBadge =
    rank === 1
      ? "text-amber-400"
      : rank === 2
        ? "text-gray-300"
        : rank === 3
          ? "text-amber-600"
          : "text-white/20";

  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative cursor-default">
        {/* Background bar */}
        <div
          className={`absolute inset-y-0 left-0 rounded-xl transition-all duration-300 ${
            hovered ? "bg-purple-500/12" : "bg-purple-500/8"
          }`}
          style={{ width: `${barWidth}%` }}
        />

        {/* Content */}
        <div className="relative flex items-center justify-between py-3 px-4 rounded-xl">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`text-sm font-bold font-data w-7 shrink-0 ${rankBadge}`}>
              {rank}
            </span>
            <a
              href={POLYMARKET_PROFILE_URL(trader.proxyWallet)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <WalletAvatar
                address={trader.proxyWallet}
                name={displayName}
                imageUrl={trader.profileImageOptimized || trader.profileImage || null}
                size="sm"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-white/80 truncate hover:text-purple-400 transition-colors">
                  {displayName}
                </p>
                <p className="text-[10px] text-white/20">
                  {trader.marketCount} market{trader.marketCount !== 1 ? "s" : ""}
                </p>
              </div>
            </a>
          </div>

          <span className={`text-sm font-bold font-data shrink-0 ml-3 ${metricColor(metric, category)}`}>
            {formatMetric(metric, category)}
          </span>
        </div>
      </div>

      {/* Hover card */}
      <TraderHoverCard trader={trader} visible={hovered} />
    </div>
  );
}

export default function LeaderboardPage() {
  const { data, isLoading, error } = useLeaderboard(50);
  const [category, setCategory] = useState<Category>("volume");

  const allTraders = data?.traders || [];
  const totalMarkets = data?.totalMarkets || 0;

  const sorted = useMemo(() => sortTraders(allTraders, category), [allTraders, category]);
  const maxMetric = sorted.length > 0 ? getMetricValue(sorted[0], category) : 0;

  const activeCategory = CATEGORIES.find((c) => c.value === category)!;

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link
                href="/"
                className="text-white/30 hover:text-white/50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-lg font-bold text-white/90">
                Leaderboard
              </h1>
            </div>
            <p className="text-xs text-white/25 ml-8">
              Top traders across {totalMarkets} active LoL market{totalMarkets !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1.5 flex-wrap mb-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
                category === cat.value
                  ? "bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30"
                  : "bg-white/5 text-white/35 hover:text-white/60 hover:bg-white/8"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading && <LoadingState message="Loading leaderboard..." />}

        {error && !isLoading && (
          <ErrorState error={error} title="Error loading leaderboard" />
        )}

        {!isLoading && !error && sorted.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-white/30">
              {allTraders.length === 0
                ? "No active LoL markets found"
                : `No traders match "${activeCategory.label}" criteria`}
            </p>
          </div>
        )}

        {!isLoading && !error && sorted.length > 0 && (
          <div className="space-y-1">
            {/* Column headers */}
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/20">
                Trader
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/20">
                {activeCategory.label}
              </span>
            </div>

            {sorted.map((trader, i) => (
              <TraderRow
                key={trader.proxyWallet}
                trader={trader}
                rank={i + 1}
                category={category}
                maxMetric={maxMetric}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
