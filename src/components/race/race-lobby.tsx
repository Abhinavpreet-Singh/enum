"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Copy,
  Loader2,
  Play,
  Swords,
  User,
  Users,
} from "lucide-react";
import { useAuthContext } from "@/providers/AuthProvider";
import { apiUrl } from "@/lib/api-config";
import { getMemoryToken } from "@/lib/tokenStore";
import { getSocket } from "@/lib/socket";
import {
  buildRaceArenaPath,
  buildRaceInviteUrl,
  getStoredRaceUsername,
} from "@/components/race/race-landing";
import RaceSettingsPanel, {
  type RaceCatalogQuestion,
  type RaceSettingsDraft,
} from "@/components/race/race-settings-panel";
import type { CompetitionState } from "@/hooks/useQuestionCompetition";

function withLocalFlags(
  state: CompetitionState,
  userId?: string,
): CompetitionState {
  if (!userId) return state;
  const isParticipant = state.participants.some((p) => p.userId === userId);
  const hostUserId =
    state.hostUserId ?? state.participants[0]?.userId ?? null;
  const isHost = Boolean(hostUserId && hostUserId === userId);
  const isWaiting = state.status === "waiting";
  const isCompleted = state.status === "completed";

  return {
    ...state,
    hostUserId,
    isParticipant,
    isHost,
    isWaiting,
    isActive: state.status === "active",
    canJoin: !isCompleted && !state.isFull && !isParticipant,
    canStart: isWaiting && isHost && state.participantCount >= 2,
    canEnd: isHost && (isWaiting || state.status === "active"),
    editorLocked: isWaiting && isParticipant,
    isWinner: state.winner?.id === userId,
  };
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export default function RaceLobby({ competitionId }: { competitionId: string }) {
  const router = useRouter();
  const { user } = useAuthContext();
  const userId = user?.id;
  const [competition, setCompetition] = useState<CompetitionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [catalogQuestions, setCatalogQuestions] = useState<RaceCatalogQuestion[]>(
    [],
  );
  const [catalogLoading, setCatalogLoading] = useState(false);
  const joinedRef = useRef(false);
  const competitionIdRef = useRef(competitionId);

  const authHeaders = useCallback(() => {
    const token = getMemoryToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const fetchCompetition = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(apiUrl(`/api/v1/competitions/${competitionId}`), {
        credentials: "include",
        headers: authHeaders(),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.message || "Race not found");
      }
      const next = json.data?.competition
        ? withLocalFlags(json.data.competition, userId)
        : null;
      setCompetition(next);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load race");
    } finally {
      setLoading(false);
    }
  }, [authHeaders, competitionId, userId]);

  const joinRace = useCallback(async () => {
    if (!userId || joining) return;
    const username = getStoredRaceUsername();
    if (!username) {
      router.replace(`/dashboard/race?invite=${encodeURIComponent(competitionId)}`);
      return;
    }

    setJoining(true);
    try {
      const res = await fetch(apiUrl("/api/v1/competitions/join"), {
        method: "POST",
        credentials: "include",
        headers: authHeaders(),
        body: JSON.stringify({ competitionId, username }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.message || "Could not join race");
      }
      const next = json.data?.competition
        ? withLocalFlags(json.data.competition, userId)
        : null;
      setCompetition(next);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join race");
    } finally {
      setJoining(false);
    }
  }, [authHeaders, competitionId, joining, router, userId]);

  useEffect(() => {
    setLoading(true);
    void fetchCompetition();
  }, [fetchCompetition]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setCatalogLoading(true);
    void (async () => {
      try {
        const res = await fetch(apiUrl("/api/v1/competitions/catalog/questions"), {
          credentials: "include",
          headers: authHeaders(),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || cancelled) return;
        setTopics(Array.isArray(json.data?.topics) ? json.data.topics : []);
        setCatalogQuestions(
          Array.isArray(json.data?.questions) ? json.data.questions : [],
        );
      } catch {
        // Catalog is optional for guests; host can still use defaults.
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authHeaders, userId]);

  // Auto-join lobby if not already a participant.
  useEffect(() => {
    if (!competition || !userId || joining || joinedRef.current) return;
    if (competition.isParticipant) {
      joinedRef.current = true;
      return;
    }
    if (competition.status !== "waiting" || !competition.canJoin) return;
    joinedRef.current = true;
    void joinRace();
  }, [competition, joinRace, joining, userId]);

  // Socket live updates
  useEffect(() => {
    if (!userId) return;
    const socket = getSocket();
    competitionIdRef.current = competitionId;

    const joinRoom = () => {
      socket.emit("competition:join", { competitionId });
    };

    const handleState = (state: CompetitionState) => {
      if (state.id !== competitionId) return;
      setCompetition(withLocalFlags(state, userId));
    };

    socket.on("connect", joinRoom);
    socket.on("competition:state", handleState);
    if (!socket.connected) socket.connect();
    else joinRoom();

    return () => {
      socket.emit("competition:leave", { competitionId });
      socket.off("connect", joinRoom);
      socket.off("competition:state", handleState);
    };
  }, [competitionId, userId]);

  // When race starts, go to the arena.
  useEffect(() => {
    if (!competition || competition.status !== "active") return;
    const firstQuestionId =
      competition.questionIds?.[0] || competition.questionId;
    router.replace(buildRaceArenaPath(firstQuestionId, competition.id));
  }, [competition, router]);

  // Completed race — send back to landing.
  useEffect(() => {
    if (!competition || competition.status !== "completed") return;
    router.replace("/dashboard/race");
  }, [competition, router]);

  async function handleCopyInvite() {
    const url = buildRaceInviteUrl(competitionId);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy invite link:", url);
    }
  }

  async function handleSaveSettings(draft: RaceSettingsDraft) {
    if (!competition?.id) return;
    setSavingSettings(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/v1/competitions/settings"), {
        method: "POST",
        credentials: "include",
        headers: authHeaders(),
        body: JSON.stringify({
          competitionId: competition.id,
          excludeTopics: draft.excludeTopics,
          questionCount: draft.questionCount,
          includedQuestionIds: draft.includedQuestionIds,
          mode: draft.mode,
          durationSeconds:
            draft.mode === "timed" ? draft.durationSeconds ?? 900 : null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.message || "Could not save settings");
      }
      const next = json.data?.competition
        ? withLocalFlags(json.data.competition, userId)
        : null;
      setCompetition(next);
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleStart() {
    if (!competition?.id) return;
    setStarting(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/v1/competitions/start"), {
        method: "POST",
        credentials: "include",
        headers: authHeaders(),
        body: JSON.stringify({ competitionId: competition.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.message || "Could not start race");
      }
      const next = json.data?.competition
        ? withLocalFlags(json.data.competition, userId)
        : null;
      setCompetition(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start race");
    } finally {
      setStarting(false);
    }
  }

  async function handleEnd() {
    if (!competition?.id) return;
    if (!window.confirm("End this race for everyone?")) return;
    setEnding(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/v1/competitions/end"), {
        method: "POST",
        credentials: "include",
        headers: authHeaders(),
        body: JSON.stringify({ competitionId: competition.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.message || "Could not end race");
      }
      router.push("/dashboard/race");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not end race");
    } finally {
      setEnding(false);
    }
  }

  const slots = useMemo(() => {
    const max = competition?.maxParticipants ?? 5;
    const filled = competition?.participants ?? [];
    return Array.from({ length: max }, (_, index) => filled[index] ?? null);
  }, [competition]);

  const setupSummary = useMemo(() => {
    if (!competition?.settings) return "Configure the race, then invite friends.";
    const s = competition.settings;
    const mode =
      s.mode === "timed"
        ? `Timed (${Math.round((s.durationSeconds || 900) / 60)}m)`
        : "First to finish";
    const q = `${s.questionCount} question${s.questionCount === 1 ? "" : "s"}`;
    return `${mode} · ${q}`;
  }, [competition?.settings]);

  if (loading || !userId) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="mx-auto max-w-lg border border-gray-200 bg-white p-8 text-center dark:border-white/10 dark:bg-black">
        <p className="font-mono text-sm text-gray-600 dark:text-gray-400">
          {error || "Race not found"}
        </p>
        <button
          type="button"
          onClick={() => router.push("/dashboard/race")}
          className="mt-4 inline-flex items-center gap-2 font-mono text-sm text-black underline dark:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Quick Race
        </button>
      </div>
    );
  }

  const isHost = Boolean(competition.isHost);
  const canStart = Boolean(competition.canStart);
  const waitingCount = competition.participantCount;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pb-10 pt-4 sm:px-6 sm:pt-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push("/dashboard/race")}
          className="inline-flex items-center gap-2 font-mono text-xs text-gray-500 transition-colors hover:text-black dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Leave lobby
        </button>
        <div className="flex items-center gap-3">
          {competition.canEnd ? (
            <button
              type="button"
              onClick={() => void handleEnd()}
              disabled={ending}
              className="font-mono text-xs text-red-600 transition-colors hover:text-red-700 disabled:opacity-50 dark:text-red-400"
            >
              {ending ? "Ending…" : "End race"}
            </button>
          ) : null}
          <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
            Quick Race lobby
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex h-9 w-9 items-center justify-center border border-black/10 dark:border-white/15">
            <Swords className="h-4 w-4" />
          </div>
          <h1 className="font-mono text-2xl font-bold tracking-tight text-black dark:text-white sm:text-3xl">
            Versus lobby
          </h1>
          <p className="mt-1 max-w-xl font-mono text-sm text-gray-600 dark:text-gray-400">
            {setupSummary}
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-gray-500 dark:text-gray-400">
          <Users className="h-3.5 w-3.5" />
          {waitingCount}/{competition.maxParticipants} in lobby
        </div>
      </div>

      <RaceSettingsPanel
        competition={competition}
        isHost={isHost}
        topics={topics}
        questions={catalogQuestions}
        catalogLoading={catalogLoading}
        saving={savingSettings}
        onSave={handleSaveSettings}
      />

      <div className="space-y-4">
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {slots.map((player, index) => {
            const empty = !player;
            const isYou = player?.userId === userId;
            const host = index === 0 && !!player;

            return (
              <div
                key={player?.id ?? `slot-${index}`}
                className={`relative flex min-h-28 min-w-0 flex-col items-center justify-center gap-2 overflow-hidden border p-2 sm:min-h-34 sm:gap-3 sm:p-3 transition-colors ${
                  empty
                    ? "border-dashed border-gray-300 bg-gray-50/80 dark:border-white/15 dark:bg-white/2"
                    : isYou
                      ? "border-black bg-white dark:border-white dark:bg-white/6"
                      : "border-gray-200 bg-white dark:border-white/10 dark:bg-black"
                }`}
              >
                {empty ? (
                  <>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-300 sm:h-11 sm:w-11 dark:border-white/20">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-gray-400 sm:text-[10px]">
                      Slot {index + 1}
                    </p>
                  </>
                ) : (
                  <>
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold sm:h-11 sm:w-11 sm:text-xs ${
                        isYou
                          ? "bg-black text-white dark:bg-white dark:text-black"
                          : "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-white"
                      }`}
                    >
                      {initials(player.username)}
                    </div>
                    <div className="w-full min-w-0 px-0.5 text-center">
                      <p
                        className="truncate font-mono text-[11px] font-semibold text-black sm:text-xs dark:text-white"
                        title={
                          isYou ? `${player.username} (you)` : player.username
                        }
                      >
                        {player.username}
                        {isYou ? " (you)" : ""}
                      </p>
                      <p className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-gray-500 sm:text-[10px] dark:text-gray-400">
                        {host ? "Host" : "Ready"}
                      </p>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-black sm:flex-row">
          <button
            type="button"
            onClick={() => void handleCopyInvite()}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 border border-gray-200 bg-transparent px-4 font-mono text-sm font-medium text-black transition-colors hover:border-black hover:bg-gray-50 dark:border-white/10 dark:text-white dark:hover:border-white dark:hover:bg-white/6"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Invite copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy invite link
              </>
            )}
          </button>

          {isHost ? (
            <button
              type="button"
              onClick={() => void handleStart()}
              disabled={!canStart || starting}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 border border-black bg-black px-4 font-mono text-sm font-medium text-white transition-colors hover:bg-black/90 disabled:pointer-events-none disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-white/90"
            >
              {starting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Start race
                </>
              )}
            </button>
          ) : (
            <div className="inline-flex h-11 flex-1 items-center justify-center gap-2 border border-gray-200 px-4 font-mono text-sm text-gray-500 dark:border-white/10 dark:text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Waiting for host
            </div>
          )}
        </div>

        {isHost && waitingCount < 2 ? (
          <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
            Share the invite link — you need at least one more player to start.
          </p>
        ) : null}

        {!isHost ? (
          <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
            Hang tight. Problems unlock when the host starts the race.
          </p>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="rounded border border-black/15 px-3 py-2 font-mono text-xs text-black/70 dark:border-white/15 dark:text-white/70"
          >
            {error}
          </p>
        ) : null}

        {(joining || !competition.isParticipant) &&
        competition.status === "waiting" ? (
          <p className="font-mono text-xs text-gray-400">Joining lobby...</p>
        ) : null}
      </div>
    </div>
  );
}
