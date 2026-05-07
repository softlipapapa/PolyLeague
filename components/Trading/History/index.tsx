"use client";

import { useTrading } from "@/providers/TradingProvider";
import useTradeHistory, { type TradeActivity } from "@/hooks/useTradeHistory";

import ErrorState from "@/components/shared/ErrorState";
import EmptyState from "@/components/shared/EmptyState";
import LoadingState from "@/components/shared/LoadingState";
import { formatCurrency, formatShares } from "@/utils/formatting";

function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;

  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function TradeCard({ trade }: { trade: TradeActivity }) {
  const isBuy = trade.side === "BUY";
  const priceCents = Math.round(trade.price * 100);

  return (
    <div
      className={`relative rounded-xl border backdrop-blur-sm overflow-hidden transition-all ${
        isBuy
          ? "bg-green-500/3 border-white/6 hover:border-green-500/15"
          : "bg-red-500/3 border-white/6 hover:border-red-500/15"
      }`}
    >
      {/* Accent stripe */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-0.5 ${
          isBuy ? "bg-green-400/60" : "bg-red-400/60"
        }`}
      />

      <div className="px-4 pt-3 pb-2.5 space-y-2">
        {/* Row 1: Title + Side badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {trade.icon && (
              <img
                src={trade.icon}
                alt=""
                className="w-7 h-7 rounded-lg shrink-0 object-cover"
              />
            )}
            <div className="min-w-0">
              <h3 className="text-[13px] font-semibold text-white/90 truncate">
                {trade.title}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    isBuy
                      ? "bg-green-500/10 text-green-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {trade.side}
                </span>
                <span className="text-[10px] text-white/25">
                  {trade.outcome}
                </span>
              </div>
            </div>
          </div>

          {/* Total value */}
          <div className="text-right shrink-0">
            <span
              className={`font-data text-base font-bold tabular-nums ${
                isBuy ? "text-green-400" : "text-red-400"
              }`}
            >
              {isBuy ? "-" : "+"}
              {formatCurrency(trade.size * trade.price)}
            </span>
            <p className="text-[10px] text-white/20 font-data tabular-nums">
              {formatTimeAgo(trade.timestamp)}
            </p>
          </div>
        </div>

        {/* Row 2: Stats */}
        <div className="flex items-center gap-5 text-[13px]">
          <div>
            <span className="text-white/30">Price </span>
            <span className="font-data font-semibold text-white/80 tabular-nums">
              {priceCents}
              <span className="opacity-40">&#162;</span>
            </span>
          </div>
          <div>
            <span className="text-white/30">Shares </span>
            <span className="font-data font-semibold text-white/80 tabular-nums">
              {formatShares(trade.size)}
            </span>
          </div>
          {trade.transactionHash && (
            <div className="ml-auto">
              <a
                href={`https://polygonscan.com/tx/${trade.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-white/15 hover:text-white/40 transition-colors font-data"
              >
                tx ↗
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TradeHistory() {
  const { depositWalletAddress } = useTrading();

  const {
    data: trades,
    isLoading,
    error,
  } = useTradeHistory(depositWalletAddress as string | undefined);

  if (isLoading) {
    return <LoadingState message="Loading trade history..." />;
  }

  if (error) {
    return <ErrorState error={error} title="Error loading trade history" />;
  }

  if (!trades || trades.length === 0) {
    return (
      <EmptyState
        title="No Trade History"
        message="Your trades on RiftMarket will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2">
        <h3 className="text-sm font-semibold text-white/80">History</h3>
        <span className="text-xs text-white/20 font-data">{trades.length}</span>
      </div>

      <div className="space-y-2">
        {trades.map((trade) => (
          <TradeCard key={trade.id || `${trade.transactionHash}-${trade.asset}`} trade={trade} />
        ))}
      </div>
    </div>
  );
}
