"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/providers/WalletContext";
import { useTrading } from "@/providers/TradingProvider";
import useLoLMarkets, { type LoLEvent, type MatchStatus } from "@/hooks/useLoLMarkets";
import useTeamLogos from "@/hooks/useTeamLogos";
import useUserPositions, {
  type PolymarketPosition,
} from "@/hooks/useUserPositions";
import useRedeemPosition from "@/hooks/useRedeemPosition";
import useStreamLinks from "@/hooks/useStreamLinks";

import ErrorState from "@/components/shared/ErrorState";
import EmptyState from "@/components/shared/EmptyState";
import LoadingState from "@/components/shared/LoadingState";
import LeagueFilter from "@/components/LoL/LeagueFilter";
import LoLMarketCard from "@/components/LoL/LoLMarketCard";
import MatchDrawer from "@/components/LoL/MatchDrawer";
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
  const [drawerEvent, setDrawerEvent] = useState<LoLEvent | null>(null);

  const { eoaAddress } = useWallet();
  const {
    clobClient,
    relayClient,
    isGeoblocked,
    isTradingSessionComplete,
    initTradingCredentials,
    currentStep,
    depositWalletAddress,
  } = useTrading();

  const { data: positions } = useUserPositions(depositWalletAddress);
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

  const events = useMemo(
    () => data?.pages.flatMap((page) => page.events) || [],
    [data]
  );

  const [allLeagues, setAllLeagues] = useState<string[]>([]);
  const rawLeagues = data?.pages[0]?.leagues;
  useEffect(() => {
    if (rawLeagues && rawLeagues.length > allLeagues.length) {
      setAllLeagues(rawLeagues);
    }
  }, [rawLeagues]);
  const leagues = allLeagues;

  const positionsByToken = useMemo(() => {
    const map = new Map<string, PolymarketPosition>();
    if (positions) {
      for (const p of positions) {
        map.set(p.asset, p);
      }
    }
    return map;
  }, [positions]);

  const teamNames = useMemo(
    () =>
      events.flatMap((e) => [e.teamA, e.teamB].filter(Boolean) as string[]),
    [events]
  );
  const { data: teamLogos } = useTeamLogos(teamNames);
  const { getStreamForMatch } = useStreamLinks();

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
      if (!relayClient || !depositWalletAddress) return;
      setRedeemingEventId(eventId);
      try {
        await redeemPosition(relayClient, depositWalletAddress, {
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
    [relayClient, depositWalletAddress, redeemPosition, queryClient]
  );

  const handleDrawerTeamClick = useCallback(
    (teamIndex: 0 | 1) => {
      if (!drawerEvent?.mainMarket) return;
      if (!eoaAddress) {
        handleConnectPrompt();
        return;
      }
      const m = drawerEvent.mainMarket;
      const price = parseFloat(m.outcomePrices[teamIndex] || "0");
      handleOutcomeClick(
        drawerEvent.title,
        m.outcomes[teamIndex],
        price,
        m.clobTokenIds[teamIndex],
        m.negRisk
      );
    },
    [drawerEvent, eoaAddress, handleOutcomeClick, handleConnectPrompt]
  );

  const getEventPositions = useCallback(
    (event: LoLEvent) => {
      const result: { position: PolymarketPosition; tokenIndex: number }[] = [];
      if (!event.mainMarket) return result;
      for (let i = 0; i < event.mainMarket.clobTokenIds.length; i++) {
        const pos = positionsByToken.get(event.mainMarket.clobTokenIds[i]);
        if (pos && pos.size > 0.01) {
          result.push({ position: pos, tokenIndex: i });
        }
      }
      return result;
    },
    [positionsByToken]
  );

  const statusLabel = status === "live" ? "Live" : status === "settling" ? "Settling" : status === "resolved" ? "Results" : "Upcoming";

  return (
    <>
      <div className="space-y-4">
        {leagues.length > 0 && (
          <LeagueFilter
            leagues={leagues}
            activeLeague={activeLeague}
            onLeagueChange={setActiveLeague}
          />
        )}

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

        {isLoading && (
          <LoadingState
            message={`Loading ${statusLabel.toLowerCase()} matches...`}
          />
        )}

        {error && !isLoading && (
          <ErrorState error={error} title="Error loading LoL markets" />
        )}

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

        {!isLoading && !error && events.length > 0 && (
          <div className="space-y-2">
            {events.map((event) => (
              <LoLMarketCard
                key={event.id}
                event={event}
                disabled={isGeoblocked}
                teamLogos={teamLogos || {}}
                isConnected={!!eoaAddress}
                positionsByToken={positionsByToken}
                isRedeeming={isRedeeming && redeemingEventId === event.id}
                canRedeem={!!relayClient}
                onCardClick={() => setDrawerEvent(event)}
                onRedeem={handleRedeem}
                streamLink={getStreamForMatch(event.teamA, event.teamB, event.league, event.status)}
              />
            ))}

            <div ref={loadMoreRef} className="h-4" />

            {isFetchingNextPage && (
              <LoadingState message="Loading more matches..." />
            )}
          </div>
        )}
      </div>

      {/* Match Detail Drawer */}
      {drawerEvent && (
        <MatchDrawer
          event={drawerEvent}
          isOpen={!!drawerEvent}
          onClose={() => setDrawerEvent(null)}
          teamLogos={teamLogos || {}}
          isConnected={!!eoaAddress}
          streamLink={getStreamForMatch(drawerEvent.teamA, drawerEvent.teamB, drawerEvent.league, drawerEvent.status)}
          positions={getEventPositions(drawerEvent)}
          onTeamClick={handleDrawerTeamClick}
        />
      )}

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
