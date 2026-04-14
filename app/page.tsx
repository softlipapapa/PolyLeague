"use client";

import { useState, useEffect } from "react";
import { useTrading } from "@/providers/TradingProvider";
import Header from "@/components/Header";
import PolygonAssets from "@/components/PolygonAssets";
import SessionSetupModal from "@/components/SessionSetupModal";
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

  // Show modal when session init is actively running or has errored
  const [showSetupModal, setShowSetupModal] = useState(false);

  useEffect(() => {
    if (currentStep !== "idle" && currentStep !== "complete" && !isTradingSessionComplete) {
      setShowSetupModal(true);
    }
    if (currentStep === "complete") {
      // Keep modal open briefly to show success state
      const timer = setTimeout(() => setShowSetupModal(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [currentStep, isTradingSessionComplete]);

  // Also show modal on error
  useEffect(() => {
    if (sessionError) setShowSetupModal(true);
  }, [sessionError]);

  const handleRetry = () => {
    initializeTradingSession();
  };

  const handleCloseSetupModal = () => {
    setShowSetupModal(false);
  };

  return (
    <div className="px-4 sm:px-6 py-6 min-h-screen flex flex-col gap-5 max-w-4xl mx-auto">
      <Header onEndSession={endTradingSession} />

      {/* Show geoblock banner if user is in blocked region */}
      {isGeoblocked && !isGeoblockLoading && (
        <GeoBlockedBanner geoblockStatus={geoblockStatus} />
      )}

      <PolygonAssets />

      {/* Session setup modal — shown when user triggers first bet */}
      {showSetupModal && (
        <SessionSetupModal
          currentStep={currentStep}
          error={sessionError}
          onRetry={handleRetry}
          onClose={handleCloseSetupModal}
        />
      )}

      {/* Markets are always viewable; trading buttons disabled when not connected */}
      <MarketTabs />
    </div>
  );
}
