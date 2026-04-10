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
    <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
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
  live: "bg-green-500/20 text-green-400 border border-green-500/40 animate-pulse",
  upcoming: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  resolved: "bg-gray-500/20 text-gray-400 border border-gray-500/30",
};

export default function LoLMarketCard({
  event,
  disabled = false,
  teamLogos,
  isConnected,
  isSessionReady,
  positionsByToken,
  isRedeeming,
  canRedeem,
  onOutcomeClick,
  onRedeem,
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

  // Determine if the team buttons should be clickable
  const canTrade =
    !disabled && isConnected && isSessionReady && mainMarket?.acceptingOrders;
  const needsConnect = !isConnected;
  const needsSession = isConnected && !isSessionReady;

  return (
    <Card hover className="p-4">
      <div className="flex flex-col gap-3">
        {/* Top row: league badge, status, time, volume */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {league && (
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {league}
              </span>
            )}
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold ${statusStyles[status]}`}
            >
              {statusLabel}
            </span>
            {bestOf && (
              <span className="text-xs text-gray-500">BO{bestOf}</span>
            )}
            {hasPosition && (
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                Your Bet
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>{formatGameTime(event.gameStartTime)}</span>
            <span>Vol {formatVolume(event.volume)}</span>
          </div>
        </div>

        {/* Match display: Team A vs Team B with odds */}
        {mainMarket && teamA && teamB ? (
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            {/* Team A */}
            <button
              onClick={() => {
                if (!canTrade) return;
                onOutcomeClick(
                  event.title,
                  mainMarket.outcomes[0],
                  teamAOdds,
                  mainMarket.clobTokenIds[0],
                  mainMarket.negRisk
                );
              }}
              disabled={!canTrade}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all ${
                !canTrade
                  ? "opacity-60 cursor-default bg-white/5"
                  : "bg-white/5 hover:bg-green-500/10 hover:border-green-500/30 border border-transparent cursor-pointer"
              }`}
            >
              <TeamLogo
                teamName={teamA}
                logoUrl={teamLogos[teamA] ?? null}
              />
              <span className="font-semibold text-sm text-white truncate max-w-full">
                {teamA}
              </span>
              <span className="text-lg font-bold text-green-400">
                {Math.round(teamAOdds * 100)}%
              </span>
            </button>

            {/* VS */}
            <span className="text-gray-500 font-bold text-sm">VS</span>

            {/* Team B */}
            <button
              onClick={() => {
                if (!canTrade) return;
                onOutcomeClick(
                  event.title,
                  mainMarket.outcomes[1],
                  teamBOdds,
                  mainMarket.clobTokenIds[1],
                  mainMarket.negRisk
                );
              }}
              disabled={!canTrade}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all ${
                !canTrade
                  ? "opacity-60 cursor-default bg-white/5"
                  : "bg-white/5 hover:bg-red-500/10 hover:border-red-500/30 border border-transparent cursor-pointer"
              }`}
            >
              <TeamLogo
                teamName={teamB}
                logoUrl={teamLogos[teamB] ?? null}
              />
              <span className="font-semibold text-sm text-white truncate max-w-full">
                {teamB}
              </span>
              <span className="text-lg font-bold text-red-400">
                {Math.round(teamBOdds * 100)}%
              </span>
            </button>
          </div>
        ) : (
          <div className="text-sm text-gray-300">{event.title}</div>
        )}

        {/* Inline position display */}
        {hasPosition && (
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 space-y-2">
            {eventPositions.map(({ position, tokenIndex }) => (
              <div
                key={position.asset}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-yellow-300 font-medium">
                    {position.outcome}
                  </span>
                  <span className="text-gray-400">
                    {formatShares(position.size)} shares @{" "}
                    {formatCurrency(position.avgPrice, 3)}
                  </span>
                </div>
                <span
                  className={`font-semibold ${position.cashPnl >= 0 ? "text-green-400" : "text-red-400"}`}
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
        {needsConnect && (
          <p className="text-xs text-center text-gray-500">
            Connect wallet to place bets
          </p>
        )}
        {needsSession && (
          <p className="text-xs text-center text-gray-500">
            Start trading session to place bets
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
