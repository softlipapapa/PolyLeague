"use client";

import { useState } from "react";
import useOrderBook from "@/hooks/useOrderBook";

interface OrderBookProps {
  tokenIds: string[];
  outcomes: string[];
  enabled: boolean;
}

function formatPrice(price: string): string {
  return (parseFloat(price) * 100).toFixed(1);
}

function formatSize(size: string): string {
  const n = parseFloat(size);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

const DISPLAY_LEVELS = 5;

export default function OrderBook({ tokenIds, outcomes, enabled }: OrderBookProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const tokenId = tokenIds[selectedIdx] || null;

  const { data, isLoading } = useOrderBook({ tokenId, enabled });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-3 h-3 rounded-full bg-purple-400/40 animate-pulse" />
      </div>
    );
  }

  if (!data || (data.bids.length === 0 && data.asks.length === 0)) {
    return (
      <p className="text-xs text-white/20 text-center py-3">
        No order book data
      </p>
    );
  }

  const bids = data.bids.slice(0, DISPLAY_LEVELS);
  const asks = data.asks.slice(0, DISPLAY_LEVELS);

  const maxBidSize = Math.max(...bids.map((b) => parseFloat(b.size)), 1);
  const maxAskSize = Math.max(...asks.map((a) => parseFloat(a.size)), 1);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
          Order Book
        </span>
        <span className="text-[10px] text-white/20 font-data">
          Spread {(data.spread * 100).toFixed(1)}¢
        </span>
      </div>

      {/* Team selector */}
      {outcomes.length >= 2 && (
        <div className="flex gap-1 px-1 mb-2">
          {outcomes.map((name, i) => (
            <button
              key={i}
              onClick={() => setSelectedIdx(i)}
              className={`flex-1 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-all ${
                selectedIdx === i
                  ? i === 0
                    ? "bg-green-500/15 text-green-400 border border-green-500/25"
                    : "bg-red-500/15 text-red-400 border border-red-500/25"
                  : "text-white/25 hover:text-white/40 border border-transparent"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Column headers */}
      <div className="flex items-center justify-between px-2.5 mb-1">
        <span className="text-[9px] uppercase tracking-wider text-white/20">
          Price
        </span>
        <span className="text-[9px] uppercase tracking-wider text-white/20">
          Size
        </span>
      </div>

      {/* Asks (sells) — reversed so lowest ask is at bottom near spread */}
      <div className="space-y-px">
        {[...asks].reverse().map((level, i) => {
          const barWidth = (parseFloat(level.size) / maxAskSize) * 100;
          return (
            <div key={`ask-${i}`} className="relative">
              <div
                className="absolute inset-y-0 right-0 rounded-lg bg-red-500/15 transition-all duration-300"
                style={{ width: `${barWidth}%` }}
              />
              <div className="relative flex items-center justify-between py-1 px-2.5 rounded-lg">
                <span className="text-xs font-data text-red-400">
                  {formatPrice(level.price)}¢
                </span>
                <span className="text-xs font-data text-white/40">
                  {formatSize(level.size)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Spread indicator */}
      <div className="flex items-center justify-center py-1.5 gap-2">
        <div className="h-px flex-1 bg-white/5" />
        <span className="text-[10px] font-data text-white/30">
          {(data.midpoint * 100).toFixed(1)}¢
        </span>
        <div className="h-px flex-1 bg-white/5" />
      </div>

      {/* Bids (buys) */}
      <div className="space-y-px">
        {bids.map((level, i) => {
          const barWidth = (parseFloat(level.size) / maxBidSize) * 100;
          return (
            <div key={`bid-${i}`} className="relative">
              <div
                className="absolute inset-y-0 right-0 rounded-lg bg-green-500/15 transition-all duration-300"
                style={{ width: `${barWidth}%` }}
              />
              <div className="relative flex items-center justify-between py-1 px-2.5 rounded-lg">
                <span className="text-xs font-data text-green-400">
                  {formatPrice(level.price)}¢
                </span>
                <span className="text-xs font-data text-white/40">
                  {formatSize(level.size)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
