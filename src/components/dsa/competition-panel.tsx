"use client";

import {
  Trophy,
  Users,
  Loader2,
  Swords,
  Crown,
  Lock,
  Copy,
  Check,
  Square,
} from "lucide-react";
import { useState } from "react";
import type { CompetitionState } from "@/hooks/useQuestionCompetition";
import { buildRaceInviteUrl } from "@/components/race/race-landing";

interface CompetitionPanelProps {
  competition: CompetitionState | null;
  loading: boolean;
  isParticipant: boolean;
  isWinner: boolean;
  editorLocked: boolean;
  canEnd?: boolean;
  ending?: boolean;
  onEndRace?: () => void | Promise<void>;
}

export default function CompetitionPanel({
  competition,
  loading,
  isParticipant,
  isWinner,
  editorLocked,
  canEnd = false,
  ending = false,
  onEndRace,
}: CompetitionPanelProps) {
  const [copied, setCopied] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

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

  // Waiting state is handled on /dashboard/race/[id] lobby.
  if (!competition || !isParticipant || competition.status === "waiting") {
    return null;
  }

  const isCompleted = competition.status === "completed";
  const endedByHost = isCompleted && !competition.winner;

  async function handleCopyInvite() {
    const url = buildRaceInviteUrl(competition!.id);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy invite link:", url);
    }
  }

  async function handleConfirmEnd() {
    if (!onEndRace) return;
    try {
      await onEndRace();
      setConfirmEnd(false);
    } catch {
      // Error surfaced via hook / parent
    }
  }

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
                  : endedByHost
                    ? "Race ended"
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

          {endedByHost && (
            <p className="font-mono text-xs text-gray-700 dark:text-gray-300 mb-2">
              The host ended this race. No winner was declared.
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

        {!isCompleted && (
          <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              type="button"
              onClick={() => void handleCopyInvite()}
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-amber-300 dark:border-amber-500/40 bg-white dark:bg-black px-2.5 py-1.5 font-mono text-[10px] font-medium text-amber-800 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy invite
                </>
              )}
            </button>
            {canEnd && onEndRace ? (
              <button
                type="button"
                onClick={() => setConfirmEnd(true)}
                disabled={ending}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-red-600 px-2.5 py-1.5 font-mono text-[10px] font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {ending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Square className="w-3.5 h-3.5 fill-current" />
                )}
                End race
              </button>
            ) : null}
          </div>
        )}
      </div>

      {confirmEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60">
          <div className="w-full max-w-sm mx-4 border border-black/20 dark:border-white/20 bg-white dark:bg-black p-6 shadow-2xl">
            <h3 className="font-mono text-xs font-bold text-black dark:text-white uppercase mb-2">
              End race?
            </h3>
            <p className="font-mono text-xs text-gray-500 mb-5">
              This stops the live race for everyone. No winner will be declared.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setConfirmEnd(false)}
                disabled={ending}
                className="px-4 py-2 font-mono text-[10px] tracking-wider border border-black/20 dark:border-white/20 text-gray-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmEnd()}
                disabled={ending}
                className="px-4 py-2 font-mono text-[10px] tracking-wider bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {ending ? "Ending…" : "End race"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
