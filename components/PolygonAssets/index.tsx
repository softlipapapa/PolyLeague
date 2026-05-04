"use client";

import { useState } from "react";
import { useTrading } from "@/providers/TradingProvider";
import usePolygonBalances from "@/hooks/usePolygonBalances";

import TransferModal from "@/components/PolygonAssets/TransferModal";

export default function PolygonAssets() {
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const { depositWalletAddress } = useTrading();
  const { tokens, formattedTotal, isLoading, isError } = usePolygonBalances(
    depositWalletAddress
  );

  if (!depositWalletAddress) {
    return null;
  }

  return (
    <div className="glass px-5 py-4">
      {/* Total balance */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-data tabular-nums">
            {isLoading ? (
              <span className="text-white/20">--</span>
            ) : isError ? (
              "$0.00"
            ) : (
              `$${formattedTotal}`
            )}
          </span>
          <span className="text-xs text-white/25 font-medium">Total</span>
        </div>
        <button
          onClick={() => setIsTransferModalOpen(true)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/30 hover:text-white/70 hover:bg-white/5 transition-all cursor-pointer"
        >
          Send
        </button>
      </div>

      {/* Token breakdown */}
      {!isLoading && tokens.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {tokens.map((t) => (
            <div key={t.symbol} className="flex items-baseline gap-1.5">
              <span className="text-xs font-data text-white/50 tabular-nums">
                {t.formatted}
              </span>
              <span className="text-[10px] text-white/20 font-medium">
                {t.symbol}
              </span>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <p className="text-[10px] text-white/15 mt-1">
          Could not load balance
        </p>
      )}

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
      />
    </div>
  );
}
