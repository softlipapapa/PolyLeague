"use client";

import { useWallet } from "@/providers/WalletContext";
import type { SessionStep } from "@/utils/session";

const STEP_LABELS: Record<string, string> = {
  checking: "Setting up trading account...",
  deploying: "Deploying your wallet (one-time)...",
  credentials: "Creating API credentials (one-time)...",
  approvals: "Approving tokens for trading (one-time)...",
};

interface Props {
  currentStep: SessionStep;
  error: Error | null;
  isComplete: boolean | undefined;
  onRetry: () => Promise<void>;
}

export default function TradingSession({
  currentStep,
  error,
  isComplete,
  onRetry,
}: Props) {
  const { eoaAddress } = useWallet();

  // Hide when not connected, or when session is fully ready
  if (!eoaAddress || isComplete) return null;

  const stepLabel = STEP_LABELS[currentStep];

  // Show progress banner during initialization
  if (stepLabel) {
    return (
      <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 flex items-center gap-3">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400 shrink-0" />
        <div>
          <p className="text-sm font-medium text-purple-300">{stepLabel}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            You may be asked to sign — this is a one-time setup.
          </p>
        </div>
      </div>
    );
  }

  // Show error with retry
  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-red-300">
              Trading setup failed
            </p>
            <p className="text-xs text-red-400 mt-1">{error.message}</p>
          </div>
          <button
            onClick={onRetry}
            className="px-4 py-2 text-sm bg-red-600/30 hover:bg-red-600/40 text-red-300 rounded-lg transition-colors shrink-0"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return null;
}
