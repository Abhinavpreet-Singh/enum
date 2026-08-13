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
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
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
    router.replace(
      buildRaceArenaPath(competition.questionId, competition.id),
    );
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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6">
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

      <div className="text-center">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center border border-black/10 dark:border-white/15">
          <Swords className="h-5 w-5" />
        </div>
        <h1 className="font-mono text-3xl font-bold tracking-tight text-black dark:text-white sm:text-4xl">
          Versus
        </h1>
        <p className="mt-2 font-mono text-sm text-gray-600 dark:text-gray-400">
          Race friends on the same problem. First to pass every test wins.
        </p>
      </div>

      {/* Player grid — NeetCode-style slots */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {slots.map((player, index) => {
          const empty = !player;
          const isYou = player?.userId === userId;
          const host = index === 0 && !!player;

          return (
            <div
              key={player?.id ?? `slot-${index}`}
              className={`relative flex min-h-[7.5rem] min-w-0 flex-col items-center justify-center gap-2 overflow-hidden border p-2 sm:min-h-[9rem] sm:gap-3 sm:p-4 transition-colors ${
                empty
                  ? "border-dashed border-gray-300 bg-gray-50/80 dark:border-white/15 dark:bg-white/[0.02]"
                  : isYou
                    ? "border-black bg-white dark:border-white dark:bg-white/[0.06]"
                    : "border-gray-200 bg-white dark:border-white/10 dark:bg-black"
              }`}
            >
              {empty ? (
                <>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-300 sm:h-14 sm:w-14 dark:border-white/20">
                    <User className="h-4 w-4 text-gray-400 sm:h-5 sm:w-5" />
                  </div>
                  <div className="w-full min-w-0 px-0.5 text-center">
                    <p className="hidden truncate font-mono text-sm text-gray-400 sm:block">
                      Waiting for player...
                    </p>
                    <p className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-gray-400 sm:mt-1 sm:text-[10px]">
                      Slot {index + 1}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold sm:h-14 sm:w-14 sm:text-sm ${
                      isYou
                        ? "bg-black text-white dark:bg-white dark:text-black"
                        : "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-white"
                    }`}
                  >
                    {initials(player.username)}
                  </div>
                  <div className="w-full min-w-0 px-0.5 text-center">
                    <p
                      className="truncate font-mono text-xs font-semibold text-black sm:text-sm dark:text-white"
                      title={
                        isYou ? `${player.username} (you)` : player.username
                      }
                    >
                      {player.username}
                      {isYou ? " (you)" : ""}
                    </p>
                    <p className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-gray-500 sm:mt-1 sm:text-[10px] dark:text-gray-400">
                      {host ? "Host" : "Ready"}
                    </p>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-4 border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-black">
        <div className="flex items-center gap-2 font-mono text-xs text-gray-500 dark:text-gray-400">
          <Users className="h-3.5 w-3.5" />
          {waitingCount}/{competition.maxParticipants} in lobby
        </div>

        <div className="flex w-full flex-col gap-3 sm:max-w-md sm:flex-row">
          <button
            type="button"
            onClick={() => void handleCopyInvite()}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 border border-gray-200 bg-transparent px-4 font-mono text-sm font-medium text-black transition-colors hover:border-black hover:bg-gray-50 dark:border-white/10 dark:text-white dark:hover:border-white dark:hover:bg-white/[0.06]"
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
          <p className="text-center font-mono text-xs text-gray-500 dark:text-gray-400">
            Share the invite link — you need at least one more player to start.
          </p>
        ) : null}

        {!isHost ? (
          <p className="text-center font-mono text-xs text-gray-500 dark:text-gray-400">
            Hang tight. The problem unlocks when the host starts the race.
          </p>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="w-full rounded border border-black/15 px-3 py-2 text-center font-mono text-xs text-black/70 dark:border-white/15 dark:text-white/70"
          >
            {error}
          </p>
        ) : null}

        {(joining || !competition.isParticipant) && competition.status === "waiting" ? (
          <p className="font-mono text-xs text-gray-400">Joining lobby...</p>
        ) : null}
      </div>
    </div>
  );
}
