"use client";

import { cn } from "@/utils/classNames";

interface LeagueFilterProps {
  leagues: string[];
  activeLeague: string | null;
  onLeagueChange: (league: string | null) => void;
}

export default function LeagueFilter({
  leagues,
  activeLeague,
  onLeagueChange,
}: LeagueFilterProps) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      <button
        onClick={() => onLeagueChange(null)}
        className={cn(
          "px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all",
          activeLeague === null
            ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
            : "bg-white/3 text-gray-500 hover:text-white hover:bg-white/8 border border-white/6"
        )}
      >
        All
      </button>
      {leagues.map((league) => (
        <button
          key={league}
          onClick={() => onLeagueChange(league)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all",
            activeLeague === league
              ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
              : "bg-white/3 text-gray-500 hover:text-white hover:bg-white/8 border border-white/6"
          )}
        >
          {league}
        </button>
      ))}
    </div>
  );
}
