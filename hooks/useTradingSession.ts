import { useState, useCallback, useEffect, useRef } from "react";
import useRelayClient from "@/hooks/useRelayClient";
import { useWallet } from "@/providers/WalletContext";
import useTokenApprovals from "@/hooks/useTokenApprovals";
import useDepositWallet from "@/hooks/useDepositWallet";
import useUserApiCredentials from "@/hooks/useUserApiCredentials";

import {
  loadSession,
  saveSession,
  clearSession as clearStoredSession,
  TradingSession,
  SessionStep,
} from "@/utils/session";

export default function useTradingSession() {
  const [currentStep, setCurrentStep] = useState<SessionStep>("idle");
  const [sessionError, setSessionError] = useState<Error | null>(null);
  const [tradingSession, setTradingSession] = useState<TradingSession | null>(
    null
  );

  const { eoaAddress, walletClient, ethersSigner } = useWallet();
  const { createOrDeriveUserApiCredentials } = useUserApiCredentials();
  const { checkAllTokenApprovals, setAllTokenApprovals } = useTokenApprovals();
  const { deriveDepositWalletAddress, isWalletDeployed, deployDepositWallet } =
    useDepositWallet(eoaAddress);
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

  // ── Phase 1: Deposit wallet deployment (runs on wallet connect) ──
  const initWalletDeployment = useCallback(async () => {
    if (!eoaAddress) throw new Error("Wallet not connected");

    setCurrentStep("checking");
    setSessionError(null);

    try {
      const initializedRelayClient = await initializeRelayClient();

      const walletAddress = await deriveDepositWalletAddress(initializedRelayClient);
      if (!walletAddress) throw new Error("Failed to derive deposit wallet address");

      const deployed = await isWalletDeployed(initializedRelayClient, walletAddress);

      if (!deployed) {
        setCurrentStep("deploying");
        await deployDepositWallet(initializedRelayClient);
      }

      const existing = loadSession(eoaAddress);
      const newSession: TradingSession = {
        eoaAddress,
        depositWalletAddress: walletAddress,
        isWalletDeployed: true,
        hasApiCredentials: existing?.hasApiCredentials || false,
        hasApprovals: existing?.hasApprovals || false,
        apiCredentials: existing?.apiCredentials,
        lastChecked: Date.now(),
      };

      setTradingSession(newSession);
      saveSession(eoaAddress, newSession);
      setCurrentStep("wallet-complete");

      setTimeout(() => {
        setCurrentStep("idle");
      }, 1500);
    } catch (err) {
      console.error("Deposit wallet deployment error:", err);
      const error = err instanceof Error ? err : new Error("Unknown error");
      setSessionError(error);
      setCurrentStep("idle");
    }
  }, [
    eoaAddress,
    deriveDepositWalletAddress,
    isWalletDeployed,
    deployDepositWallet,
    initializeRelayClient,
  ]);

  // Auto-trigger Phase 1 on wallet connect
  const hasAutoInitRef = useRef(false);
  useEffect(() => {
    if (!eoaAddress || !ethersSigner) return;

    const stored = loadSession(eoaAddress);
    if (stored?.isWalletDeployed || hasAutoInitRef.current) return;

    hasAutoInitRef.current = true;
    initWalletDeployment().catch((err) => {
      console.error("Auto deposit wallet deployment failed:", err);
    });
  }, [eoaAddress, ethersSigner, initWalletDeployment]);

  useEffect(() => {
    hasAutoInitRef.current = false;
  }, [eoaAddress]);

  // ── Phase 2: API credentials + token approvals (runs on first order) ──
  const initTradingCredentials = useCallback(async () => {
    if (!eoaAddress) throw new Error("Wallet not connected");

    setSessionError(null);

    try {
      let activeRelayClient = relayClient;
      if (!activeRelayClient) {
        activeRelayClient = await initializeRelayClient();
      }

      const session = loadSession(eoaAddress);
      const walletAddress = session?.depositWalletAddress;
      if (!walletAddress) throw new Error("Deposit wallet not deployed yet");

      // Get API credentials
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
      const approvalStatus = await checkAllTokenApprovals(walletAddress);

      let hasApprovals = false;
      if (approvalStatus.allApproved) {
        hasApprovals = true;
      } else {
        hasApprovals = await setAllTokenApprovals(activeRelayClient, walletAddress);
      }

      const newSession: TradingSession = {
        eoaAddress,
        depositWalletAddress: walletAddress,
        isWalletDeployed: true,
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
    createOrDeriveUserApiCredentials,
    checkAllTokenApprovals,
    setAllTokenApprovals,
    initializeRelayClient,
  ]);

  const initializeTradingSession = useCallback(async () => {
    await initWalletDeployment();
    await initTradingCredentials();
  }, [initWalletDeployment, initTradingCredentials]);

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
      tradingSession?.isWalletDeployed &&
      tradingSession?.hasApiCredentials &&
      tradingSession?.hasApprovals,
    isWalletDeployed: tradingSession?.isWalletDeployed || false,
    initializeTradingSession,
    initWalletDeployment,
    initTradingCredentials,
    endTradingSession,
    relayClient,
  };
}
