import { useState, useCallback, useEffect, useRef } from "react";
import useRelayClient from "@/hooks/useRelayClient";
import { useWallet } from "@/providers/WalletContext";
import useTokenApprovals from "@/hooks/useTokenApprovals";
import useSafeDeployment from "@/hooks/useSafeDeployment";
import useUserApiCredentials from "@/hooks/useUserApiCredentials";

import {
  loadSession,
  saveSession,
  clearSession as clearStoredSession,
  TradingSession,
  SessionStep,
} from "@/utils/session";

// Two-phase trading session:
// Phase 1 (on wallet connect): relay client + Safe deployment
// Phase 2 (on first order): API credentials + token approvals

export default function useTradingSession() {
  const [currentStep, setCurrentStep] = useState<SessionStep>("idle");
  const [sessionError, setSessionError] = useState<Error | null>(null);
  const [tradingSession, setTradingSession] = useState<TradingSession | null>(
    null
  );

  const { eoaAddress, walletClient, ethersSigner } = useWallet();
  const { createOrDeriveUserApiCredentials } = useUserApiCredentials();
  const { checkAllTokenApprovals, setAllTokenApprovals } = useTokenApprovals();
  const { derivedSafeAddressFromEoa, isSafeDeployed, deploySafe } =
    useSafeDeployment(eoaAddress);
  const { relayClient, initializeRelayClient, clearRelayClient } =
    useRelayClient();

  // Load existing session from localStorage on wallet connect
  useEffect(() => {
    if (!eoaAddress) {
      setTradingSession(null);
      setCurrentStep("idle");
      setSessionError(null);
      return;
    }

    const stored = loadSession(eoaAddress);
    setTradingSession(stored);

    if (!stored) {
      setCurrentStep("idle");
      setSessionError(null);
    }
  }, [eoaAddress]);

  // Restore relay client when session exists
  useEffect(() => {
    if (tradingSession && !relayClient && eoaAddress && walletClient) {
      initializeRelayClient().catch((err) => {
        console.error("Failed to restore relay client:", err);
      });
    }
  }, [
    tradingSession,
    relayClient,
    eoaAddress,
    walletClient,
    initializeRelayClient,
  ]);

  // ── Phase 1: Safe deployment (runs on wallet connect) ──
  const initSafeDeployment = useCallback(async () => {
    if (!eoaAddress) throw new Error("Wallet not connected");

    setCurrentStep("checking");
    setSessionError(null);

    try {
      // Initialize relay client
      const initializedRelayClient = await initializeRelayClient();

      if (!derivedSafeAddressFromEoa)
        throw new Error("Failed to derive Safe address");

      // Check if Safe is already deployed
      const isDeployed = await isSafeDeployed(
        initializedRelayClient,
        derivedSafeAddressFromEoa
      );

      if (!isDeployed) {
        setCurrentStep("deploying");
        await deploySafe(initializedRelayClient);
      }

      // Save partial session (Safe deployed, no credentials yet)
      const existing = loadSession(eoaAddress);
      const newSession: TradingSession = {
        eoaAddress,
        safeAddress: derivedSafeAddressFromEoa,
        isSafeDeployed: true,
        hasApiCredentials: existing?.hasApiCredentials || false,
        hasApprovals: existing?.hasApprovals || false,
        apiCredentials: existing?.apiCredentials,
        lastChecked: Date.now(),
      };

      setTradingSession(newSession);
      saveSession(eoaAddress, newSession);
      setCurrentStep("safe-complete");

      // Auto-dismiss after brief success display
      setTimeout(() => {
        setCurrentStep("idle");
      }, 1500);
    } catch (err) {
      console.error("Safe deployment error:", err);
      const error = err instanceof Error ? err : new Error("Unknown error");
      setSessionError(error);
      setCurrentStep("idle");
    }
  }, [
    eoaAddress,
    derivedSafeAddressFromEoa,
    isSafeDeployed,
    deploySafe,
    initializeRelayClient,
  ]);

  // Auto-trigger Phase 1 on wallet connect
  const hasAutoInitRef = useRef(false);
  useEffect(() => {
    if (!eoaAddress || !ethersSigner || !derivedSafeAddressFromEoa) return;

    const stored = loadSession(eoaAddress);
    // Skip if Safe is already deployed or already attempted
    if (stored?.isSafeDeployed || hasAutoInitRef.current) return;

    hasAutoInitRef.current = true;
    initSafeDeployment().catch((err) => {
      console.error("Auto Safe deployment failed:", err);
    });
  }, [eoaAddress, ethersSigner, derivedSafeAddressFromEoa, initSafeDeployment]);

  useEffect(() => {
    hasAutoInitRef.current = false;
  }, [eoaAddress]);

  // ── Phase 2: API credentials + token approvals (runs on first order) ──
  const initTradingCredentials = useCallback(async () => {
    if (!eoaAddress) throw new Error("Wallet not connected");

    setSessionError(null);

    try {
      // Ensure relay client is ready
      let activeRelayClient = relayClient;
      if (!activeRelayClient) {
        activeRelayClient = await initializeRelayClient();
      }

      if (!derivedSafeAddressFromEoa)
        throw new Error("Failed to derive Safe address");

      // Get API credentials
      const session = loadSession(eoaAddress);
      let apiCreds = session?.apiCredentials;
      if (
        !session?.hasApiCredentials ||
        !apiCreds ||
        !apiCreds.key ||
        !apiCreds.secret ||
        !apiCreds.passphrase
      ) {
        setCurrentStep("credentials");
        apiCreds = await createOrDeriveUserApiCredentials();
      }

      // Token approvals
      setCurrentStep("approvals");
      const approvalStatus = await checkAllTokenApprovals(
        derivedSafeAddressFromEoa
      );

      let hasApprovals = false;
      if (approvalStatus.allApproved) {
        hasApprovals = true;
      } else {
        hasApprovals = await setAllTokenApprovals(activeRelayClient);
      }

      // Save complete session
      const newSession: TradingSession = {
        eoaAddress,
        safeAddress: derivedSafeAddressFromEoa,
        isSafeDeployed: true,
        hasApiCredentials: true,
        hasApprovals,
        apiCredentials: apiCreds,
        lastChecked: Date.now(),
      };

      setTradingSession(newSession);
      saveSession(eoaAddress, newSession);
      setCurrentStep("complete");
    } catch (err) {
      console.error("Trading credentials error:", err);
      const error = err instanceof Error ? err : new Error("Unknown error");
      setSessionError(error);
      setCurrentStep("idle");
    }
  }, [
    eoaAddress,
    relayClient,
    derivedSafeAddressFromEoa,
    createOrDeriveUserApiCredentials,
    checkAllTokenApprovals,
    setAllTokenApprovals,
    initializeRelayClient,
  ]);

  // Full init (for retry scenarios)
  const initializeTradingSession = useCallback(async () => {
    await initSafeDeployment();
    await initTradingCredentials();
  }, [initSafeDeployment, initTradingCredentials]);

  const endTradingSession = useCallback(() => {
    if (!eoaAddress) return;

    clearStoredSession(eoaAddress);
    setTradingSession(null);
    clearRelayClient();
    setCurrentStep("idle");
    setSessionError(null);
  }, [eoaAddress, clearRelayClient]);

  return {
    tradingSession,
    currentStep,
    sessionError,
    isTradingSessionComplete:
      tradingSession?.isSafeDeployed &&
      tradingSession?.hasApiCredentials &&
      tradingSession?.hasApprovals,
    isSafeDeployed: tradingSession?.isSafeDeployed || false,
    initializeTradingSession,
    initSafeDeployment,
    initTradingCredentials,
    endTradingSession,
    relayClient,
  };
}
