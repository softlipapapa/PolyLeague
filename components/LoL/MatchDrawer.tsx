"use client";

import { useEffect, useState } from "react";
import type { LoLEvent } from "@/hooks/useLoLMarkets";
import type { PolymarketPosition } from "@/hooks/useUserPositions";
import OddsChart from "@/components/LoL/OddsChart";
import HeadToHead from "@/components/LoL/HeadToHead";
import TeamInfo from "@/components/LoL/TeamInfo";
import OrderBook from "@/components/LoL/OrderBook";
import OrderPanel from "@/components/Trading/OrderPanel";
import { formatVolume, formatCurrency, formatShares } from "@/utils/formatting";
import type { StreamLink } from "@/app/api/stream-links/route";

type RightTab = "info" | "bet";

interface MatchDrawerProps {
  event: LoLEvent;
  isOpen: boolean;
  onClose: () => void;
  teamLogos: Record<string, string | null>;
  isConnected: boolean;
  streamLink?: StreamLink | null;
  positions: { position: PolymarketPosition; tokenIndex: number }[];
}

function TeamLogo({ teamName, logoUrl }: { teamName: string; logoUrl: string | null }) {
  const initials = teamName.split(/[\s.]+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase();
  if (logoUrl) {
    return <img src={logoUrl} alt={teamName} className="w-8 h-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />;
  }
  return (
    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
      <span className="text-[9px] font-bold text-white/40">{initials}</span>
    </div>
  );
}

export default function MatchDrawer({
  event, isOpen, onClose, teamLogos, isConnected, streamLink, positions,
}: MatchDrawerProps) {
  const { mainMarket, teamA, teamB, bestOf, league, status } = event;

  const teamAOdds = mainMarket ? parseFloat(mainMarket.outcomePrices[0] || "0") : 0;
  const teamBOdds = mainMarket ? parseFloat(mainMarket.outcomePrices[1] || "0") : 0;
  const teamAPct = Math.round(teamAOdds * 100);
  const teamBPct = Math.round(teamBOdds * 100);

  const isResolved = status === "resolved";
  const winner = event.winner;
  const teamAWon = winner === teamA;
  const teamBWon = winner === teamB;
  const canBet = !isResolved && status !== "settling" && mainMarket?.acceptingOrders;

  const [rightTab, setRightTab] = useState<RightTab>("bet");
  const [selectedTeam, setSelectedTeam] = useState<0 | 1>(0);

  // Reset tab when drawer opens
  useEffect(() => {
    if (isOpen) {
      setRightTab("bet");
      setSelectedTeam(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", handleKey); document.body.style.overflow = ""; };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTeamClick = (idx: 0 | 1) => {
    if (!isConnected) {
      window.dispatchEvent(new Event("open-connect-modal"));
      return;
    }
    setSelectedTeam(idx);
    setRightTab("bet");
  };

  const teamBtn = (idx: 0 | 1) => {
    const name = idx === 0 ? teamA : teamB;
    const pct = idx === 0 ? teamAPct : teamBPct;
    const won = idx === 0 ? teamAWon : teamBWon;
    const logo = teamLogos[name!] ?? null;

    const btnBg = idx === 0
      ? "bg-green-500/5 hover:bg-green-500/12 border-green-500/10 hover:border-green-500/25"
      : "bg-red-500/5 hover:bg-red-500/12 border-red-500/10 hover:border-red-500/25";
    const pctColor = idx === 0 ? "text-green-400" : "text-red-400";
    const isSelected = rightTab === "bet" && selectedTeam === idx;
    const selectedRing = idx === 0 ? "ring-1 ring-green-500/40" : "ring-1 ring-red-500/40";

    if (canBet) {
      return (
        <button
          onClick={() => handleTeamClick(idx)}
          className={`flex items-center gap-2 py-1.5 px-2.5 rounded-lg transition-all border active:scale-[0.98] cursor-pointer ${btnBg} ${isSelected ? selectedRing : ""}`}
        >
          <TeamLogo teamName={name!} logoUrl={logo} />
          <span className="text-xs font-semibold text-white/90 hidden lg:block max-w-20 truncate">{name}</span>
          <span className={`font-data text-base font-bold tabular-nums ${pctColor}`}>
            {pct}<span className="text-[10px] opacity-50">¢</span>
          </span>
        </button>
      );
    }
    return (
      <div className={`flex items-center gap-2 py-1.5 px-2.5 rounded-lg border
        ${isResolved && won ? "bg-green-500/8 border-green-500/15" : "border-white/5"}
        ${isResolved && !won ? "opacity-40" : ""}`}
      >
        <TeamLogo teamName={name!} logoUrl={logo} />
        <span className="text-xs font-semibold text-white/90 hidden lg:block max-w-20 truncate">{name}</span>
        {isResolved ? (
          won ? <span className="text-[10px] font-bold text-green-400 uppercase">Win</span>
            : <span className="text-[10px] text-white/20 uppercase">Loss</span>
        ) : (
          <span className={`font-data text-base font-bold tabular-nums ${pctColor}`}>
            {pct}<span className="text-[10px] opacity-50">%</span>
          </span>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center pointer-events-none p-0 md:p-4">
        <div className="pointer-events-auto bg-[#0c0c16] border border-white/5 flex flex-col overflow-hidden modal-animate-in
          w-full h-[94vh] rounded-t-2xl
          md:w-[1100px] md:max-w-[95vw] md:h-[82vh] md:rounded-2xl">

          {/* ─── Top bar ─── */}
          <div className="shrink-0 border-b border-white/5 px-3 md:px-4 py-2.5 flex items-center gap-2 md:gap-3">
            {mainMarket && teamA && teamB ? (
              <>
                {teamBtn(0)}

                <div className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] text-white/25 flex-wrap justify-center">
                    {league && <span className="font-semibold uppercase tracking-widest text-purple-400/70">{league}</span>}
                    {bestOf && <><span className="text-white/10">·</span><span>BO{bestOf}</span></>}
                    <span className="text-white/10">·</span>
                    <span className="font-data">{formatVolume(event.volume)}</span>
                    {streamLink && (
                      <>
                        <span className="text-white/10">·</span>
                        <a href={streamLink.url} target="_blank" rel="noopener noreferrer"
                          className="text-red-400/60 hover:text-red-400 transition-colors font-semibold uppercase"
                          onClick={(e) => e.stopPropagation()}>
                          {streamLink.provider === "twitch" ? "Twitch" : "YouTube"} ↗
                        </a>
                      </>
                    )}
                  </div>
                  {!isResolved && (
                    <div className="w-20 h-0.5 rounded-full overflow-hidden flex bg-white/5">
                      <div className="bg-green-500/50 rounded-l-full" style={{ width: `${teamAPct}%` }} />
                      <div className="bg-red-500/50 rounded-r-full" style={{ width: `${teamBPct}%` }} />
                    </div>
                  )}
                  {positions.length > 0 && positions.map(({ position }) => (
                    <div key={position.asset} className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-amber-400/60 font-semibold uppercase">Pos</span>
                      <span className="text-amber-300">{position.outcome}</span>
                      <span className="text-white/25 font-data">{formatShares(position.size)} @ {formatCurrency(position.avgPrice, 3)}</span>
                      <span className={`font-bold font-data ${position.cashPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {position.cashPnl >= 0 ? "+" : ""}{formatCurrency(position.cashPnl)}
                      </span>
                    </div>
                  ))}
                </div>

                {teamBtn(1)}

                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors shrink-0">
                  <svg className="w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            ) : (
              <div className="flex items-center justify-between w-full">
                <span className="text-sm text-white/50">{event.title}</span>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5">
                  <svg className="w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* ─── Content: mobile stacked, desktop 2-col ─── */}
          <div className="flex-1 overflow-y-auto md:overflow-hidden scrollbar-hide">
            <div className="flex flex-col md:flex-row md:h-full">

              {/* Left: Chart + Order Book */}
              <div className="md:flex-1 md:min-w-0 md:overflow-y-auto md:scrollbar-hide p-3 md:p-4 md:border-r md:border-white/5 space-y-4">
                {mainMarket && (
                  <OddsChart
                    tokenIds={mainMarket.clobTokenIds as [string, string]}
                    teamNames={[teamA || mainMarket.outcomes[0], teamB || mainMarket.outcomes[1]]}
                    enabled={isOpen}
                  />
                )}
                {mainMarket && (
                  <OrderBook
                    tokenIds={mainMarket.clobTokenIds}
                    outcomes={mainMarket.outcomes}
                    enabled={isOpen}
                    selectedTeam={selectedTeam}
                    onTeamSelect={(idx) => handleTeamClick(idx)}
                  />
                )}
              </div>

              {/* Right: Tabbed — Bet | Info */}
              <div className="md:w-80 shrink-0 md:overflow-y-auto md:scrollbar-hide border-t md:border-t-0 border-white/5 flex flex-col">
                {/* Tab bar */}
                {canBet && (
                  <div className="flex border-b border-white/5 shrink-0">
                    <button
                      onClick={() => setRightTab("bet")}
                      className={`flex-1 py-2.5 text-xs font-medium transition-all relative ${
                        rightTab === "bet" ? "text-white" : "text-white/30 hover:text-white/60"
                      }`}
                    >
                      Bet
                      {rightTab === "bet" && (
                        <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-purple-500 rounded-full" />
                      )}
                    </button>
                    <button
                      onClick={() => setRightTab("info")}
                      className={`flex-1 py-2.5 text-xs font-medium transition-all relative ${
                        rightTab === "info" ? "text-white" : "text-white/30 hover:text-white/60"
                      }`}
                    >
                      Team Info
                      {rightTab === "info" && (
                        <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-purple-500 rounded-full" />
                      )}
                    </button>
                  </div>
                )}

                {/* Tab content */}
                <div className="flex-1 p-3 md:p-4 space-y-5 overflow-y-auto scrollbar-hide">
                  {rightTab === "bet" && canBet && mainMarket ? (
                    isConnected ? (
                      <OrderPanel
                        outcomes={mainMarket.outcomes as [string, string]}
                        prices={[parseFloat(mainMarket.outcomePrices[0] || "0"), parseFloat(mainMarket.outcomePrices[1] || "0")]}
                        tokenIds={mainMarket.clobTokenIds as [string, string]}
                        negRisk={mainMarket.negRisk}
                        selectedTeam={selectedTeam}
                        onSelectTeam={(idx) => setSelectedTeam(idx)}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 space-y-3">
                        <p className="text-sm text-white/40">Connect your wallet to place bets</p>
                        <button
                          onClick={() => window.dispatchEvent(new Event("open-connect-modal"))}
                          className="px-4 py-2 rounded-lg font-semibold text-xs bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/20 transition-all cursor-pointer"
                        >
                          Connect Wallet
                        </button>
                      </div>
                    )
                  ) : (
                    <>
                      {teamA && teamB && (
                        <HeadToHead teamA={teamA} teamB={teamB} enabled={isOpen} />
                      )}
                      {teamA && teamB && (
                        <div className="space-y-3 pt-4 border-t border-white/5">
                          <TeamInfo teamName={teamA} enabled={isOpen} />
                          <div className="border-t border-white/5 pt-3">
                            <TeamInfo teamName={teamB} enabled={isOpen} />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
