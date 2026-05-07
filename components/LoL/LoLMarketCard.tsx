"use client";

import { useState, useMemo } from "react";
import type { LoLEvent } from "@/hooks/useLoLMarkets";
import type { PolymarketPosition } from "@/hooks/useUserPositions";
import { formatVolume, formatCurrency, formatShares } from "@/utils/formatting";
import type { StreamLink } from "@/app/api/stream-links/route";

interface LoLMarketCardProps {
  event: LoLEvent;
  disabled?: boolean;
  teamLogos: Record<string, string | null>;
  isConnected: boolean;
  positionsByToken: Map<string, PolymarketPosition>;
  isRedeeming: boolean;
  canRedeem: boolean;
  onCardClick: () => void;
  onRedeem: (position: PolymarketPosition, eventId: string) => void;
  streamLink?: StreamLink | null;
}

function TeamLogo({
  teamName,
  logoUrl,
}: {
  teamName: string;
  logoUrl: string | null;
}) {
  const [imgError, setImgError] = useState(false);

  if (logoUrl && !imgError) {
    return (
      <img
        src={logoUrl}
        alt={teamName}
        className="w-10 h-10 object-contain"
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
    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
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
  positionsByToken,
  isRedeeming,
  canRedeem,
  onCardClick,
  onRedeem,
  streamLink,
}: LoLMarketCardProps) {
  const { mainMarket, teamA, teamB, bestOf, league } = event;
  const status = event.status;

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

  const isResolved = status === "resolved";
  const winner = event.winner;
  const teamAWon = winner === teamA;
  const teamBWon = winner === teamB;

  return (
    <div
      className={`glass group cursor-pointer ${isResolved ? "opacity-75" : "glass-hover"}`}
      onClick={onCardClick}
    >
      {/* Meta row */}
      <div className="flex items-center justify-between px-3 md:px-5 pt-4 pb-2">
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
          ) : status === "settling" ? (
            <span className="flex items-center gap-1.5">
              <span className="inline-flex rounded-full h-2 w-2 bg-amber-400/60" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-400/60">Settling</span>
            </span>
          ) : isResolved ? (
            <span className="flex items-center gap-1.5">
              <span className="inline-flex rounded-full h-2 w-2 bg-white/20" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Final</span>
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
          {streamLink && (
            <a
              href={streamLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/15 hover:border-red-500/30 transition-all"
              title={`Watch on ${streamLink.provider === "twitch" ? "Twitch" : "YouTube"}`}
              onClick={(e) => e.stopPropagation()}
            >
              {streamLink.provider === "twitch" ? (
                <svg className="w-3 h-3 text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
                </svg>
              ) : (
                <svg className="w-3 h-3 text-red-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12z"/>
                </svg>
              )}
              <span className="text-[9px] font-semibold uppercase tracking-wider text-red-300/80">
                {status === "live" ? "Watch" : "Stream"}
              </span>
            </a>
          )}
          <span className="text-[10px] text-white/20 font-data">
            {formatVolume(event.volume)} vol
          </span>
        </div>
      </div>

      {/* Main match area */}
      {mainMarket && teamA && teamB ? (
        <div className="px-3 md:px-5 pb-4">
          {/* Teams row */}
          <div className="flex items-center gap-2 md:gap-3 mb-3">
            {/* Team A */}
            <div className={`flex-1 min-w-0 flex items-center gap-2 md:gap-3 py-2.5 md:py-3 px-2.5 md:px-4 rounded-xl transition-all duration-200 ${
              isResolved
                ? teamAWon ? "bg-green-500/8" : "opacity-40"
                : "group-hover:bg-green-500/5"
            }`}>
              <TeamLogo teamName={teamA} logoUrl={teamLogos[teamA] ?? null} />
              <div className="flex-1 min-w-0">
                <p className={`text-xs md:text-sm font-semibold truncate ${
                  isResolved && !teamAWon ? "text-white/30" : "text-white/90"
                }`}>{teamA}</p>
              </div>
              {isResolved ? (
                teamAWon ? (
                  <span className="flex items-center gap-1 shrink-0">
                    <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-[10px] font-semibold uppercase text-green-400">Win</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-white/15 uppercase shrink-0">Loss</span>
                )
              ) : (
                <span className="font-data text-base md:text-lg font-bold text-green-400 tabular-nums shrink-0">
                  {teamAPct}<span className="text-[10px] md:text-xs text-green-400/40 ml-px">%</span>
                </span>
              )}
            </div>

            <span className="text-white/10 text-xs font-bold shrink-0">vs</span>

            {/* Team B */}
            <div className={`flex-1 min-w-0 flex items-center gap-2 md:gap-3 py-2.5 md:py-3 px-2.5 md:px-4 rounded-xl transition-all duration-200 ${
              isResolved
                ? teamBWon ? "bg-green-500/8" : "opacity-40"
                : "group-hover:bg-red-500/5"
            }`}>
              <TeamLogo teamName={teamB} logoUrl={teamLogos[teamB] ?? null} />
              <div className="flex-1 min-w-0">
                <p className={`text-xs md:text-sm font-semibold truncate ${
                  isResolved && !teamBWon ? "text-white/30" : "text-white/90"
                }`}>{teamB}</p>
              </div>
              {isResolved ? (
                teamBWon ? (
                  <span className="flex items-center gap-1 shrink-0">
                    <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-[10px] font-semibold uppercase text-green-400">Win</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-white/15 uppercase shrink-0">Loss</span>
                )
              ) : (
                <span className="font-data text-base md:text-lg font-bold text-red-400 tabular-nums shrink-0">
                  {teamBPct}<span className="text-[10px] md:text-xs text-red-400/40 ml-px">%</span>
                </span>
              )}
            </div>
          </div>

          {/* Odds bar */}
          {!isResolved && (
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
          )}

          {/* Position display */}
          {hasPosition && (
            <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5">
              {eventPositions.map(({ position }) => {
                const positionWon = isResolved && position.outcome === winner;
                const positionLost = isResolved && winner !== null && position.outcome !== winner;
                return (
                  <div
                    key={position.asset}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 text-xs">
                      {isResolved && (
                        <span className={`text-[10px] font-bold uppercase ${
                          positionWon ? "text-green-400" : positionLost ? "text-red-400" : "text-white/20"
                        }`}>
                          {positionWon ? "Won" : positionLost ? "Lost" : "—"}
                        </span>
                      )}
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
                );
              })}
            </div>
          )}

          {/* Redeem */}
          {redeemablePosition && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRedeem(redeemablePosition.position, event.id);
              }}
              disabled={isRedeeming || !canRedeem}
              className="w-full mt-3 py-2 text-xs font-semibold rounded-lg transition-all bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isRedeeming
                ? "Redeeming..."
                : `Redeem ${formatCurrency(redeemablePosition.position.currentValue)}`}
            </button>
          )}
        </div>
      ) : (
        <div className="px-3 md:px-5 pb-4 text-sm text-white/50">{event.title}</div>
      )}
    </div>
  );
}
