"use client";

import type { PolymarketPosition } from "@/hooks/useUserPositions";
import { formatCurrency, formatShares } from "@/utils/formatting";

interface PositionCardProps {
  position: PolymarketPosition;
  onSell: (position: PolymarketPosition) => void;
  onRedeem: (position: PolymarketPosition) => void;
  isSelling: boolean;
  isRedeeming: boolean;
  isPendingVerification: boolean;
  isSubmitting: boolean;
  canSell: boolean;
  canRedeem: boolean;
}

export default function PositionCard({
  position,
  onSell,
  onRedeem,
  isSelling,
  isRedeeming,
  isPendingVerification,
  isSubmitting,
  canSell,
  canRedeem,
}: PositionCardProps) {
  const isProfit = position.cashPnl >= 0;
  const accentColor = isProfit ? "green" : "red";
  const priceUp = position.curPrice >= position.avgPrice;

  const pnlSign = isProfit ? "+" : "";
  const pctSign = position.percentPnl >= 0 ? "+" : "";

  const curPriceCents = Math.round(position.curPrice * 100);
  const avgPriceCents = Math.round(position.avgPrice * 100);

  return (
    <div
      className={`relative rounded-xl border backdrop-blur-sm overflow-hidden transition-all ${
        position.redeemable
          ? "bg-purple-500/5 border-purple-500/15"
          : isProfit
            ? "bg-green-500/3 border-white/6 hover:border-green-500/15"
            : "bg-red-500/3 border-white/6 hover:border-red-500/15"
      }`}
    >
      {/* Accent stripe */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-0.5 ${
          position.redeemable
            ? "bg-purple-400"
            : accentColor === "green"
              ? "bg-green-400/60"
              : "bg-red-400/60"
        }`}
      />

      <div className="px-4 pt-3 pb-2.5 space-y-2.5">
        {/* Row 1: Title + P&L */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {position.icon && (
              <img
                src={position.icon}
                alt=""
                className="w-7 h-7 rounded-lg shrink-0 object-cover"
              />
            )}
            <div className="min-w-0">
              <h3 className="text-[13px] font-semibold text-white/90 truncate">
                {position.title}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    position.outcome === "Yes"
                      ? "bg-green-500/10 text-green-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {position.outcome}
                </span>
                <span className="text-[10px] text-white/25">
                  {formatShares(position.size)} shares @ {avgPriceCents}
                  <span className="opacity-50">&#162;</span>
                </span>
              </div>
            </div>
          </div>

          {/* P&L badge */}
          <div className="text-right shrink-0">
            <span
              className={`font-data text-base font-bold tabular-nums ${
                isProfit ? "text-green-400" : "text-red-400"
              }`}
            >
              {pnlSign}
              {formatCurrency(position.cashPnl)}
            </span>
            <p
              className={`font-data text-[10px] tabular-nums ${
                isProfit ? "text-green-400/60" : "text-red-400/60"
              }`}
            >
              {pctSign}
              {position.percentPnl.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Row 2: Stats */}
        <div className="flex items-center gap-5 text-[13px]">
          <div>
            <span className="text-white/30">Current </span>
            <span className="font-data font-semibold text-white/80 tabular-nums">
              {curPriceCents}
              <span className="opacity-40">&#162;</span>
            </span>
            <span className={`ml-0.5 text-[10px] ${priceUp ? "text-green-400/60" : "text-red-400/60"}`}>
              {priceUp ? "▲" : "▼"}
            </span>
          </div>
          <div>
            <span className="text-white/30">Value </span>
            <span className="font-data font-semibold text-white/80 tabular-nums">
              {formatCurrency(position.currentValue)}
            </span>
          </div>
          <div>
            <span className="text-white/30">Cost </span>
            <span className="font-data text-white/45 tabular-nums">
              {formatCurrency(position.initialValue)}
            </span>
          </div>
        </div>

        {/* Row 3: Action + Redeemable badge */}
        {position.redeemable ? (
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[10px] font-semibold text-purple-300/80 uppercase tracking-wider">
              Market resolved
            </span>
            <button
              onClick={() => onRedeem(position)}
              disabled={isRedeeming || !canRedeem}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer
                bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/20 hover:border-purple-500/30
                disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isRedeeming ? "Redeeming..." : "Redeem"}
            </button>
          </div>
        ) : (
          <div className="flex justify-end pt-0.5">
            <button
              onClick={() => onSell(position)}
              disabled={isSelling || isSubmitting || !canSell || isPendingVerification}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer
                bg-red-500/10 hover:bg-red-500/20 text-red-300/80 hover:text-red-300 border border-red-500/15 hover:border-red-500/25
                disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isSelling || isPendingVerification ? "Selling..." : "Market Sell"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
