"use client";

import type { SessionStep } from "@/utils/session";

interface SessionSetupModalProps {
  currentStep: SessionStep;
  error: Error | null;
  onRetry: () => void;
  onClose: () => void;
}

const STEP_CONFIG: Record<
  string,
  { title: string; description: string; stepNumber: number }
> = {
  checking: {
    title: "Checking account",
    description: "Verifying your trading account status...",
    stepNumber: 1,
  },
  deploying: {
    title: "Deploying Smart Wallet",
    description:
      "A signature is required to deploy your Safe wallet. Please approve the request in your wallet.",
    stepNumber: 2,
  },
  credentials: {
    title: "Creating Trading Credentials",
    description:
      "A signature is required to generate your API credentials. Please approve the request in your wallet.",
    stepNumber: 3,
  },
  approvals: {
    title: "Approving Tokens",
    description:
      "Setting up token approvals so you can trade. This may require a signature.",
    stepNumber: 4,
  },
  complete: {
    title: "You're all set!",
    description: "Trading session is ready. You can now place bets.",
    stepNumber: 5,
  },
};

const TOTAL_STEPS = 4;

export default function SessionSetupModal({
  currentStep,
  error,
  onRetry,
  onClose,
}: SessionSetupModalProps) {
  const config = STEP_CONFIG[currentStep];
  const isActive = !!config || !!error;
  const isComplete = currentStep === "complete";

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div className="glass p-6 w-full max-w-sm shadow-2xl shadow-black/50">
        {/* Error state */}
        {error ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <svg
                  className="w-5 h-5 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/90">
                  Setup Failed
                </h3>
                <p className="text-[11px] text-white/30 mt-0.5">
                  {error.message}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onRetry}
                className="flex-1 py-2.5 text-sm font-medium rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/20 transition-all cursor-pointer"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 text-sm font-medium rounded-xl bg-white/5 hover:bg-white/10 text-white/50 border border-white/8 transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </>
        ) : isComplete ? (
          /* Success state */
          <>
            <div className="flex flex-col items-center text-center py-2">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
                <svg
                  className="w-6 h-6 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-white/90 mb-1">
                {config!.title}
              </h3>
              <p className="text-xs text-white/30">{config!.description}</p>
            </div>
            <button
              onClick={onClose}
              className="w-full mt-4 py-2.5 text-sm font-medium rounded-xl bg-green-500/15 hover:bg-green-500/25 text-green-300 border border-green-500/20 transition-all cursor-pointer"
            >
              Start Betting
            </button>
          </>
        ) : (
          /* Loading state */
          <>
            <div className="flex items-center gap-4 mb-5">
              {/* Spinner */}
              <div className="w-10 h-10 shrink-0 relative">
                <svg
                  className="w-10 h-10 animate-spin"
                  viewBox="0 0 40 40"
                  fill="none"
                >
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    stroke="rgba(168,85,247,0.6)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="80"
                    strokeDashoffset="60"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/90">
                  {config!.title}
                </h3>
                <p className="text-xs text-white/35 mt-1 leading-relaxed">
                  {config!.description}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-3">
              <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-purple-500/50 rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${(config!.stepNumber / TOTAL_STEPS) * 100}%`,
                  }}
                />
              </div>
              <p className="text-[10px] text-white/15 mt-1.5 text-right font-data">
                Step {config!.stepNumber} of {TOTAL_STEPS}
              </p>
            </div>

            <p className="text-[10px] text-white/15 text-center">
              This is a one-time setup. Please don't close this window.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
