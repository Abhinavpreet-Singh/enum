"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  ArrowRight,
  Copy,
  KeyRound,
  MoonStar,
  Plus,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import { useTheme } from "@/providers/theme-provider";

const badges = [
  { label: "V.4.2.0-STABLE", tone: "sky" },
  { label: "LATENCY: 12MS", tone: "mint" },
  { label: "SECURE: P2P", tone: "paper" },
];

const navLinks = [
  { href: "/", label: "HOME" },
  { href: "/about", label: "ABOUT" },
  { href: "https://github.com/Abhinavpreet-Singh/enum", label: "GITHUB", external: true },
] as const;

function normalizeRoomId(value: string) {
  return value.trim().replace(/\s+/g, "");
}

function getStoredUsername() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("collab_username")?.trim() ?? "";
}

export default function CollabLanding() {
  const router = useRouter();
  const { toggleTheme } = useTheme();
  const [lastRoomId, setLastRoomId] = useState("");

  function ensureUsername() {
    const existing = getStoredUsername();
    if (existing) return existing;

    const nextName = window.prompt("Enter a display name to continue", "guest");
    if (!nextName?.trim()) return null;

    const username = nextName.trim();
    sessionStorage.setItem("collab_username", username);
    return username;
  }

  function enterRoom(roomId: string) {
    const normalizedRoomId = normalizeRoomId(roomId);
    if (!normalizedRoomId) return;

    router.push(`/dashboard/collab/${normalizedRoomId}`);
  }

  function handleCreateRoom() {
    const username = ensureUsername();
    if (!username) return;

    const roomId = uuidv4().slice(0, 8);
    setLastRoomId(roomId);
    enterRoom(roomId);
  }

  function handleJoinRoom() {
    const roomId = window.prompt("Enter the room ID to join");
    if (!roomId?.trim()) return;

    const username = ensureUsername();
    if (!username) return;

    enterRoom(roomId);
  }

  return (
    <div className="min-h-screen bg-white text-[#111111] dark:bg-[#080808] dark:text-[#f5f5f5]">
      <div className="relative isolate overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(17,17,17,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(17,17,17,0.06) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-0 px-4 py-6 md:px-6 md:py-8">
          <section className="border-2 border-[#1f1f1f] bg-white px-6 py-16 text-center shadow-[0_12px_0_rgba(0,0,0,0.04)] dark:border-[#ececec]/20 dark:bg-[#0b0b0b] md:px-10 md:py-20 lg:px-16">
            <div className="mx-auto flex max-w-4xl flex-col items-center">
              <div className="mb-8 flex flex-wrap items-center justify-center gap-3 text-[10px] font-black tracking-[0.28em] md:text-[11px]">
                {badges.map((badge) => (
                  <span
                    key={badge.label}
                    className="border-2 border-[#1f1f1f] px-4 py-2 text-[#111111] dark:border-[#ececec]/25 dark:text-[#f5f5f5]"
                    style={{
                      background:
                        badge.tone === "sky"
                          ? "#b6d9ff"
                          : badge.tone === "mint"
                            ? "#d8eadf"
                            : "#f2efe8",
                    }}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>

              <p className="mb-2 inline-flex items-center gap-2 border-2 border-[#1f1f1f] px-3 py-1 text-[10px] font-black tracking-[0.35em] text-[#111111] dark:border-[#ececec]/25 dark:text-[#f5f5f5]">
                <Sparkles className="h-3.5 w-3.5" />
                EPHEMERAL, FOCUSED COMMUNICATION
              </p>

              <h1 className="max-w-5xl text-5xl font-black tracking-[-0.08em] md:text-7xl lg:text-[7.5rem]">
                COLLABORATION
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-[#5b5b5b] dark:text-[#b8b8b8] md:text-base">
                Spin up a room in seconds, or connect to an existing session with a room ID.
                Use this console when the conversation needs to stay fast, private, and disposable.
              </p>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-[11px] font-black tracking-[0.22em] md:text-xs">
                <span className="inline-flex items-center gap-2 border-2 border-[#1f1f1f] bg-[#b6d9ff] px-4 py-2 dark:border-[#ececec]/25">
                  <ShieldCheck className="h-4 w-4" />
                  PRIVATE CHANNEL
                </span>
                <span className="inline-flex items-center gap-2 border-2 border-[#1f1f1f] bg-[#d8eadf] px-4 py-2 dark:border-[#ececec]/25">
                  <KeyRound className="h-4 w-4" />
                  AUTHORIZED JOIN
                </span>
                <span className="inline-flex items-center gap-2 border-2 border-[#1f1f1f] bg-[#f2efe8] px-4 py-2 dark:border-[#ececec]/25">
                  <Copy className="h-4 w-4" />
                  {lastRoomId ? `ROOM ${lastRoomId}` : "COPY-READY"}
                </span>
              </div>
            </div>
          </section>

          <section className="grid border-x-2 border-b-2 border-[#1f1f1f] bg-white dark:border-[#ececec]/20 dark:bg-[#0b0b0b] lg:grid-cols-2">
            <article className="relative min-h-[320px] border-b-2 border-[#1f1f1f] px-6 py-8 lg:border-b-0 lg:border-r-2 dark:border-[#ececec]/20 md:px-10 md:py-10">
              <div className="flex items-start justify-between">
                <span className="border-2 border-[#1f1f1f] bg-white px-3 py-1 text-sm font-black tracking-[0.18em] dark:border-[#ececec]/25 dark:bg-transparent">
                  001
                </span>
                <div className="inline-flex h-9 w-9 items-center justify-center border-2 border-[#1f1f1f] bg-transparent dark:border-[#ececec]/25">
                  <Plus className="h-4 w-4" />
                </div>
              </div>

              <h2 className="mt-8 text-3xl font-black tracking-[-0.06em] md:text-4xl">
                CREATE ROOM
              </h2>

              <p className="mt-4 max-w-md text-base leading-7 text-[#5c5c5c] dark:text-[#b8b8b8]">
                Instantiate a private, encrypted environment.
                <br />
                No persistent logs, no tracking, just raw data exchange.
              </p>

              <div className="mt-10 flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleCreateRoom}
                  className="inline-flex items-center gap-3 border-2 border-[#1f1f1f] bg-[#111111] px-6 py-4 text-sm font-black tracking-[0.08em] text-white transition-transform hover:-translate-y-0.5 dark:border-[#ececec]/25 dark:bg-white dark:text-black"
                >
                  EXECUTE INITIALIZATION
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </article>

            <article className="relative min-h-[320px] px-6 py-8 md:px-10 md:py-10">
              <div className="flex items-start justify-between">
                <span className="border-2 border-[#1f1f1f] bg-white px-3 py-1 text-sm font-black tracking-[0.18em] dark:border-[#ececec]/25 dark:bg-transparent">
                  002
                </span>
                <div className="inline-flex h-9 w-9 items-center justify-center border-2 border-[#1f1f1f] bg-transparent dark:border-[#ececec]/25">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>

              <h2 className="mt-8 text-3xl font-black tracking-[-0.06em] md:text-4xl">
                JOIN ROOM
              </h2>

              <p className="mt-4 max-w-md text-base leading-7 text-[#5c5c5c] dark:text-[#b8b8b8]">
                Enter an existing protocol stream via room ID.
                <br />
                Requires authorization token for synchronization.
              </p>

              <div className="mt-10 flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleJoinRoom}
                  className="inline-flex items-center gap-3 border-2 border-[#1f1f1f] bg-transparent px-6 py-4 text-sm font-black tracking-[0.08em] text-[#111111] transition-transform hover:-translate-y-0.5 dark:border-[#ececec]/25 dark:text-[#f5f5f5]"
                >
                  ESTABLISH CONNECTION
                  <KeyRound className="h-4 w-4" />
                </button>
              </div>
            </article>
          </section>

          <div className="px-2 py-6 text-center text-[11px] font-black tracking-[0.24em] text-[#666666] dark:text-[#a5a5a5]">
            {lastRoomId
              ? `READY TO CONNECT. LAST GENERATED ROOM ${lastRoomId}.`
              : "READY TO CONNECT. CREATE OR JOIN A ROOM TO BEGIN."}
          </div>
        </main>
      </div>
    </div>
  );
}