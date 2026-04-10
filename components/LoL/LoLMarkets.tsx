"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useTrading } from "@/providers/TradingProvider";
import useLoLMarkets, { type MatchStatus } from "@/hooks/useLoLMarkets";
import useTeamLogos from "@/hooks/useTeamLogos";

import ErrorState from "@/components/shared/ErrorState";
import EmptyState from "@/components/shared/EmptyState";
import LoadingState from "@/components/shared/LoadingState";
import LeagueFilter from "@/components/LoL/LeagueFilter";
import LoLMarketCard from "@/components/LoL/LoLMarketCard";
import OrderPlacementModal from "@/components/Trading/OrderModal";

interface LoLMarketsProps {
  status: MatchStatus;
}

export default function LoLMarkets({ status }: LoLMarketsProps) {
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

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useLoLMarkets({
    league: activeLeague,
    status,
  });

  // Flatten pages into single events list
  const events = useMemo(
    () => data?.pages.flatMap((page) => page.events) || [],
    [data]
  );
  const leagues = useMemo(
    () => data?.pages[0]?.leagues || [],
    [data]
  );

  // Collect all team names for logo lookup
  const teamNames = useMemo(
    () =>
      events.flatMap((e) => [e.teamA, e.teamB].filter(Boolean) as string[]),
    [events]
  );
  const { data: teamLogos } = useTeamLogos(teamNames);

  // Infinite scroll observer
  const loadMoreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleOutcomeClick = useCallback(
    (
      marketTitle: string,
      outcome: string,
      price: number,
      tokenId: string,
      negRisk: boolean
    ) => {
      setSelectedOutcome({ marketTitle, outcome, price, tokenId, negRisk });
      setIsModalOpen(true);
    },
    []
  );

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOutcome(null);
  };

  const statusLabel = status === "live" ? "Live" : "Upcoming";

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
            {statusLabel} Matches{" "}
            {events.length > 0 ? `(${events.length})` : ""}
          </h3>
          <p className="text-xs text-gray-400">
            {status === "upcoming" ? "Soonest first" : "Newest first"}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && <LoadingState message={`Loading ${statusLabel.toLowerCase()} matches...`} />}

        {/* Error State */}
        {error && !isLoading && (
          <ErrorState error={error} title="Error loading LoL markets" />
        )}

        {/* Empty State */}
        {!isLoading && !error && events.length === 0 && (
          <EmptyState
            title={`No ${statusLabel} Matches`}
            message={
              activeLeague
                ? `No ${statusLabel.toLowerCase()} ${activeLeague} matches found.`
                : `No ${statusLabel.toLowerCase()} League of Legends matches on Polymarket.`
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

            {/* Infinite scroll trigger */}
            <div ref={loadMoreRef} className="h-4" />

            {isFetchingNextPage && (
              <LoadingState message="Loading more matches..." />
            )}
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
