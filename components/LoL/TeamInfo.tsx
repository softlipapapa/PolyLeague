"use client";

import useTeamInfo, { type TeamInfoData } from "@/hooks/useTeamInfo";

// Role display order: Top → Jungle → Mid → ADC → Support
const ROLE_ORDER: Record<string, number> = {
  top: 0,
  jun: 1,
  mid: 2,
  adc: 3,
  sup: 4,
};

const ROLE_LABELS: Record<string, string> = {
  top: "TOP",
  jun: "JNG",
  mid: "MID",
  adc: "ADC",
  sup: "SUP",
};

const ROLE_COLORS: Record<string, string> = {
  top: "text-blue-400/70",
  jun: "text-green-400/70",
  mid: "text-amber-400/70",
  adc: "text-red-400/70",
  sup: "text-cyan-400/70",
};

interface TeamInfoProps {
  teamName: string;
  enabled: boolean;
}

function FormStreak({ form }: { form: ("W" | "L")[] }) {
  return (
    <div className="flex items-center gap-0.5">
      {form.slice(0, 10).map((result, i) => (
        <span
          key={i}
          className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center ${
            result === "W"
              ? "bg-green-500/20 text-green-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {result}
        </span>
      ))}
    </div>
  );
}

function RecentMatchRow({
  match,
  teamId,
}: {
  match: TeamInfoData["recentMatches"][number];
  teamId: number;
}) {
  const date = new Date(match.scheduledAt);
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const won = match.winnerId === teamId;
  const opponent = match.opponents.find((o) => o.id !== teamId);
  const teamResult = match.results.find((r) => r.teamId === teamId);
  const oppResult = match.results.find((r) => r.teamId !== teamId);

  return (
    <div className="flex items-center gap-2 py-1 text-[11px]">
      <span
        className={`w-5 text-center font-bold text-[10px] ${
          won ? "text-green-400" : "text-red-400"
        }`}
      >
        {won ? "W" : "L"}
      </span>
      <span className="text-white/40 font-data w-12 shrink-0">{dateStr}</span>
      <span className="text-white/50 truncate flex-1">
        vs {opponent?.name || "Unknown"}
      </span>
      <span className="font-data font-bold shrink-0">
        <span className={won ? "text-green-400" : "text-white/30"}>
          {teamResult?.score ?? 0}
        </span>
        <span className="text-white/10 mx-0.5">-</span>
        <span className={!won ? "text-green-400" : "text-white/30"}>
          {oppResult?.score ?? 0}
        </span>
      </span>
      {match.league && (
        <span className="text-white/15 truncate max-w-[40px] shrink-0 text-[10px]">
          {match.league.name}
        </span>
      )}
    </div>
  );
}

export default function TeamInfo({ teamName, enabled }: TeamInfoProps) {
  const { data, isLoading, error } = useTeamInfo(teamName, enabled);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <div className="w-3 h-3 rounded-full border-2 border-purple-400/40 border-t-purple-400 animate-spin" />
        <span className="text-[11px] text-white/30">Loading team info...</span>
      </div>
    );
  }

  if (error || data?.error || !data?.team) {
    return (
      <div className="py-2">
        <span className="text-[11px] text-white/20">Team info unavailable</span>
      </div>
    );
  }

  const { team, players, recentMatches, recentForm } = data;

  const sortedPlayers = [...players].sort(
    (a, b) =>
      (ROLE_ORDER[a.role || ""] ?? 99) - (ROLE_ORDER[b.role || ""] ?? 99)
  );

  return (
    <div className="space-y-3">
      {/* Header: Team name + winrate */}
      <div className="flex items-center justify-between">
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
              d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
            />
          </svg>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-400">
            {team.acronym || team.name}
          </span>
        </div>
        {recentForm.total > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-white/30 font-data">
              {recentForm.wins}W-{recentForm.losses}L
            </span>
            <span
              className={`text-[10px] font-bold font-data ${
                recentForm.winrate >= 60
                  ? "text-green-400"
                  : recentForm.winrate >= 40
                    ? "text-amber-400"
                    : "text-red-400"
              }`}
            >
              {recentForm.winrate}%
            </span>
          </div>
        )}
      </div>

      {/* Recent form streak */}
      {recentForm.form.length > 0 && <FormStreak form={recentForm.form} />}

      {/* Roster */}
      {sortedPlayers.length > 0 && (
        <div className="space-y-0.5">
          {sortedPlayers.map((player) => (
            <div
              key={player.id}
              className="flex items-center gap-2 py-0.5 text-[11px]"
            >
              <span
                className={`w-6 text-[9px] font-bold ${
                  ROLE_COLORS[player.role || ""] || "text-white/30"
                }`}
              >
                {ROLE_LABELS[player.role || ""] || player.role?.toUpperCase() || "—"}
              </span>
              <span className="text-white/70 font-medium">{player.name}</span>
              {player.nationality && (
                <span className="text-white/15 text-[10px]">
                  {player.nationality}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Recent matches */}
      {recentMatches.length > 0 && (
        <div className="space-y-0 pt-1 border-t border-white/5">
          <span className="text-[9px] font-semibold uppercase tracking-widest text-white/20 mb-1 block">
            Recent
          </span>
          {recentMatches.slice(0, 5).map((match) => (
            <RecentMatchRow
              key={match.id}
              match={match}
              teamId={team.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
