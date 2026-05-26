"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { ArrowRight, Check, KeyRound, Plus, User } from "lucide-react";

const inputClass =
  "h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 font-mono text-sm text-black outline-none transition-colors placeholder:text-gray-400 focus:border-black dark:border-white/10 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-white";

const btnPrimaryClass =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-black bg-black px-4 font-mono text-sm font-medium text-white transition-colors hover:bg-black/90 disabled:pointer-events-none disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-white/90";

const btnSecondaryClass =
  "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-transparent px-5 font-mono text-sm font-medium text-black transition-colors hover:border-black hover:bg-gray-50 dark:border-white/10 dark:text-white dark:hover:border-white dark:hover:bg-white/[0.06]";

function normalizeRoomId(value: string) {
  return value.trim().replace(/\s+/g, "");
}

function extractRoomId(value: string) {
  const raw = value.trim();
  if (!raw) return "";

  try {
    const isUrlLike = /^https?:\/\//i.test(raw) || raw.startsWith("/");
    if (isUrlLike) {
      const parsed = new URL(raw, window.location.origin);
      const pathMatch = parsed.pathname.match(/\/dashboard\/collab\/([^/?#]+)/);
      if (pathMatch?.[1]) {
        return normalizeRoomId(pathMatch[1]);
      }

      const paramRoom =
        parsed.searchParams.get("room") ||
        parsed.searchParams.get("roomId") ||
        parsed.searchParams.get("code") ||
        parsed.searchParams.get("invite");
      if (paramRoom) return normalizeRoomId(paramRoom);
    }
  } catch {
    // Fall through to plain code handling.
  }

  return normalizeRoomId(raw);
}

function getStoredUsername() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("collab_username")?.trim() ?? "";
}

export default function CollabLanding() {
  const router = useRouter();
  const [lastRoomId, setLastRoomId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [joinValue, setJoinValue] = useState("");
  const [error, setError] = useState("");
  const [nameSaved, setNameSaved] = useState(false);
  const autoJoinedRoomRef = useRef<string | null>(null);

  useEffect(() => {
    const storedName = getStoredUsername();
    if (storedName) {
      setDisplayName(storedName);
      setNameSaved(true);
      return;
    }

    const localFallback =
      typeof window !== "undefined"
        ? localStorage.getItem("displayName") ||
          localStorage.getItem("Name") ||
          ""
        : "";
    setDisplayName(localFallback);
  }, []);

  function ensureUsername() {
    const nextName = displayName.trim();
    if (!nextName) {
      setError("Add a display name before entering a room.");
      return null;
    }

    sessionStorage.setItem("collab_username", nextName);
    setError("");
    setNameSaved(true);
    return nextName;
  }

  function enterRoom(roomId: string) {
    const normalizedRoomId = extractRoomId(roomId);
    if (!normalizedRoomId) return;

    router.push(`/dashboard/collab/${normalizedRoomId}`);
  }

  function joinFromValue(value: string) {
    const roomId = extractRoomId(value);
    if (!roomId) {
      setError("Paste a valid invite link or room code.");
      return;
    }

    const username = ensureUsername();
    if (!username) return;

    enterRoom(roomId);
  }

  function handleCreateRoom() {
    const username = ensureUsername();
    if (!username) return;

    const roomId = uuidv4().slice(0, 8);
    setLastRoomId(roomId);
    enterRoom(roomId);
  }

  function handleJoinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    joinFromValue(joinValue);
  }

  function handleNameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ensureUsername();
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const incoming =
      params.get("room") ||
      params.get("roomId") ||
      params.get("code") ||
      params.get("invite");

    const roomId = incoming ? extractRoomId(incoming) : "";
    if (!roomId || autoJoinedRoomRef.current === roomId) return;

    autoJoinedRoomRef.current = roomId;
    joinFromValue(roomId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="flex flex-col gap-6 border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-black md:p-8">
          {/* Display name */}
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
                  placeholder="How teammates see you"
                  className={inputClass}
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
              Required before creating or joining a room.
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

          {/* Create / Join cards */}
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
                  <Plus className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <h2 className="font-mono text-lg font-semibold text-black dark:text-white">
                  Create a room
                </h2>
                <p className="font-mono text-sm leading-6 text-gray-600 dark:text-gray-400">
                  Spin up a new private session and share the link with your
                  team.
                </p>
              </div>
              <div className="mt-auto pt-6">
                <button
                  type="button"
                  onClick={handleCreateRoom}
                  className={btnPrimaryClass}
                >
                  Create room
                  <ArrowRight className="h-4 w-4" />
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
                  Join a room
                </h2>
                <p className="font-mono text-sm leading-6 text-gray-600 dark:text-gray-400">
                  Paste an invite link or enter the room code from a teammate.
                </p>
              </div>
              <form
                onSubmit={handleJoinRoom}
                className="mt-auto flex flex-col gap-3 pt-6"
              >
                <input
                  value={joinValue}
                  onChange={(event) => setJoinValue(event.target.value)}
                  placeholder="Invite link or room code"
                  className={inputClass}
                />
                <button type="submit" className={btnPrimaryClass}>
                  Join room
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </article>
          </div>

          {lastRoomId ? (
            <p className="text-center text-xs text-black/40 dark:text-white/40">
              Last created room:{" "}
              <span className="font-mono text-black/60 dark:text-white/60">
                {lastRoomId}
              </span>
            </p>
          ) : null}
    </section>
  );
}
