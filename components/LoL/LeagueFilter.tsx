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
    <div className="flex gap-1 flex-wrap">
      <button
        onClick={() => onLeagueChange(null)}
        className={cn(
          "px-3 py-1 rounded-md text-xs font-medium transition-all",
          activeLeague === null
            ? "bg-white/8 text-white"
            : "text-white/25 hover:text-white/50"
        )}
      >
        All
      </button>
      {leagues.map((league) => (
        <button
          key={league}
          onClick={() => onLeagueChange(league)}
          className={cn(
            "px-3 py-1 rounded-md text-xs font-medium transition-all",
            activeLeague === league
              ? "bg-white/8 text-white"
              : "text-white/25 hover:text-white/50"
          )}
        >
          {league}
        </button>
      ))}
    </div>
  );
}
