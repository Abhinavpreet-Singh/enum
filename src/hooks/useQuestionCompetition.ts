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

export interface CompetitionState {
  id: string;
  questionId: string;
  maxParticipants: number;
  status: "active" | "completed";
  participantCount: number;
  isFull: boolean;
  winner: { id: string; username: string } | null;
  completedAt: string | null;
  createdAt: string;
  participants: CompetitionParticipant[];
  isParticipant: boolean;
  isWinner: boolean;
  editorLocked: boolean;
  canJoin: boolean;
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
      const next = data?.competition ?? null;
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
      if (state.questionId !== questionId) return;
      if (competitionId && state.id !== competitionId) return;
      setCompetition(state);
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

        const next = json.data?.competition ?? null;
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

      const next = json.data?.competition ?? null;
      setCompetition(next);
      competitionIdRef.current = next?.id ?? null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave competition");
    } finally {
      setLeaving(false);
    }
  }, [competition?.id]);

  const handleCompetitionSubmitResult = useCallback(
    (next: CompetitionState | null) => {
      if (next) {
        setCompetition(next);
        competitionIdRef.current = next.id;
      } else {
        fetchStatus();
      }
    },
    [fetchStatus],
  );

  return {
    competition,
    lastCompleted,
    canStartNew,
    loading,
    joining,
    leaving,
    error,
    join,
    leave,
    refresh: fetchStatus,
    handleCompetitionSubmitResult,
    isParticipant: competition?.isParticipant ?? false,
    editorLocked: competition?.editorLocked ?? false,
    isWinner: competition?.isWinner ?? false,
    canJoin:
      (competition?.canJoin ?? false) ||
      canStartNew ||
      competition?.status === "completed",
    isActive: competition?.status === "active",
    isCompleted: competition?.status === "completed",
  };
}
