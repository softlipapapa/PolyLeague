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
    <div className="flex gap-2 flex-wrap">
      <button
        onClick={() => onLeagueChange(null)}
        className={cn(
          "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
          activeLeague === null
            ? "bg-purple-600 text-white shadow-lg shadow-purple-600/25"
            : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10"
        )}
      >
        All
      </button>
      {leagues.map((league) => (
        <button
          key={league}
          onClick={() => onLeagueChange(league)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
            activeLeague === league
              ? "bg-purple-600 text-white shadow-lg shadow-purple-600/25"
              : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10"
          )}
        >
          {league}
        </button>
      ))}
    </div>
  );
}
