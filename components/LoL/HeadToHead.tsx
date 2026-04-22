"use client";

import useHeadToHead, { type H2HMatch } from "@/hooks/useHeadToHead";

interface HeadToHeadProps {
  teamA: string;
  teamB: string;
  enabled: boolean;
}

function MatchRow({
  match,
  teamAId,
  teamBId,
  teamAName,
  teamBName,
}: {
  match: H2HMatch;
  teamAId: number;
  teamBId: number;
  teamAName: string;
  teamBName: string;
}) {
  const date = new Date(match.scheduledAt);
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });

  const teamAResult = match.results.find((r) => r.teamId === teamAId);
  const teamBResult = match.results.find((r) => r.teamId === teamBId);
  const teamAScore = teamAResult?.score ?? 0;
  const teamBScore = teamBResult?.score ?? 0;
  const teamAWon = match.winnerId === teamAId;
  const teamBWon = match.winnerId === teamBId;

  return (
    <div className="flex items-center gap-2 py-1.5 text-[11px]">
      <span className="text-white/20 font-data w-16 shrink-0">{dateStr}</span>
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <span
          className={`truncate ${teamAWon ? "text-white/70 font-semibold" : "text-white/25"}`}
        >
          {teamAName}
        </span>
        <div className="flex items-center gap-1 shrink-0 font-data">
          <span className={`font-bold ${teamAWon ? "text-green-400" : "text-white/30"}`}>
            {teamAScore}
          </span>
          <span className="text-white/10">-</span>
          <span className={`font-bold ${teamBWon ? "text-green-400" : "text-white/30"}`}>
            {teamBScore}
          </span>
        </div>
        <span
          className={`truncate ${teamBWon ? "text-white/70 font-semibold" : "text-white/25"}`}
        >
          {teamBName}
        </span>
      </div>
      {match.league && (
        <span className="text-white/10 truncate max-w-[50px] shrink-0">
          {match.league.name}
        </span>
      )}
    </div>
  );
}

export default function HeadToHead({ teamA, teamB, enabled }: HeadToHeadProps) {
  const { data, isLoading, error } = useHeadToHead(teamA, teamB, enabled);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <div className="w-3 h-3 rounded-full border-2 border-purple-400/40 border-t-purple-400 animate-spin" />
        <span className="text-[11px] text-white/30">Loading match history...</span>
      </div>
    );
  }

  if (error || data?.error) {
    return (
      <div className="py-2">
        <span className="text-[11px] text-white/20">
          Match history unavailable
        </span>
      </div>
    );
  }

  if (!data || !data.summary || data.matches.length === 0) {
    return (
      <div className="py-2">
        <span className="text-[11px] text-white/20">
          No previous matches found
        </span>
      </div>
    );
  }

  const { summary, matches } = data;
  const teamAId = data.teamA.id!;
  const teamBId = data.teamB.id!;

  // Winrate bar
  const total = summary.teamAWins + summary.teamBWins;
  const teamAPct = total > 0 ? Math.round((summary.teamAWins / total) * 100) : 50;
  const teamBPct = total > 0 ? 100 - teamAPct : 50;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <svg
          className="w-3.5 h-3.5 text-purple-400/70"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
          />
        </svg>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-purple-400/70">
          Head-to-Head
        </span>
        <span className="text-[10px] text-white/15 font-data ml-auto">
          {summary.totalMatches} match{summary.totalMatches !== 1 ? "es" : ""}
        </span>
      </div>

      {/* Summary bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-green-400/70 font-data font-bold">
            {teamA} {summary.teamAWins}W
          </span>
          <span className="text-red-400/70 font-data font-bold">
            {summary.teamBWins}W {teamB}
          </span>
        </div>
        <div className="h-1 rounded-full overflow-hidden flex bg-white/5">
          <div
            className="bg-green-500/50 transition-all duration-500 rounded-l-full"
            style={{ width: `${teamAPct}%` }}
          />
          <div
            className="bg-red-500/50 transition-all duration-500 rounded-r-full"
            style={{ width: `${teamBPct}%` }}
          />
        </div>
      </div>

      {/* Recent matches */}
      <div className="space-y-0">
        {matches.slice(0, 5).map((match) => (
          <MatchRow
            key={match.id}
            match={match}
            teamAId={teamAId}
            teamBId={teamBId}
            teamAName={teamA}
            teamBName={teamB}
          />
        ))}
      </div>
    </div>
  );
}
