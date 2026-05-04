"use client";

import { createContext, useContext, ReactNode, useCallback } from "react";
import type { ClobClient } from "@polymarket/clob-client-v2";
import type { RelayClient } from "@polymarket/builder-relayer-client";
import { useWallet } from "./WalletContext";
import useClobClient from "@/hooks/useClobClient";
import useTradingSession from "@/hooks/useTradingSession";
import useGeoblock, { GeoblockStatus } from "@/hooks/useGeoblock";
import { TradingSession, SessionStep } from "@/utils/session";

interface TradingContextType {
  tradingSession: TradingSession | null;
  currentStep: SessionStep;
  sessionError: Error | null;
  isTradingSessionComplete: boolean | undefined;
  isWalletDeployed: boolean;
  initializeTradingSession: () => Promise<void>;
  initWalletDeployment: () => Promise<void>;
  initTradingCredentials: () => Promise<void>;
  endTradingSession: () => void;
  clobClient: ClobClient | null;
  relayClient: RelayClient | null;
  eoaAddress: string | undefined;
  depositWalletAddress: string | undefined;
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
    isWalletDeployed,
    initializeTradingSession: initSession,
    initWalletDeployment: initWallet,
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
  const initWalletDeployment = useCallback(
    () => geoGuard(initWallet)(),
    [geoGuard, initWallet]
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
        isWalletDeployed,
        initializeTradingSession,
        initWalletDeployment,
        initTradingCredentials,
        endTradingSession,
        clobClient,
        relayClient,
        eoaAddress,
        depositWalletAddress: tradingSession?.depositWalletAddress,
        isGeoblocked,
        isGeoblockLoading,
        geoblockStatus,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
}
