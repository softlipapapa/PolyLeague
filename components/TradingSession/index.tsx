"use client";

import { useWallet } from "@/providers/WalletContext";
import type { SessionStep } from "@/utils/session";

const STEP_LABELS: Record<string, string> = {
  checking: "Setting up trading account",
  deploying: "Deploying wallet",
  credentials: "Creating credentials",
  approvals: "Approving tokens",
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

  if (!eoaAddress || isComplete) return null;

  const stepLabel = STEP_LABELS[currentStep];

  if (stepLabel) {
    return (
      <div className="glass px-5 py-3 flex items-center gap-3">
        <div className="relative flex h-3 w-3 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-50" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500" />
        </div>
        <div className="flex items-baseline gap-2">
          <p className="text-sm font-medium text-white/70">{stepLabel}</p>
          <p className="text-[11px] text-white/20">One-time setup</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass px-5 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-red-400/80">Setup failed</p>
          <p className="text-[11px] text-white/20 mt-0.5">{error.message}</p>
        </div>
        <button
          onClick={onRetry}
          className="px-3 py-1.5 text-xs font-medium text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-all cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  return null;
}
