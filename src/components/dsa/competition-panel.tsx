"use client";

import {
  Trophy,
  Users,
  Loader2,
  Swords,
  Crown,
  Lock,
} from "lucide-react";
import type { CompetitionState } from "@/hooks/useQuestionCompetition";

interface CompetitionPanelProps {
  competition: CompetitionState | null;
  loading: boolean;
  isParticipant: boolean;
  isWinner: boolean;
  editorLocked: boolean;
}

export default function CompetitionPanel({
  competition,
  loading,
  isParticipant,
  isWinner,
  editorLocked,
}: CompetitionPanelProps) {
  if (loading) {
    return (
      <div className="border-b border-gray-200 dark:border-white/10 bg-amber-50/50 dark:bg-amber-500/5 px-4 py-3 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
        <span className="font-mono text-xs text-amber-700 dark:text-amber-300">
          Loading race...
        </span>
      </div>
    );
  }

  if (!competition || !isParticipant) return null;

  const isCompleted = competition.status === "completed";

  return (
    <div
      className={`border-b px-4 py-3 ${
        isCompleted
          ? isWinner
            ? "border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10"
            : editorLocked
              ? "border-red-200 dark:border-red-500/20 bg-red-50/80 dark:bg-red-500/5"
              : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/3"
          : "border-amber-200 dark:border-amber-500/20 bg-amber-50/60 dark:bg-amber-500/5"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            {isCompleted ? (
              isWinner ? (
                <Crown className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : editorLocked ? (
                <Lock className="w-4 h-4 text-red-500 shrink-0" />
              ) : (
                <Trophy className="w-4 h-4 text-gray-500 shrink-0" />
              )
            ) : (
              <Swords className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            )}
            <span className="font-mono text-xs font-medium tracking-wide uppercase text-gray-800 dark:text-gray-200">
              {isCompleted
                ? isWinner
                  ? "You won the race!"
                  : editorLocked
                    ? "Race over"
                    : "Race completed"
                : "Live race"}
            </span>
          </div>

          {isCompleted && competition.winner && (
            <p className="font-mono text-xs text-gray-700 dark:text-gray-300 mb-2">
              {isWinner ? (
                "You were first to pass all test cases."
              ) : (
                <>
                  <span className="font-semibold">
                    {competition.winner.username}
                  </span>{" "}
                  won by passing all test cases first.
                </>
              )}
            </p>
          )}

          {!isCompleted && (
            <p className="font-mono text-[11px] text-gray-600 dark:text-gray-400 mb-2">
              First to pass all test cases wins. Others get locked out.
            </p>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-gray-500 dark:text-gray-400">
              <Users className="w-3.5 h-3.5" />
              {competition.participantCount}/{competition.maxParticipants}
            </span>
            {competition.participants.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {competition.participants.map((p) => (
                  <span
                    key={p.id}
                    className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
                      competition.winner?.id === p.userId
                        ? "border-emerald-400 bg-emerald-100 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300"
                        : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {p.username}
                    {competition.winner?.id === p.userId ? " ★" : ""}
                  </span>
                ))}
              </div>
            )}
          </div>

          {editorLocked && !isWinner && (
            <p className="mt-2 font-mono text-[10px] text-red-700 dark:text-red-300">
              Editor locked — you can view results but cannot submit new code.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
