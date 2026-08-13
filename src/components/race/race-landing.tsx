"use client";

import { useContext, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, KeyRound, Loader2, Swords, User } from "lucide-react";
import { AuthContext } from "@/providers/AuthProvider";
import { apiUrl } from "@/lib/api-config";
import { getMemoryToken } from "@/lib/tokenStore";

const RACE_USERNAME_KEY = "race_username";

const inputClass =
  "h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 font-mono text-sm text-black outline-none transition-colors placeholder:text-gray-400 focus:border-black dark:border-white/10 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-white";

const btnPrimaryClass =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-black bg-black px-4 font-mono text-sm font-medium text-white transition-colors hover:bg-black/90 disabled:pointer-events-none disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-white/90";

const btnSecondaryClass =
  "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-transparent px-5 font-mono text-sm font-medium text-black transition-colors hover:border-black hover:bg-gray-50 dark:border-white/10 dark:text-white dark:hover:border-white dark:hover:bg-white/[0.06]";

function normalizeInviteId(value: string) {
  return value.trim().replace(/\s+/g, "");
}

function extractInviteId(value: string) {
  const raw = value.trim();
  if (!raw) return "";

  try {
    const isUrlLike = /^https?:\/\//i.test(raw) || raw.startsWith("/");
    if (isUrlLike) {
      const parsed = new URL(raw, window.location.origin);
      const raceParam =
        parsed.searchParams.get("race") ||
        parsed.searchParams.get("invite") ||
        parsed.searchParams.get("competitionId") ||
        parsed.searchParams.get("code");
      if (raceParam) return normalizeInviteId(raceParam);

      const pathMatch = parsed.pathname.match(
        /\/dashboard\/(?:race|dsa-arena)\/([^/?#]+)/,
      );
      if (pathMatch?.[1] && pathMatch[1] !== "race") {
        // Prefer query race id when present; otherwise treat path segment as id only for /race/:id
        if (parsed.pathname.includes("/dashboard/race/")) {
          return normalizeInviteId(pathMatch[1]);
        }
      }
    }
  } catch {
    // Fall through to plain code handling.
  }

  return normalizeInviteId(raw);
}

export function getStoredRaceUsername() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(RACE_USERNAME_KEY)?.trim() ?? "";
}

export function storeRaceUsername(name: string) {
  sessionStorage.setItem(RACE_USERNAME_KEY, name.trim());
}

export function buildRaceInviteUrl(competitionId: string) {
  if (typeof window === "undefined") {
    return `/dashboard/race?invite=${competitionId}`;
  }
  return `${window.location.origin}/dashboard/race?invite=${competitionId}`;
}

export function buildRaceArenaPath(questionId: string, competitionId: string) {
  return `/dashboard/dsa-arena/${questionId}?race=${competitionId}`;
}

export default function RaceLanding() {
  const router = useRouter();
  const authCtx = useContext(AuthContext);
  const [displayName, setDisplayName] = useState("");
  const [joinValue, setJoinValue] = useState("");
  const [error, setError] = useState("");
  const [nameSaved, setNameSaved] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const autoJoinedInviteRef = useRef<string | null>(null);

  useEffect(() => {
    const storedName = getStoredRaceUsername();
    if (storedName) {
      setDisplayName(storedName);
      setNameSaved(true);
      return;
    }

    const user = authCtx?.user;
    const backendName =
      (typeof user?.displayName === "string" && user.displayName) ||
      (typeof user?.username === "string" && user.username) ||
      "";
    setDisplayName(backendName);
  }, [authCtx?.user]);

  function ensureUsername() {
    const nextName = displayName.trim();
    if (!nextName) {
      setError("Add a display name before creating or joining a race.");
      return null;
    }

    storeRaceUsername(nextName);
    setError("");
    setNameSaved(true);
    return nextName;
  }

  async function authFetch(path: string, init?: RequestInit) {
    const token = getMemoryToken();
    const controller = new AbortController();
    const timeoutMs = 20000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(apiUrl(path), {
        credentials: "include",
        ...init,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(init?.headers ?? {}),
        },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.message || "Request failed");
      }
      return json;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error(
          "Race request timed out. Check your connection and try again.",
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async function handleCreateRace() {
    const username = ensureUsername();
    if (!username || creating) return;

    setCreating(true);
    setError("");
    try {
      const json = await authFetch("/api/v1/competitions/create", {
        method: "POST",
        body: JSON.stringify({ username, maxParticipants: 2 }),
      });
      const questionId = json.data?.questionId as string | undefined;
      const competitionId = json.data?.competition?.id as string | undefined;
      if (!questionId || !competitionId) {
        throw new Error("Could not create race");
      }
      router.push(buildRaceArenaPath(questionId, competitionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create race");
    } finally {
      setCreating(false);
    }
  }

  async function joinFromValue(value: string) {
    const inviteId = extractInviteId(value);
    if (!inviteId) {
      setError("Paste a valid invite link or race code.");
      return;
    }

    const username = ensureUsername();
    if (!username || joining) return;

    setJoining(true);
    setError("");
    try {
      const json = await authFetch("/api/v1/competitions/join", {
        method: "POST",
        body: JSON.stringify({ competitionId: inviteId, username }),
      });
      const competition = json.data?.competition;
      const questionId = competition?.questionId as string | undefined;
      const competitionId = competition?.id as string | undefined;
      if (!questionId || !competitionId) {
        throw new Error("Could not join race");
      }
      router.push(buildRaceArenaPath(questionId, competitionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join race");
    } finally {
      setJoining(false);
    }
  }

  function handleJoinRace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void joinFromValue(joinValue);
  }

  function handleNameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const username = ensureUsername();
    if (!username) return;

    const inviteId = extractInviteId(joinValue);
    if (inviteId) {
      void joinFromValue(inviteId);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const incoming =
      params.get("invite") ||
      params.get("race") ||
      params.get("competitionId") ||
      params.get("code");

    const inviteId = incoming ? extractInviteId(incoming) : "";
    if (!inviteId || autoJoinedInviteRef.current === inviteId) return;

    autoJoinedInviteRef.current = inviteId;
    setJoinValue(inviteId);

    const stored = getStoredRaceUsername();
    if (stored) {
      void joinFromValue(inviteId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="flex flex-col gap-6 border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-black md:p-8">
      <form onSubmit={handleNameSubmit} className="space-y-3">
        <label className="block space-y-2">
          <span className="flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-widest text-gray-500 dark:text-gray-400">
            <User className="h-3.5 w-3.5" />
            Display name
          </span>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-stretch">
            <input
              value={displayName}
              onChange={(event) => {
                setDisplayName(event.target.value);
                setNameSaved(false);
              }}
              placeholder="How your opponent sees you"
              className={inputClass}
              maxLength={40}
            />
            <button
              type="submit"
              className={btnSecondaryClass}
              style={{ minWidth: "9.5rem" }}
            >
              {nameSaved ? (
                <>
                  <Check className="h-4 w-4" />
                  Saved
                </>
              ) : (
                "Save name"
              )}
            </button>
          </div>
        </label>
        <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
          Required before creating or joining a race.
        </p>
        {error ? (
          <p
            role="alert"
            className="rounded border border-black/15 px-3 py-2 text-xs text-black/70 dark:border-white/15 dark:text-white/70"
            style={{ backgroundColor: "rgba(0,0,0,0.03)" }}
          >
            {error}
          </p>
        ) : null}
      </form>

      <div className="grid gap-4 md:grid-cols-2 md:gap-5">
        <article
          className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-black md:p-6"
          style={{ minHeight: "17rem" }}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="border border-black/10 px-2.5 py-1 text-xs font-semibold tracking-[0.2em] text-black/60 dark:border-white/10 dark:text-white/60">
              01
            </span>
            <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-black/10 dark:border-white/10">
              <Swords className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <h2 className="font-mono text-lg font-semibold text-black dark:text-white">
              Create a race
            </h2>
            <p className="font-mono text-sm leading-6 text-gray-600 dark:text-gray-400">
              Start a 1v1 coding race and share the invite link with a friend.
            </p>
          </div>
          <div className="mt-auto pt-6">
            <button
              type="button"
              onClick={() => void handleCreateRace()}
              disabled={creating}
              className={btnPrimaryClass}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create race
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </article>

        <article
          className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-black md:p-6"
          style={{ minHeight: "17rem" }}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="border border-black/10 px-2.5 py-1 text-xs font-semibold tracking-[0.2em] text-black/60 dark:border-white/10 dark:text-white/60">
              02
            </span>
            <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-black/10 dark:border-white/10">
              <KeyRound className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <h2 className="font-mono text-lg font-semibold text-black dark:text-white">
              Join a race
            </h2>
            <p className="font-mono text-sm leading-6 text-gray-600 dark:text-gray-400">
              Paste an invite link or race code from a friend.
            </p>
          </div>
          <form
            onSubmit={handleJoinRace}
            className="mt-auto flex flex-col gap-3 pt-6"
          >
            <input
              value={joinValue}
              onChange={(event) => setJoinValue(event.target.value)}
              placeholder="Invite link or race code"
              className={inputClass}
            />
            <button type="submit" disabled={joining} className={btnPrimaryClass}>
              {joining ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  Join race
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </article>
      </div>
    </section>
  );
}
