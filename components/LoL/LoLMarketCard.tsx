"use client";

import { useState, useMemo } from "react";
import type { LoLEvent } from "@/hooks/useLoLMarkets";
import type { PolymarketPosition } from "@/hooks/useUserPositions";
import useTopHolders from "@/hooks/useTopHolders";
import TopHolders from "@/components/LoL/TopHolders";
import { formatVolume, formatCurrency, formatShares } from "@/utils/formatting";

interface LoLMarketCardProps {
  event: LoLEvent;
  disabled?: boolean;
  teamLogos: Record<string, string | null>;
  isConnected: boolean;
  isSessionReady: boolean;
  isSessionInitializing: boolean;
  positionsByToken: Map<string, PolymarketPosition>;
  isRedeeming: boolean;
  canRedeem: boolean;
  onOutcomeClick: (
    marketTitle: string,
    outcome: string,
    price: number,
    tokenId: string,
    negRisk: boolean
  ) => void;
  onRedeem: (position: PolymarketPosition, eventId: string) => void;
  onConnectPrompt: () => void;
}

function TeamLogo({
  teamName,
  logoUrl,
  size = "md",
}: {
  teamName: string;
  logoUrl: string | null;
  size?: "sm" | "md";
}) {
  const [imgError, setImgError] = useState(false);
  const px = size === "sm" ? "w-8 h-8" : "w-10 h-10";

  if (logoUrl && !imgError) {
    return (
      <img
        src={logoUrl}
        alt={teamName}
        className={`${px} object-contain`}
        onError={() => setImgError(true)}
      />
    );
  }

  const initials = teamName
    .split(/[\s.]+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

  return (
    <div className={`${px} rounded-lg bg-white/5 flex items-center justify-center`}>
      <span className="text-[10px] font-bold text-white/40">{initials}</span>
    </div>
  );
}

function formatGameTime(isoString: string | null): string {
  if (!isoString) return "TBD";
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) return `Today ${time}`;
  if (isTomorrow) return `Tomorrow ${time}`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function LoLMarketCard({
  event,
  disabled = false,
  teamLogos,
  isConnected,
  isSessionReady,
  isSessionInitializing,
  positionsByToken,
  isRedeeming,
  canRedeem,
  onOutcomeClick,
  onRedeem,
  onConnectPrompt,
}: LoLMarketCardProps) {
  const [expanded, setExpanded] = useState(false);

  const { mainMarket, teamA, teamB, bestOf, league } = event;
  const status = event.status;

  const { data: holdersData, isLoading: holdersLoading } = useTopHolders({
    conditionId: mainMarket?.conditionId ?? null,
    enabled: expanded,
  });

  const teamAOdds = mainMarket
    ? parseFloat(mainMarket.outcomePrices[0] || "0")
    : 0;
  const teamBOdds = mainMarket
    ? parseFloat(mainMarket.outcomePrices[1] || "0")
    : 0;
  const teamAPct = Math.round(teamAOdds * 100);
  const teamBPct = Math.round(teamBOdds * 100);

  const eventPositions = useMemo(() => {
    const positions: {
      position: PolymarketPosition;
      tokenIndex: number;
    }[] = [];
    if (!mainMarket) return positions;

    for (let i = 0; i < mainMarket.clobTokenIds.length; i++) {
      const tokenId = mainMarket.clobTokenIds[i];
      const pos = positionsByToken.get(tokenId);
      if (pos && pos.size > 0.01) {
        positions.push({ position: pos, tokenIndex: i });
      }
    }
    return positions;
  }, [mainMarket, positionsByToken]);

  const hasPosition = eventPositions.length > 0;
  const redeemablePosition = eventPositions.find(
    (ep) => ep.position.redeemable
  );
  const canClick = !disabled && mainMarket?.acceptingOrders;

  const handleTeamClick = (teamIndex: 0 | 1) => {
    if (!canClick) return;
    if (!isConnected) { onConnectPrompt(); return; }
    if (!mainMarket) return;

    // Open order modal directly — session init happens at "Place Order"
    onOutcomeClick(
      event.title,
      mainMarket.outcomes[teamIndex],
      teamIndex === 0 ? teamAOdds : teamBOdds,
      mainMarket.clobTokenIds[teamIndex],
      mainMarket.negRisk
    );
  };

  return (
    <div className="glass glass-hover group">
      {/* Meta row */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          {league && (
            <span className="text-[10px] font-semibold uppercase tracking-widest text-purple-400/80">
              {league}
            </span>
          )}
          {league && <span className="text-white/10">|</span>}
          {status === "live" ? (
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-green-400">Live</span>
            </span>
          ) : (
            <span className="text-[10px] font-medium text-white/30">
              {formatGameTime(event.gameStartTime)}
            </span>
          )}
          {bestOf && (
            <span className="text-[10px] text-white/20 font-medium">BO{bestOf}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasPosition && (
            <span className="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wider">
              Position
            </span>
          )}
          <span className="text-[10px] text-white/20 font-data">
            {formatVolume(event.volume)} vol
          </span>
        </div>
      </div>

      {/* Main match area */}
      {mainMarket && teamA && teamB ? (
        <div className="px-5 pb-4">
          {/* Teams row */}
          <div className="flex items-center gap-3 mb-3">
            {/* Team A button */}
            <button
              onClick={() => handleTeamClick(0)}
              disabled={!canClick}
              className={`flex-1 flex items-center gap-3 py-3 px-4 rounded-xl transition-all duration-200 ${
                canClick
                  ? "cursor-pointer hover:bg-green-500/8 active:scale-[0.98]"
                  : "cursor-default opacity-60"
              }`}
            >
              <TeamLogo teamName={teamA} logoUrl={teamLogos[teamA] ?? null} />
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-white/90 truncate">{teamA}</p>
              </div>
              <span className="font-data text-lg font-bold text-green-400 tabular-nums">
                {teamAPct}<span className="text-xs text-green-400/40 ml-px">%</span>
              </span>
            </button>

            <span className="text-white/10 text-xs font-bold shrink-0">vs</span>

            {/* Team B button */}
            <button
              onClick={() => handleTeamClick(1)}
              disabled={!canClick}
              className={`flex-1 flex items-center gap-3 py-3 px-4 rounded-xl transition-all duration-200 ${
                canClick
                  ? "cursor-pointer hover:bg-red-500/8 active:scale-[0.98]"
                  : "cursor-default opacity-60"
              }`}
            >
              <TeamLogo teamName={teamB} logoUrl={teamLogos[teamB] ?? null} />
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-white/90 truncate">{teamB}</p>
              </div>
              <span className="font-data text-lg font-bold text-red-400 tabular-nums">
                {teamBPct}<span className="text-xs text-red-400/40 ml-px">%</span>
              </span>
            </button>
          </div>

          {/* Odds bar */}
          <div className="h-1 rounded-full overflow-hidden flex bg-white/5">
            <div
              className="bg-green-500/50 transition-all duration-500 rounded-l-full"
              style={{ width: `${teamAPct}%` }}
            />
            <div
              className="bg-red-500/50 transition-all duration-500 rounded-r-full"
              style={{ width: `${teamBPct}%` }}
            />
          </div>

          {/* Position display */}
          {hasPosition && (
            <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5">
              {eventPositions.map(({ position }) => (
                <div
                  key={position.asset}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-amber-300 font-medium">{position.outcome}</span>
                    <span className="text-white/25 font-data">
                      {formatShares(position.size)} @ {formatCurrency(position.avgPrice, 3)}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-bold font-data ${
                      position.cashPnl >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {position.cashPnl >= 0 ? "+" : ""}
                    {formatCurrency(position.cashPnl)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Redeem */}
          {redeemablePosition && (
            <button
              onClick={() => onRedeem(redeemablePosition.position, event.id)}
              disabled={isRedeeming || !canRedeem}
              className="w-full mt-3 py-2 text-xs font-semibold rounded-lg transition-all bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isRedeeming
                ? "Redeeming..."
                : `Redeem ${formatCurrency(redeemablePosition.position.currentValue)}`}
            </button>
          )}

          {/* Prompts */}
          {!isConnected && (
            <p className="text-[11px] text-center text-white/20 mt-3">
              Connect wallet to bet
            </p>
          )}
          {isConnected && !isSessionReady && isSessionInitializing && (
            <p className="text-[11px] text-center text-purple-400/60 mt-3">
              Setting up...
            </p>
          )}

          {/* Top Traders toggle */}
          <button
            onClick={() => setExpanded((prev) => !prev)}
            className="w-full mt-3 pt-3 border-t border-white/5 flex items-center justify-center gap-1.5 cursor-pointer group/expand"
          >
            <span className="text-[10px] font-medium text-white/25 group-hover/expand:text-white/40 transition-colors">
              Top Traders
            </span>
            <svg
              className={`w-3 h-3 text-white/20 group-hover/expand:text-white/35 transition-all duration-200 ${expanded ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Expanded top holders */}
          {expanded && (
            <div className="mt-3">
              <TopHolders
                data={holdersData || []}
                outcomes={mainMarket.outcomes}
                isLoading={holdersLoading}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="px-5 pb-4 text-sm text-white/50">{event.title}</div>
      )}
    </div>
  );
}
