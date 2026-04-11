"use client";

import { useState, useMemo } from "react";
import type { LoLEvent } from "@/hooks/useLoLMarkets";
import type { PolymarketPosition } from "@/hooks/useUserPositions";
import Card from "@/components/shared/Card";
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
        className="w-11 h-11 object-contain drop-shadow-lg"
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
    <div className="w-11 h-11 rounded-xl bg-linear-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center">
      <span className="text-xs font-bold text-purple-300">{initials}</span>
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

const statusStyles = {
  live: "bg-green-500/15 text-green-400 border border-green-500/30 animate-pulse",
  upcoming: "bg-blue-500/15 text-blue-300 border border-blue-500/25",
  resolved: "bg-gray-500/15 text-gray-400 border border-gray-500/25",
};

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
  const { mainMarket, teamA, teamB, bestOf, league } = event;
  const status = event.status;
  const statusLabel =
    status === "live" ? "Live" : status === "upcoming" ? "Upcoming" : "Resolved";

  const teamAOdds = mainMarket
    ? parseFloat(mainMarket.outcomePrices[0] || "0")
    : 0;
  const teamBOdds = mainMarket
    ? parseFloat(mainMarket.outcomePrices[1] || "0")
    : 0;

  // Find user positions for this event's markets
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

  // Check if any position is redeemable
  const redeemablePosition = eventPositions.find(
    (ep) => ep.position.redeemable
  );

  // Buttons are clickable if not disabled and market accepts orders
  const canClick = !disabled && mainMarket?.acceptingOrders;

  return (
    <Card hover className="p-5">
      <div className="flex flex-col gap-3">
        {/* Top row: league badge, status, time, volume */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {league && (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/25">
                {league}
              </span>
            )}
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${statusStyles[status]}`}
            >
              {statusLabel}
            </span>
            {bestOf && (
              <span className="text-[11px] text-gray-500 font-medium">BO{bestOf}</span>
            )}
            {hasPosition && (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-yellow-500/15 text-yellow-300 border border-yellow-500/25">
                Your Bet
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-gray-500 font-data">
            <span>{formatGameTime(event.gameStartTime)}</span>
            <span className="text-gray-600">|</span>
            <span>Vol {formatVolume(event.volume)}</span>
          </div>
        </div>

        {/* Match display: Team A vs Team B with odds */}
        {mainMarket && teamA && teamB ? (
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mt-1">
            {/* Team A */}
            <button
              onClick={() => {
                if (!canClick) return;
                if (!isConnected) { onConnectPrompt(); return; }
                if (!isSessionReady) return;
                onOutcomeClick(
                  event.title,
                  mainMarket.outcomes[0],
                  teamAOdds,
                  mainMarket.clobTokenIds[0],
                  mainMarket.negRisk
                );
              }}
              disabled={!canClick}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 ${
                !canClick
                  ? "opacity-50 cursor-default bg-white/3"
                  : "bg-white/3 hover:bg-green-500/10 border border-white/6 hover:border-green-500/30 cursor-pointer hover:glow-green"
              }`}
            >
              <TeamLogo
                teamName={teamA}
                logoUrl={teamLogos[teamA] ?? null}
              />
              <span className="font-semibold text-sm text-white/90 truncate max-w-full">
                {teamA}
              </span>
              <span className="text-xl font-bold font-data text-green-400">
                {Math.round(teamAOdds * 100)}
                <span className="text-sm text-green-400/60">%</span>
              </span>
            </button>

            {/* VS */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-gray-600 font-bold text-xs tracking-widest">VS</span>
            </div>

            {/* Team B */}
            <button
              onClick={() => {
                if (!canClick) return;
                if (!isConnected) { onConnectPrompt(); return; }
                if (!isSessionReady) return;
                onOutcomeClick(
                  event.title,
                  mainMarket.outcomes[1],
                  teamBOdds,
                  mainMarket.clobTokenIds[1],
                  mainMarket.negRisk
                );
              }}
              disabled={!canClick}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 ${
                !canClick
                  ? "opacity-50 cursor-default bg-white/3"
                  : "bg-white/3 hover:bg-red-500/10 border border-white/6 hover:border-red-500/30 cursor-pointer hover:glow-red"
              }`}
            >
              <TeamLogo
                teamName={teamB}
                logoUrl={teamLogos[teamB] ?? null}
              />
              <span className="font-semibold text-sm text-white/90 truncate max-w-full">
                {teamB}
              </span>
              <span className="text-xl font-bold font-data text-red-400">
                {Math.round(teamBOdds * 100)}
                <span className="text-sm text-red-400/60">%</span>
              </span>
            </button>
          </div>
        ) : (
          <div className="text-sm text-gray-300">{event.title}</div>
        )}

        {/* Inline position display */}
        {hasPosition && (
          <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-xl p-3 space-y-2">
            {eventPositions.map(({ position }) => (
              <div
                key={position.asset}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-yellow-300 font-medium">
                    {position.outcome}
                  </span>
                  <span className="text-gray-500 font-data text-xs">
                    {formatShares(position.size)} shares @{" "}
                    {formatCurrency(position.avgPrice, 3)}
                  </span>
                </div>
                <span
                  className={`font-bold font-data ${position.cashPnl >= 0 ? "text-green-400" : "text-red-400"}`}
                >
                  {position.cashPnl >= 0 ? "+" : ""}
                  {formatCurrency(position.cashPnl)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Redeem button for resolved positions */}
        {redeemablePosition && (
          <button
            onClick={() =>
              onRedeem(redeemablePosition.position, event.id)
            }
            disabled={isRedeeming || !canRedeem}
            className="w-full py-2 font-medium rounded-lg transition-colors bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm"
          >
            {isRedeeming
              ? "Redeeming..."
              : `Redeem ${formatCurrency(redeemablePosition.position.currentValue)}`}
          </button>
        )}

        {/* Connect / Session prompt */}
        {!isConnected && (
          <p className="text-xs text-center text-gray-500">
            Connect wallet to place bets
          </p>
        )}
        {isConnected && !isSessionReady && isSessionInitializing && (
          <p className="text-xs text-center text-purple-400">
            Setting up trading session...
          </p>
        )}

        {/* Extra markets count */}
        {event.marketCount > 1 && (
          <div className="text-xs text-gray-500 text-center">
            +{event.marketCount - 1} more markets (handicap, props, etc.)
          </div>
        )}
      </div>
    </Card>
  );
}
