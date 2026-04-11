"use client";

import { useTrading } from "@/providers/TradingProvider";
import Header from "@/components/Header";
import PolygonAssets from "@/components/PolygonAssets";
import TradingSession from "@/components/TradingSession";
import MarketTabs from "@/components/Trading/MarketTabs";
import GeoBlockedBanner from "@/components/GeoBlockedBanner";

export default function Home() {
  const {
    currentStep,
    sessionError,
    isTradingSessionComplete,
    initializeTradingSession,
    endTradingSession,
    isGeoblocked,
    isGeoblockLoading,
    geoblockStatus,
  } = useTrading();

  return (
    <div className="px-4 sm:px-6 py-6 min-h-screen flex flex-col gap-5 max-w-4xl mx-auto">
      <Header onEndSession={endTradingSession} />

      {/* Show geoblock banner if user is in blocked region */}
      {isGeoblocked && !isGeoblockLoading && (
        <GeoBlockedBanner geoblockStatus={geoblockStatus} />
      )}

      <PolygonAssets />

      {/* Auto-init progress banner (hidden once session is ready) */}
      {!isGeoblocked && (
        <TradingSession
          currentStep={currentStep}
          error={sessionError}
          isComplete={isTradingSessionComplete}
          onRetry={initializeTradingSession}
        />
      )}

      {/* Markets are always viewable; trading buttons disabled when not connected */}
      <MarketTabs />
    </div>
  );
}
