"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/providers/WalletContext";
import { useTrading } from "@/providers/TradingProvider";
import useLoLMarkets, { type MatchStatus } from "@/hooks/useLoLMarkets";
import useTeamLogos from "@/hooks/useTeamLogos";
import useUserPositions, {
  type PolymarketPosition,
} from "@/hooks/useUserPositions";
import useRedeemPosition from "@/hooks/useRedeemPosition";

import ErrorState from "@/components/shared/ErrorState";
import EmptyState from "@/components/shared/EmptyState";
import LoadingState from "@/components/shared/LoadingState";
import LeagueFilter from "@/components/LoL/LeagueFilter";
import LoLMarketCard from "@/components/LoL/LoLMarketCard";
import OrderPlacementModal from "@/components/Trading/OrderModal";

import { createPollingInterval } from "@/utils/polling";
import { POLLING_DURATION, POLLING_INTERVAL } from "@/constants/query";

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
  const [redeemingEventId, setRedeemingEventId] = useState<string | null>(null);

  const { eoaAddress } = useWallet();
  const {
    clobClient,
    relayClient,
    isGeoblocked,
    isTradingSessionComplete,
    initTradingCredentials,
    currentStep,
    safeAddress,
  } = useTrading();

  const { data: positions } = useUserPositions(safeAddress);
  const { redeemPosition, isRedeeming } = useRedeemPosition();
  const queryClient = useQueryClient();

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
  const leagues = useMemo(() => data?.pages[0]?.leagues || [], [data]);

  // Build a map of tokenId -> position for quick lookup
  const positionsByToken = useMemo(() => {
    const map = new Map<string, PolymarketPosition>();
    if (positions) {
      for (const p of positions) {
        map.set(p.asset, p);
      }
    }
    return map;
  }, [positions]);

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

  const handleConnectPrompt = useCallback(() => {
    window.dispatchEvent(new Event("open-connect-modal"));
  }, []);

  const isSessionInitializing =
    currentStep !== "idle" && currentStep !== "complete";

  const handleRedeem = useCallback(
    async (position: PolymarketPosition, eventId: string) => {
      if (!relayClient) return;
      setRedeemingEventId(eventId);
      try {
        await redeemPosition(relayClient, {
          conditionId: position.conditionId,
          outcomeIndex: position.outcomeIndex,
          negativeRisk: position.negativeRisk,
          size: position.size,
        });
        queryClient.invalidateQueries({ queryKey: ["polymarket-positions"] });
        queryClient.invalidateQueries({ queryKey: ["polygon-balances"] });
        createPollingInterval(
          () => {
            queryClient.invalidateQueries({
              queryKey: ["polymarket-positions"],
            });
            queryClient.invalidateQueries({ queryKey: ["polygon-balances"] });
          },
          POLLING_INTERVAL,
          POLLING_DURATION
        );
      } catch (err) {
        console.error("Failed to redeem:", err);
      } finally {
        setRedeemingEventId(null);
      }
    },
    [relayClient, redeemPosition, queryClient]
  );

  const statusLabel = status === "live" ? "Live" : status === "resolved" ? "Results" : "Upcoming";

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
          <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-semibold text-white/80">
              {statusLabel}
            </h3>
            {events.length > 0 && (
              <span className="text-xs text-white/20 font-data">{events.length}</span>
            )}
          </div>
          <p className="text-[11px] text-white/15">
            {status === "upcoming" ? "Soonest first" : status === "resolved" ? "Most recent" : "Newest first"}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <LoadingState
            message={`Loading ${statusLabel.toLowerCase()} matches...`}
          />
        )}

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
          <div className="space-y-2">
            {events.map((event) => (
              <LoLMarketCard
                key={event.id}
                event={event}
                disabled={isGeoblocked}
                teamLogos={teamLogos || {}}
                isConnected={!!eoaAddress}
                isSessionReady={!!isTradingSessionComplete}
                isSessionInitializing={isSessionInitializing}
                positionsByToken={positionsByToken}
                isRedeeming={isRedeeming && redeemingEventId === event.id}
                canRedeem={!!relayClient}
                onOutcomeClick={handleOutcomeClick}
                onRedeem={handleRedeem}
                onConnectPrompt={handleConnectPrompt}
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
          onInitTradingCredentials={initTradingCredentials}
          isSessionInitializing={isSessionInitializing}
        />
      )}
    </>
  );
}
