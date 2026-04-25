"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/utils/classNames";

interface LeagueFilterProps {
  leagues: string[];
  activeLeague: string | null;
  onLeagueChange: (league: string | null) => void;
}

const INLINE_COUNT = 6;

export default function LeagueFilter({
  leagues,
  activeLeague,
  onLeagueChange,
}: LeagueFilterProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  // Sort: major leagues first (exact match or prefix), then others
  // If active league is from overflow, promote it to inline first position
  const MAJOR_LEAGUES = ["LCK", "LPL", "LEC", "LCS", "LFL", "TCL", "LLA", "PCS", "VCS", "CBLOL", "LJL", "LCO"];

  const { inlineLeagues, overflowLeagues } = useMemo(() => {
    const isMajor = (name: string) =>
      MAJOR_LEAGUES.some((m) => name === m || name.startsWith(m + " "));

    const sorted = [...leagues].sort((a, b) => {
      const aMajor = isMajor(a) ? 0 : 1;
      const bMajor = isMajor(b) ? 0 : 1;
      if (aMajor !== bMajor) return aMajor - bMajor;
      // Among majors, exact matches first (e.g. "LCK" before "LCK Round 1-2")
      if (aMajor === 0) return a.length - b.length;
      return 0;
    });

    const baseInline = sorted.slice(0, INLINE_COUNT);
    const baseOverflow = sorted.slice(INLINE_COUNT);

    return { inlineLeagues: baseInline, overflowLeagues: baseOverflow };
  }, [leagues]);

  const activeInOverflow = activeLeague !== null && overflowLeagues.includes(activeLeague);
  const remainingOverflow = activeInOverflow
    ? overflowLeagues.filter((l) => l !== activeLeague)
    : overflowLeagues;

  const hasRemainingOverflow = remainingOverflow.length > 0;

  const chipClass = (active: boolean) =>
    cn(
      "px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all",
      active
        ? "bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30"
        : "bg-white/5 text-white/35 hover:text-white/60 hover:bg-white/8"
    );

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* All */}
      <button onClick={() => onLeagueChange(null)} className={chipClass(activeLeague === null)}>
        All
      </button>

      {/* Inline leagues */}
      {inlineLeagues.map((league) => (
        <button
          key={league}
          onClick={() => onLeagueChange(league)}
          className={chipClass(activeLeague === league)}
        >
          {league}
        </button>
      ))}

      {/* Selected overflow league — shown as its own pill */}
      {activeInOverflow && (
        <button
          onClick={() => onLeagueChange(activeLeague)}
          className={chipClass(true)}
        >
          {activeLeague}
        </button>
      )}

      {/* More dropdown */}
      {hasRemainingOverflow && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className={cn(
              chipClass(false),
              "flex items-center gap-1"
            )}
          >
            +{remainingOverflow.length}
            <svg
              className={`w-3 h-3 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute top-full right-0 mt-1.5 z-50 py-2 px-2 rounded-xl bg-[#15151f] border border-white/10 shadow-xl shadow-black/50">
              <div className="grid grid-flow-col grid-rows-[repeat(7,auto)] gap-1">
                {remainingOverflow.map((league) => (
                  <button
                    key={league}
                    onClick={() => {
                      onLeagueChange(league);
                      setDropdownOpen(false);
                    }}
                    className={chipClass(false)}
                  >
                    {league}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
