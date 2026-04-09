"use client";

import { useMemo, useState } from "react";
import { useTrading } from "@/providers/TradingProvider";
import useLoLMarkets from "@/hooks/useLoLMarkets";
import useTeamLogos from "@/hooks/useTeamLogos";

import ErrorState from "@/components/shared/ErrorState";
import EmptyState from "@/components/shared/EmptyState";
import LoadingState from "@/components/shared/LoadingState";
import LeagueFilter from "@/components/LoL/LeagueFilter";
import LoLMarketCard from "@/components/LoL/LoLMarketCard";
import OrderPlacementModal from "@/components/Trading/OrderModal";

export default function LoLMarkets() {
  const [activeLeague, setActiveLeague] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<{
    marketTitle: string;
    outcome: string;
    price: number;
    tokenId: string;
    negRisk: boolean;
  } | null>(null);

  const { clobClient, isGeoblocked } = useTrading();

  const { data, isLoading, error } = useLoLMarkets({
    league: activeLeague,
  });

  const events = data?.events || [];
  const leagues = data?.leagues || [];

  // Collect all team names for logo lookup
  const teamNames = useMemo(
    () =>
      events.flatMap((e) => [e.teamA, e.teamB].filter(Boolean) as string[]),
    [events]
  );
  const { data: teamLogos } = useTeamLogos(teamNames);

  const handleOutcomeClick = (
    marketTitle: string,
    outcome: string,
    price: number,
    tokenId: string,
    negRisk: boolean
  ) => {
    setSelectedOutcome({ marketTitle, outcome, price, tokenId, negRisk });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOutcome(null);
  };

  return (
    <>
      <div className="space-y-4">
        {/* League Filter */}
        {leagues.length > 0 && (
          <LeagueFilter
            leagues={leagues}
            activeLeague={activeLeague}
            onLeagueChange={setActiveLeague}
          />
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">
            LoL Matches {events.length > 0 ? `(${events.length})` : ""}
          </h3>
          <p className="text-xs text-gray-400">Sorted by date (newest first)</p>
        </div>

        {/* Loading State */}
        {isLoading && <LoadingState message="Loading LoL markets..." />}

        {/* Error State */}
        {error && !isLoading && (
          <ErrorState error={error} title="Error loading LoL markets" />
        )}

        {/* Empty State */}
        {!isLoading && !error && events.length === 0 && (
          <EmptyState
            title="No LoL Markets"
            message={
              activeLeague
                ? `No active ${activeLeague} markets found.`
                : "No active League of Legends markets found on Polymarket."
            }
          />
        )}

        {/* Match Cards */}
        {!isLoading && !error && events.length > 0 && (
          <div className="space-y-3">
            {events.map((event) => (
              <LoLMarketCard
                key={event.id}
                event={event}
                disabled={isGeoblocked}
                teamLogos={teamLogos || {}}
                onOutcomeClick={handleOutcomeClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Order Placement Modal */}
      {selectedOutcome && (
        <OrderPlacementModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          marketTitle={selectedOutcome.marketTitle}
          outcome={selectedOutcome.outcome}
          currentPrice={selectedOutcome.price}
          tokenId={selectedOutcome.tokenId}
          negRisk={selectedOutcome.negRisk}
          clobClient={clobClient}
        />
      )}
    </>
  );
}
