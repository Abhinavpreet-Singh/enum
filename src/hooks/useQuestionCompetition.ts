"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/api-config";
import { getMemoryToken } from "@/lib/tokenStore";
import { getSocket } from "@/lib/socket";
import { getStoredRaceUsername } from "@/components/race/race-landing";

export interface CompetitionParticipant {
  id: string;
  userId: string;
  username: string;
  joinedAt: string;
}

export interface CompetitionQuestionSummary {
  id: string;
  title: string;
  topic: string;
  level: string;
}

export interface CompetitionSettings {
  excludeTopics: string[];
  questionCount: number;
  includedQuestionIds: string[];
  mode: "first_solve" | "timed";
  durationSeconds: number | null;
}

export interface CompetitionState {
  id: string;
  questionId: string;
  questionIds?: string[];
  maxParticipants: number;
  status: "waiting" | "active" | "completed";
  participantCount: number;
  isFull: boolean;
  winner: { id: string; username: string } | null;
  completedAt: string | null;
  createdAt: string;
  participants: CompetitionParticipant[];
  settings?: CompetitionSettings;
  startedAt?: string | null;
  endsAt?: string | null;
  mySolvedQuestionIds?: string[];
  participantProgress?: Array<{
    userId: string;
    solvedCount: number;
    solvedQuestionIds: string[];
  }>;
  questions?: CompetitionQuestionSummary[];
  isParticipant: boolean;
  isWinner: boolean;
  isWaiting?: boolean;
  isActive?: boolean;
  hostUserId?: string | null;
  isHost?: boolean;
  editorLocked: boolean;
  canJoin: boolean;
  canStart?: boolean;
  canEnd?: boolean;
}

interface CompetitionStatusResponse {
  competition: CompetitionState | null;
  lastCompleted: CompetitionState | null;
  canStartNew: boolean;
}

interface UseQuestionCompetitionOptions {
  questionId: string;
  userId?: string;
  competitionId?: string | null;
  enabled?: boolean;
}

function withLocalFlags(
  state: CompetitionState,
  userId?: string,
): CompetitionState {
  if (!userId) return state;

  const isParticipant = state.participants.some((p) => p.userId === userId);
  const isWinner = state.winner?.id === userId;
  const hostUserId =
    state.hostUserId ?? state.participants[0]?.userId ?? null;
  const isHost = Boolean(hostUserId && hostUserId === userId);
  const isWaiting = state.status === "waiting";
  const isActive = state.status === "active";
  const isCompleted = state.status === "completed";

  return {
    ...state,
    hostUserId,
    isParticipant,
    isWinner,
    isHost,
    isWaiting,
    isActive,
    canJoin: !isCompleted && !state.isFull && !isParticipant,
    canStart: isWaiting && isHost && state.participantCount >= 2,
    canEnd: isHost && (isWaiting || isActive),
    editorLocked:
      (isWaiting && isParticipant) ||
      (isCompleted && Boolean(state.winner) && isParticipant && !isWinner),
  };
}

export function useQuestionCompetition({
  questionId,
  userId,
  competitionId = null,
  enabled = true,
}: UseQuestionCompetitionOptions) {
  const [competition, setCompetition] = useState<CompetitionState | null>(
    null,
  );
  const [lastCompleted, setLastCompleted] =
    useState<CompetitionState | null>(null);
  const [canStartNew, setCanStartNew] = useState(true);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const competitionIdRef = useRef<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!enabled || !questionId || !userId) {
      setCompetition(null);
      setLoading(false);
      return;
    }

    try {
      const token = getMemoryToken();
      const query = competitionId
        ? `?competitionId=${encodeURIComponent(competitionId)}`
        : "";
      const res = await fetch(
        apiUrl(`/api/v1/competitions/status/${questionId}${query}`),
        {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to load competition");
      }

      const json = await res.json();
      const data = json.data as CompetitionStatusResponse | undefined;
      const next = data?.competition
        ? withLocalFlags(data.competition, userId)
        : null;
      setCompetition(next);
      setLastCompleted(data?.lastCompleted ?? null);
      setCanStartNew(data?.canStartNew ?? !next);
      competitionIdRef.current = next?.id ?? competitionId ?? null;
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load competition");
    } finally {
      setLoading(false);
    }
  }, [enabled, questionId, userId, competitionId]);

  useEffect(() => {
    setLoading(true);
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!enabled || !userId) return;

    const socket = getSocket();

    const joinRoom = (id: string) => {
      socket.emit("competition:join", { competitionId: id });
    };

    const handleConnect = () => {
      if (competitionIdRef.current) {
        joinRoom(competitionIdRef.current);
      }
    };

    const handleState = (state: CompetitionState) => {
      const ids = state.questionIds?.length
        ? state.questionIds
        : [state.questionId];
      if (!ids.includes(questionId) && state.questionId !== questionId) return;
      if (competitionId && state.id !== competitionId) return;
      setCompetition(withLocalFlags(state, userId));
      competitionIdRef.current = state.id;
    };

    socket.on("connect", handleConnect);
    socket.on("competition:state", handleState);

    if (!socket.connected) {
      socket.connect();
    } else if (competitionIdRef.current) {
      joinRoom(competitionIdRef.current);
    }

    return () => {
      if (competitionIdRef.current) {
        socket.emit("competition:leave", {
          competitionId: competitionIdRef.current,
        });
      }
      socket.off("connect", handleConnect);
      socket.off("competition:state", handleState);
    };
  }, [enabled, questionId, userId, competitionId]);

  useEffect(() => {
    if (competition?.id) {
      competitionIdRef.current = competition.id;
      const socket = getSocket();
      if (socket.connected) {
        socket.emit("competition:join", { competitionId: competition.id });
      }
    }
  }, [competition?.id]);

  const join = useCallback(
    async (opts?: { competitionId?: string; username?: string }) => {
      if (!userId) return;
      setJoining(true);
      setError(null);
      try {
        const token = getMemoryToken();
        const username =
          opts?.username?.trim() || getStoredRaceUsername() || undefined;
        const res = await fetch(apiUrl("/api/v1/competitions/join"), {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            questionId,
            competitionId: opts?.competitionId ?? competitionId ?? undefined,
            ...(username ? { username } : {}),
          }),
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json.message || "Failed to join competition");
        }

        const next = json.data?.competition
          ? withLocalFlags(json.data.competition, userId)
          : null;
        setCompetition(next);
        competitionIdRef.current = next?.id ?? null;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to join competition",
        );
      } finally {
        setJoining(false);
      }
    },
    [questionId, userId, competitionId],
  );

  const leave = useCallback(async () => {
    if (!competition?.id) return;
    setLeaving(true);
    setError(null);
    try {
      const token = getMemoryToken();
      const res = await fetch(apiUrl("/api/v1/competitions/leave"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ competitionId: competition.id }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.message || "Failed to leave competition");
      }

      const next = json.data?.competition
        ? withLocalFlags(json.data.competition, userId)
        : null;
      setCompetition(next);
      competitionIdRef.current = next?.id ?? null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave competition");
    } finally {
      setLeaving(false);
    }
  }, [competition?.id, userId]);

  const start = useCallback(async () => {
    if (!competition?.id || !userId) return;
    setStarting(true);
    setError(null);
    try {
      const token = getMemoryToken();
      const res = await fetch(apiUrl("/api/v1/competitions/start"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ competitionId: competition.id }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.message || "Failed to start race");
      }

      const next = json.data?.competition
        ? withLocalFlags(json.data.competition, userId)
        : null;
      setCompetition(next);
      competitionIdRef.current = next?.id ?? null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start race");
      throw err;
    } finally {
      setStarting(false);
    }
  }, [competition?.id, userId]);

  const end = useCallback(async () => {
    if (!competition?.id || !userId) return;
    setEnding(true);
    setError(null);
    try {
      const token = getMemoryToken();
      const res = await fetch(apiUrl("/api/v1/competitions/end"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ competitionId: competition.id }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.message || "Failed to end race");
      }

      const next = json.data?.competition
        ? withLocalFlags(json.data.competition, userId)
        : null;
      setCompetition(next);
      competitionIdRef.current = next?.id ?? null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end race");
      throw err;
    } finally {
      setEnding(false);
    }
  }, [competition?.id, userId]);

  const settleTimed = useCallback(async () => {
    if (!competition?.id || !userId) return;
    if (competition.status !== "active") return;
    if (competition.settings?.mode !== "timed") return;
    try {
      const token = getMemoryToken();
      const res = await fetch(apiUrl("/api/v1/competitions/settle"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ competitionId: competition.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const next = json.data?.competition
        ? withLocalFlags(json.data.competition, userId)
        : null;
      if (next) {
        setCompetition(next);
        competitionIdRef.current = next.id;
      }
    } catch {
      // Non-fatal; status refresh / next submit will settle.
    }
  }, [
    competition?.id,
    competition?.status,
    competition?.settings?.mode,
    userId,
  ]);

  const handleCompetitionSubmitResult = useCallback(
    (next: CompetitionState | null) => {
      if (next) {
        setCompetition(withLocalFlags(next, userId));
        competitionIdRef.current = next.id;
      } else {
        fetchStatus();
      }
    },
    [fetchStatus, userId],
  );

  return {
    competition,
    lastCompleted,
    canStartNew,
    loading,
    joining,
    leaving,
    starting,
    ending,
    error,
    join,
    leave,
    start,
    end,
    settleTimed,
    refresh: fetchStatus,
    handleCompetitionSubmitResult,
    isParticipant: competition?.isParticipant ?? false,
    editorLocked: competition?.editorLocked ?? false,
    isWinner: competition?.isWinner ?? false,
    canJoin:
      (competition?.canJoin ?? false) ||
      canStartNew ||
      competition?.status === "completed",
    isWaiting: competition?.status === "waiting",
    isActive: competition?.status === "active",
    isCompleted: competition?.status === "completed",
    canStart: competition?.canStart ?? false,
    canEnd: competition?.canEnd ?? false,
    isHost: competition?.isHost ?? false,
  };
}
