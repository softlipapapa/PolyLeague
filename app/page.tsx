"use client";

import { useState, useEffect } from "react";
import { useTrading } from "@/providers/TradingProvider";
import Header from "@/components/Header";
import SessionSetupModal from "@/components/SessionSetupModal";
import MarketTabs from "@/components/Trading/MarketTabs";
import GeoBlockedBanner from "@/components/GeoBlockedBanner";

export default function Home() {
  const {
    currentStep,
    sessionError,
    initializeTradingSession,
    initSafeDeployment,
    endTradingSession,
    isGeoblocked,
    isGeoblockLoading,
    geoblockStatus,
  } = useTrading();

  // Show modal whenever a session step is actively running
  const [showSetupModal, setShowSetupModal] = useState(false);

  useEffect(() => {
    if (currentStep !== "idle") {
      setShowSetupModal(true);
    }
    // Auto-dismiss on success states
    if (currentStep === "complete" || currentStep === "safe-complete") {
      const timer = setTimeout(() => setShowSetupModal(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  useEffect(() => {
    if (sessionError) setShowSetupModal(true);
  }, [sessionError]);

  const handleRetry = () => {
    // Retry the appropriate phase based on what failed
    if (currentStep === "idle") {
      initSafeDeployment();
    } else {
      initializeTradingSession();
    }
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
