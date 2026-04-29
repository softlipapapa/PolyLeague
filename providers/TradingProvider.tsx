"use client";

import { createContext, useContext, ReactNode, useCallback } from "react";
import type { ClobClient } from "@polymarket/clob-client-v2";
import type { RelayClient } from "@polymarket/builder-relayer-client";
import { useWallet } from "./WalletContext";
import useClobClient from "@/hooks/useClobClient";
import useTradingSession from "@/hooks/useTradingSession";
import useSafeDeployment from "@/hooks/useSafeDeployment";
import useGeoblock, { GeoblockStatus } from "@/hooks/useGeoblock";
import { TradingSession, SessionStep } from "@/utils/session";

interface TradingContextType {
  tradingSession: TradingSession | null;
  currentStep: SessionStep;
  sessionError: Error | null;
  isTradingSessionComplete: boolean | undefined;
  isSafeDeployed: boolean;
  initializeTradingSession: () => Promise<void>;
  initSafeDeployment: () => Promise<void>;
  initTradingCredentials: () => Promise<void>;
  endTradingSession: () => void;
  clobClient: ClobClient | null;
  relayClient: RelayClient | null;
  eoaAddress: string | undefined;
  safeAddress: string | undefined;
  isGeoblocked: boolean;
  isGeoblockLoading: boolean;
  geoblockStatus: GeoblockStatus | null;
}

const TradingContext = createContext<TradingContextType | null>(null);

export function useTrading() {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error("useTrading must be used within TradingProvider");
  return ctx;
}

export default function TradingProvider({ children }: { children: ReactNode }) {
  const { eoaAddress } = useWallet();
  const { derivedSafeAddressFromEoa } = useSafeDeployment(eoaAddress);

  const {
    isBlocked: isGeoblocked,
    isLoading: isGeoblockLoading,
    geoblockStatus,
  } = useGeoblock();

  const {
    tradingSession,
    currentStep,
    sessionError,
    isTradingSessionComplete,
    isSafeDeployed,
    initializeTradingSession: initSession,
    initSafeDeployment: initSafe,
    initTradingCredentials: initCreds,
    endTradingSession,
    relayClient,
  } = useTradingSession();

  const { clobClient } = useClobClient(
    tradingSession,
    isTradingSessionComplete
  );

  const geoGuard = useCallback(
    <T extends (...args: any[]) => Promise<void>>(fn: T) =>
      async (...args: Parameters<T>) => {
        if (isGeoblocked) {
          throw new Error(
            "Trading is not available in your region. Polymarket is geoblocked in your location."
          );
        }
        return fn(...args);
      },
    [isGeoblocked]
  );

  const initializeTradingSession = useCallback(
    () => geoGuard(initSession)(),
    [geoGuard, initSession]
  );
  const initSafeDeployment = useCallback(
    () => geoGuard(initSafe)(),
    [geoGuard, initSafe]
  );
  const initTradingCredentials = useCallback(
    () => geoGuard(initCreds)(),
    [geoGuard, initCreds]
  );

  return (
    <TradingContext.Provider
      value={{
        tradingSession,
        currentStep,
        sessionError,
        isTradingSessionComplete,
        isSafeDeployed,
        initializeTradingSession,
        initSafeDeployment,
        initTradingCredentials,
        endTradingSession,
        clobClient,
        relayClient,
        eoaAddress,
        safeAddress: derivedSafeAddressFromEoa,
        isGeoblocked,
        isGeoblockLoading,
        geoblockStatus,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
}
