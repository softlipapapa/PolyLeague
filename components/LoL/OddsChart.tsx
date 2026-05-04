"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import usePriceHistory, { type PricePoint } from "@/hooks/usePriceHistory";

type Interval = "1h" | "6h" | "1d" | "1w" | "1m" | "all";

const INTERVALS: { value: Interval; label: string }[] = [
  { value: "1h", label: "1H" },
  { value: "6h", label: "6H" },
  { value: "1d", label: "1D" },
  { value: "1w", label: "1W" },
  { value: "1m", label: "1M" },
  { value: "all", label: "All" },
];

function formatTime(timestamp: number, interval: Interval): string {
  const date = new Date(timestamp * 1000);
  if (interval === "1h" || interval === "6h") {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
  if (interval === "1d") {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as PricePoint & { pct: number };
  const date = new Date(point.t * 1000);

  return (
    <div className="glass px-3 py-2 text-xs shadow-lg">
      <p className="text-white/50 mb-1">
        {date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })}
      </p>
      <p className="font-data font-bold text-green-400">
        {point.pct.toFixed(1)}%
      </p>
    </div>
  );
}

interface OddsChartProps {
  tokenIds: [string, string];
  teamNames: [string, string];
  enabled?: boolean;
}

export default function OddsChart({
  tokenIds,
  teamNames,
  enabled = true,
}: OddsChartProps) {
  const [interval, setInterval] = useState<Interval>("1d");
  const [selectedTeam, setSelectedTeam] = useState<0 | 1>(0);

  const tokenId = tokenIds[selectedTeam];
  const teamName = teamNames[selectedTeam];

  const { data: history, isLoading } = usePriceHistory({
    tokenId,
    interval,
    enabled,
  });

  const chartData = useMemo(() => {
    if (!history?.length) return [];
    return history.map((p) => ({
      ...p,
      pct: p.p * 100,
    }));
  }, [history]);

  // Price change
  const priceChange = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0].pct;
    const last = chartData[chartData.length - 1].pct;
    return { delta: last - first, current: last };
  }, [chartData]);

  if (isLoading) {
    return (
      <div className="h-32 flex items-center justify-center">
        <div className="w-3 h-3 rounded-full bg-purple-400/40 animate-pulse" />
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <p className="text-[11px] text-white/15 text-center py-4">
        No price history available
      </p>
    );
  }

  const isUp = priceChange ? priceChange.delta >= 0 : true;
  const strokeColor = isUp ? "#4ade80" : "#f87171";
  const fillColor = isUp
    ? "rgba(74, 222, 128, 0.08)"
    : "rgba(248, 113, 113, 0.08)";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Team toggle */}
          <div className="flex rounded-md overflow-hidden border border-white/8">
            {teamNames.map((name, i) => (
              <button
                key={i}
                onClick={() => setSelectedTeam(i as 0 | 1)}
                className={`px-2 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer truncate max-w-24 ${
                  selectedTeam === i
                    ? i === 0
                      ? "bg-green-500/15 text-green-400"
                      : "bg-red-500/15 text-red-400"
                    : "text-white/25 hover:text-white/50"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
          {priceChange && (
            <span
              className={`text-[10px] font-bold font-data ${
                isUp ? "text-green-400" : "text-red-400"
              }`}
            >
              {isUp ? "+" : ""}
              {priceChange.delta.toFixed(1)}%
            </span>
          )}
        </div>

        {/* Interval selector */}
        <div className="flex gap-0.5">
          {INTERVALS.map((iv) => (
            <button
              key={iv.value}
              onClick={() => setInterval(iv.value)}
              className={`px-1.5 py-0.5 text-[9px] font-medium rounded transition-colors cursor-pointer ${
                interval === iv.value
                  ? "text-white/80 bg-white/8"
                  : "text-white/20 hover:text-white/40"
              }`}
            >
              {iv.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={`gradient-${tokenId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.15} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="t"
            tickFormatter={(t) => formatTime(t, interval)}
            tick={{ fontSize: 9, fill: "rgba(255,255,255,0.15)" }}
            axisLine={false}
            tickLine={false}
            minTickGap={40}
          />
          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={(v) => `${v.toFixed(0)}%`}
            tick={{ fontSize: 9, fill: "rgba(255,255,255,0.15)" }}
            axisLine={false}
            tickLine={false}
            width={35}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="pct"
            stroke={strokeColor}
            strokeWidth={1.5}
            fill={`url(#gradient-${tokenId})`}
            dot={false}
            activeDot={{
              r: 3,
              fill: strokeColor,
              stroke: "rgba(0,0,0,0.5)",
              strokeWidth: 1,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
