"use client";

import { useState } from "react";
import type { LoLEvent } from "@/hooks/useLoLMarkets";
import Card from "@/components/shared/Card";
import { formatVolume } from "@/utils/formatting";

interface LoLMarketCardProps {
  event: LoLEvent;
  disabled?: boolean;
  teamLogos: Record<string, string | null>;
  onOutcomeClick: (
    marketTitle: string,
    outcome: string,
    price: number,
    tokenId: string,
    negRisk: boolean
  ) => void;
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

  // Initials fallback
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

function getMatchStatus(event: LoLEvent): {
  label: string;
  variant: "live" | "upcoming" | "closed";
} {
  if (event.closed) return { label: "Resolved", variant: "closed" };

  const gameStart = event.gameStartTime;
  if (!gameStart) return { label: "Upcoming", variant: "upcoming" };

  const now = new Date();
  const start = new Date(gameStart);
  if (now >= start) return { label: "Live", variant: "live" };
  return { label: "Upcoming", variant: "upcoming" };
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
  closed: "bg-gray-500/20 text-gray-400 border border-gray-500/30",
};

export default function LoLMarketCard({
  event,
  disabled = false,
  teamLogos,
  onOutcomeClick,
}: LoLMarketCardProps) {
  const { mainMarket, teamA, teamB, bestOf, league } = event;
  const status = getMatchStatus(event);

  // Get odds from main market
  const teamAOdds = mainMarket
    ? parseFloat(mainMarket.outcomePrices[0] || "0")
    : 0;
  const teamBOdds = mainMarket
    ? parseFloat(mainMarket.outcomePrices[1] || "0")
    : 0;

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
              className={`px-2 py-0.5 rounded text-xs font-bold ${statusStyles[status.variant]}`}
            >
              {status.label}
            </span>
            {bestOf && (
              <span className="text-xs text-gray-500">BO{bestOf}</span>
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
                if (disabled || !mainMarket.acceptingOrders) return;
                onOutcomeClick(
                  event.title,
                  mainMarket.outcomes[0],
                  teamAOdds,
                  mainMarket.clobTokenIds[0],
                  mainMarket.negRisk
                );
              }}
              disabled={disabled || !mainMarket.acceptingOrders}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all ${
                disabled || !mainMarket.acceptingOrders
                  ? "opacity-50 cursor-not-allowed bg-white/5"
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
                if (disabled || !mainMarket.acceptingOrders) return;
                onOutcomeClick(
                  event.title,
                  mainMarket.outcomes[1],
                  teamBOdds,
                  mainMarket.clobTokenIds[1],
                  mainMarket.negRisk
                );
              }}
              disabled={disabled || !mainMarket.acceptingOrders}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all ${
                disabled || !mainMarket.acceptingOrders
                  ? "opacity-50 cursor-not-allowed bg-white/5"
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
          // Fallback for events that don't match the title pattern
          <div className="text-sm text-gray-300">{event.title}</div>
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
