"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import usePriceHistory from "@/hooks/usePriceHistory";

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
  if (interval === "1h" || interval === "6h" || interval === "1d") {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const date = new Date(label * 1000);

  const teamA = payload.find((p: any) => p.dataKey === "teamA");
  const teamB = payload.find((p: any) => p.dataKey === "teamB");

  return (
    <div className="flex flex-col gap-1.5">
      {/* Team A card */}
      {teamA?.value != null && (
        <div className="bg-[#14141f] border border-green-500/20 rounded-md px-2.5 py-1.5 shadow-xl">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-[10px] text-white/50 truncate max-w-20">{teamA.name}</span>
            <span className="font-data text-xs font-bold text-green-400 tabular-nums ml-auto">
              {teamA.value.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
      {/* Team B card */}
      {teamB?.value != null && (
        <div className="bg-[#14141f] border border-red-500/20 rounded-md px-2.5 py-1.5 shadow-xl">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <span className="text-[10px] text-white/50 truncate max-w-20">{teamB.name}</span>
            <span className="font-data text-xs font-bold text-red-400 tabular-nums ml-auto">
              {teamB.value.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
      {/* Date */}
      <p className="text-[9px] text-white/25 text-center">
        {date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })}
      </p>
    </div>
  );
}

function CustomLegend({ payload }: any) {
  if (!payload?.length) return null;
  return (
    <div className="flex items-center justify-center gap-4 mt-1">
      {payload.map((entry: any) => (
        <div key={entry.value} className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-[10px] text-white/50 truncate max-w-24">{entry.value}</span>
        </div>
      ))}
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

  const { data: historyA, isLoading: loadingA } = usePriceHistory({
    tokenId: tokenIds[0],
    interval,
    enabled,
  });

  const { data: historyB, isLoading: loadingB } = usePriceHistory({
    tokenId: tokenIds[1],
    interval,
    enabled,
  });

  const isLoading = loadingA || loadingB;

  const chartData = useMemo(() => {
    if (!historyA?.length && !historyB?.length) return [];

    const map = new Map<number, { t: number; teamA?: number; teamB?: number }>();

    if (historyA) {
      for (const p of historyA) {
        map.set(p.t, { t: p.t, teamA: p.p * 100 });
      }
    }
    if (historyB) {
      for (const p of historyB) {
        const existing = map.get(p.t);
        if (existing) {
          existing.teamB = p.p * 100;
        } else {
          map.set(p.t, { t: p.t, teamB: p.p * 100 });
        }
      }
    }

    const sorted = Array.from(map.values()).sort((a, b) => a.t - b.t);

    // Forward-fill so every point has both values
    let lastA: number | undefined;
    let lastB: number | undefined;
    for (const point of sorted) {
      if (point.teamA != null) lastA = point.teamA; else if (lastA != null) point.teamA = lastA;
      if (point.teamB != null) lastB = point.teamB; else if (lastB != null) point.teamB = lastB;
    }

    return sorted;
  }, [historyA, historyB]);

  const priceChange = useMemo(() => {
    if (!historyA || historyA.length < 2) return null;
    const first = historyA[0].p * 100;
    const last = historyA[historyA.length - 1].p * 100;
    return { delta: last - first };
  }, [historyA]);

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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {priceChange && (
            <span
              className={`text-[10px] font-bold font-data ${
                priceChange.delta >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {priceChange.delta >= 0 ? "+" : ""}
              {priceChange.delta.toFixed(1)}%
            </span>
          )}
        </div>

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
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="gradientA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ade80" stopOpacity={0.1} />
              <stop offset="100%" stopColor="#4ade80" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradientB" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f87171" stopOpacity={0.1} />
              <stop offset="100%" stopColor="#f87171" stopOpacity={0} />
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
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 9, fill: "rgba(255,255,255,0.15)" }}
            axisLine={false}
            tickLine={false}
            width={35}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
          <Area
            type="monotone"
            dataKey="teamA"
            name={teamNames[0]}
            stroke="#4ade80"
            strokeWidth={1.5}
            fill="url(#gradientA)"
            dot={false}
            activeDot={{ r: 3, fill: "#4ade80", stroke: "rgba(0,0,0,0.5)", strokeWidth: 1 }}
            connectNulls
          />
          <Area
            type="monotone"
            dataKey="teamB"
            name={teamNames[1]}
            stroke="#f87171"
            strokeWidth={1.5}
            fill="url(#gradientB)"
            dot={false}
            activeDot={{ r: 3, fill: "#f87171", stroke: "rgba(0,0,0,0.5)", strokeWidth: 1 }}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
