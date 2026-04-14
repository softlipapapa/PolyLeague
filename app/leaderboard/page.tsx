"use client";

import { useState } from "react";
import Link from "next/link";
import useLeaderboard, { type LeaderboardTrader } from "@/hooks/useLeaderboard";
import { formatAddress } from "@/utils/formatting";
import LoadingState from "@/components/shared/LoadingState";
import ErrorState from "@/components/shared/ErrorState";

function formatAmount(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toFixed(0)}`;
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
      <div className="flex items-center gap-3 mb-4">
        {trader.profileImageOptimized || trader.profileImage ? (
          <img
            src={trader.profileImageOptimized || trader.profileImage}
            alt=""
            className="w-10 h-10 rounded-full shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-white/5 shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white/90 truncate">
            {trader.displayUsernamePublic && trader.name
              ? trader.name
              : trader.pseudonym || formatAddress(trader.proxyWallet)}
          </p>
          <p className="text-[10px] text-white/25 font-data truncate">
            {formatAddress(trader.proxyWallet, 8, 6)}
          </p>
        </div>
      </div>

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
  maxAmount,
}: {
  trader: LeaderboardTrader;
  rank: number;
  maxAmount: number;
}) {
  const displayName =
    trader.displayUsernamePublic && trader.name
      ? trader.name
      : trader.pseudonym || formatAddress(trader.proxyWallet);

  const barWidth = maxAmount > 0 ? Math.max((trader.totalAmount / maxAmount) * 100, 3) : 0;

  const rankBadge =
    rank === 1
      ? "text-amber-400"
      : rank === 2
        ? "text-gray-300"
        : rank === 3
          ? "text-amber-600"
          : "text-white/20";

  const [hovered, setHovered] = useState(false);

  const wr = trader.winrate;
  const hasWinrate = wr && wr.winrate !== null;

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
            {trader.profileImageOptimized || trader.profileImage ? (
              <img
                src={trader.profileImageOptimized || trader.profileImage}
                alt=""
                className="w-8 h-8 rounded-full shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/5 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-white/80 truncate">
                {displayName}
              </p>
              <p className="text-[10px] text-white/20">
                {trader.marketCount} market{trader.marketCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 ml-3">
            {/* Compact winrate */}
            {hasWinrate && (
              <span className={`text-xs font-bold font-data ${
                wr!.winrate! >= 55 ? "text-green-400" : wr!.winrate! >= 45 ? "text-amber-400" : "text-red-400"
              }`}>
                {wr!.winrate!.toFixed(0)}%
              </span>
            )}
            <span className="text-sm font-bold font-data text-white/70">
              {formatAmount(trader.totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Hover card */}
      <TraderHoverCard trader={trader} visible={hovered} />
    </div>
  );
}

export default function LeaderboardPage() {
  const { data, isLoading, error } = useLeaderboard(50);

  const traders = data?.traders || [];
  const totalMarkets = data?.totalMarkets || 0;
  const maxAmount = traders.length > 0 ? traders[0].totalAmount : 0;

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
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

        {/* Content */}
        {isLoading && <LoadingState message="Loading leaderboard..." />}

        {error && !isLoading && (
          <ErrorState error={error} title="Error loading leaderboard" />
        )}

        {!isLoading && !error && traders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-white/30">No active LoL markets found</p>
          </div>
        )}

        {!isLoading && !error && traders.length > 0 && (
          <div className="space-y-1">
            {/* Column headers */}
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/20">
                Trader
              </span>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-white/20">
                  Win%
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-white/20">
                  Holdings
                </span>
              </div>
            </div>

            {traders.map((trader, i) => (
              <TraderRow
                key={trader.proxyWallet}
                trader={trader}
                rank={i + 1}
                maxAmount={maxAmount}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
