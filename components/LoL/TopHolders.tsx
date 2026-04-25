"use client";

import type { TokenHolders } from "@/hooks/useTopHolders";
import { formatAddress } from "@/utils/formatting";
import { POLYMARKET_PROFILE_URL } from "@/constants/api";
import WalletAvatar from "@/components/shared/WalletAvatar";

interface TopHoldersProps {
  data: TokenHolders[];
  outcomes: string[];
  isLoading: boolean;
}

function formatHolderAmount(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  return amount.toFixed(0);
}

export default function TopHolders({
  data,
  outcomes,
  isLoading,
}: TopHoldersProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-3 h-3 rounded-full bg-purple-400/40 animate-pulse" />
      </div>
    );
  }

  // Merge holders from all tokens, tag each with their outcome
  const allHolders = data.flatMap((tokenData) =>
    tokenData.holders.map((h) => ({
      ...h,
      outcome: outcomes[h.outcomeIndex] || `Outcome ${h.outcomeIndex}`,
    }))
  );

  // Sort by amount descending
  const sorted = allHolders.sort((a, b) => b.amount - a.amount);

  if (sorted.length === 0) {
    return (
      <p className="text-xs text-white/20 text-center py-3">
        No holders data available
      </p>
    );
  }

  // Find max amount for bar scaling
  const maxAmount = sorted[0].amount;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
          Top Traders
        </span>
        <span className="text-[10px] text-white/20">
          {sorted.length} holder{sorted.length !== 1 ? "s" : ""}
        </span>
      </div>

      {sorted.slice(0, 10).map((holder, i) => {
        const displayName =
          holder.displayUsernamePublic && holder.name
            ? holder.name
            : holder.pseudonym || formatAddress(holder.proxyWallet);
        const isTeamA = holder.outcomeIndex === 0;
        const barColor = isTeamA ? "bg-green-500/30" : "bg-red-500/30";
        const textColor = isTeamA ? "text-green-400" : "text-red-400";
        const barWidth =
          maxAmount > 0 ? Math.max((holder.amount / maxAmount) * 100, 4) : 0;

        return (
          <div key={`${holder.proxyWallet}-${holder.outcomeIndex}`} className="relative">
            {/* Background bar */}
            <div
              className={`absolute inset-y-0 left-0 rounded-lg ${barColor} transition-all duration-300`}
              style={{ width: `${barWidth}%` }}
            />

            {/* Content */}
            <div className="relative flex items-center justify-between py-1.5 px-2.5 rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] text-white/20 font-data w-4 shrink-0">
                  {i + 1}
                </span>
                <a
                  href={POLYMARKET_PROFILE_URL(holder.proxyWallet)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
                >
                  <WalletAvatar
                    address={holder.proxyWallet}
                    name={displayName}
                    imageUrl={holder.profileImageOptimized || holder.profileImage || null}
                    size="xs"
                  />
                  <span className="text-xs text-white/70 truncate hover:text-purple-400 transition-colors">
                    {displayName}
                  </span>
                </a>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className={`text-[10px] font-semibold ${textColor}`}>
                  {holder.outcome}
                </span>
                <span className="text-xs font-data text-white/50">
                  {formatHolderAmount(holder.amount)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
