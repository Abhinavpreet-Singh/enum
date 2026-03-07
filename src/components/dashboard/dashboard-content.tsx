"use client";

import {
  Code2,
  BarChart3,
  Zap,
  PlayCircle,
  Trophy,
  ArrowRight,
  Users,
  ChevronRight,
  Flame,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import useAuth from "@/hooks/useAuth";
import axios from "axios";
import { proxy } from "@/app/proxy";

interface DashboardContentProps {
  userName?: string;
}

interface LeaderboardEntry {
  _id: string;
  username: string;
  displayName: string;
  avatar: string;
  xp: number;
  problemsSolved: number;
  simulationsSolved: number;
}

interface RecentSubmission {
  _id: string;
  question: { _id: string; title: string; level: string } | null;
  verdict: string;
  language: string;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return "Yesterday";
  return `${Math.floor(diff / 86400)}d ago`;
}

function computeLevel(xp: number) {
  const tiers = [
    { level: 1, title: "Code Rookie", minXP: 0, maxXP: 200 },
    { level: 2, title: "Script Kiddie", minXP: 200, maxXP: 500 },
    { level: 3, title: "Bug Hunter", minXP: 500, maxXP: 1000 },
    { level: 4, title: "Stack Tracer", minXP: 1000, maxXP: 2000 },
    { level: 5, title: "Debug Ninja", minXP: 2000, maxXP: 3500 },
    { level: 6, title: "System Engineer", minXP: 3500, maxXP: 5500 },
    { level: 7, title: "Incident Debugger", minXP: 5500, maxXP: 8000 },
    { level: 8, title: "Arch Wizard", minXP: 8000, maxXP: 12000 },
    { level: 9, title: "Production God", minXP: 12000, maxXP: 999999 },
  ];
  return [...tiers].reverse().find((t) => xp >= t.minXP) ?? tiers[0];
}

interface UserStats {
  totalProblems: number;
  totalSimulations: number;
  successRate: number;
  currentStreak: number;
  globalRank: number | null;
  weeklyActivity: { day: string; problems: number }[];
  arenaDistribution: { name: string; value: number; color: string }[];
  dsaTopicsDistribution: { name: string; value: number; color: string }[];
}

export default function DashboardContent({ userName }: DashboardContentProps) {
  const isAuthenticated = useAuth();
  const [displayName, setDisplayName] = useState<string>(
    () =>
      (typeof window !== "undefined" &&
        (userName ||
          localStorage.getItem("displayName") ||
          localStorage.getItem("Name"))) ||
      "Guest",
  );
  const [currentUsername] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("Name") || "" : "",
  );
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [totalSimulations, setTotalSimulations] = useState<number>(0);
  const [recentActivity, setRecentActivity] = useState<RecentSubmission[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalProblems: 0,
    totalSimulations: 0,
    successRate: 0,
    currentStreak: 0,
    globalRank: null,
    weeklyActivity: [
      { day: "Mon", problems: 0 },
      { day: "Tue", problems: 0 },
      { day: "Wed", problems: 0 },
      { day: "Thu", problems: 0 },
      { day: "Fri", problems: 0 },
      { day: "Sat", problems: 0 },
      { day: "Sun", problems: 0 },
    ],
    arenaDistribution: [],
    dsaTopicsDistribution: [],
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const name =
        userName ||
        localStorage.getItem("displayName") ||
        localStorage.getItem("Name") ||
        "Guest";
      if (name !== displayName) setDisplayName(name);
    }
    const handleNameChanged = (e: Event) => {
      const newName =
        (e as CustomEvent<string>).detail ||
        localStorage.getItem("Name") ||
        "Guest";
      setDisplayName(newName);
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "displayName")
        setDisplayName(e.newValue || localStorage.getItem("Name") || "Guest");
    };
    window.addEventListener("userNameChanged", handleNameChanged);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("userNameChanged", handleNameChanged);
      window.removeEventListener("storage", handleStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userName]);

  useEffect(() => {
    Promise.all([
      axios.get(`${proxy}/api/v1/users/leaderboard`).catch(() => null),
      axios.get(`${proxy}/api/v1/questions/getQuestion`).catch(() => null),
      axios.get(`${proxy}/api/v1/simulations/getSimulations`).catch(() => null),
    ]).then(([lbRes, qRes, simRes]) => {
      const lb: LeaderboardEntry[] = lbRes?.data?.data ?? [];
      setLeaderboard(lb);
      setTotalQuestions((qRes?.data?.data ?? []).length);
      setTotalSimulations((simRes?.data?.data ?? []).length);
      const uname =
        typeof window !== "undefined" ? localStorage.getItem("Name") || "" : "";
      const idx = lb.findIndex((e) => e.username === uname);
      if (idx !== -1) {
        const entry = lb[idx];
        setStats((prev) => ({
          ...prev,
          totalProblems: entry.problemsSolved,
          totalSimulations: entry.simulationsSolved,
          globalRank: idx + 1,
        }));
      }
    });
  }, []);

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken")
        : null;
    if (!token) return;
    fetch("/api/submissions/recent", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setRecentActivity(d?.data ?? []))
      .catch(() => {});
  }, []);

  const top3 = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);
  const userRank = useMemo(
    () => leaderboard.findIndex((e) => e.username === currentUsername),
    [leaderboard, currentUsername],
  );
  const userLbEntry = userRank !== -1 ? leaderboard[userRank] : null;
  const userXP = userLbEntry?.xp ?? 0;
  const lvl = computeLevel(userXP);
  const xpPct =
    lvl.maxXP < 999999
      ? Math.min(
          100,
          Math.round(((userXP - lvl.minXP) / (lvl.maxXP - lvl.minXP)) * 100),
        )
      : 100;

  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-mono text-sm text-gray-500">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md text-center space-y-6 px-4">
          <div className="w-20 h-20 mx-auto border border-gray-200 dark:border-white/10 flex items-center justify-center">
            <BarChart3 className="w-10 h-10 text-gray-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-black dark:text-white">
              Welcome to Your Dashboard
            </h2>
            <p className="text-gray-600 dark:text-gray-400 font-mono text-sm">
              Please log in to view your stats, progress, and personalized
              recommendations.
            </p>
          </div>
          <a
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3 bg-black dark:bg-white text-white dark:text-black font-mono text-sm tracking-wider hover:opacity-90 transition-opacity"
          >
            Sign In
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  const RANK_MEDALS = ["🥇", "🥈", "🥉"];

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateStr = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const hour = now.getHours();
  const greeting =
    hour < 5
      ? "Still up,"
      : hour < 12
        ? "Good morning,"
        : hour < 17
          ? "Good afternoon,"
          : hour < 21
            ? "Good evening,"
            : "Still grinding,";

  return (
    <div className="space-y-5 pb-8">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-black dark:text-white tracking-tight">
            {greeting} {displayName}.
          </h1>
          <p className="font-mono text-xs text-gray-500 dark:text-gray-400 mt-1">
            Continue your journey to production-ready excellence
          </p>
        </div>
        <div className="text-right shrink-0 hidden sm:block">
          <p className="font-mono text-xl font-bold text-black dark:text-white tabular-nums">
            {timeStr}
          </p>
          <p className="font-mono text-[10px] text-gray-400">{dateStr}</p>
        </div>
      </div>

      {/* ── Stat Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Problems Solved */}
        <div className="border border-gray-100 dark:border-white/8 bg-white dark:bg-[#111] p-4 hover:border-gray-300 dark:hover:border-white/20 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[9px] tracking-[0.3em] text-gray-400 uppercase">
              Problems
            </span>
            <Code2 className="w-3.5 h-3.5 text-emerald-500 opacity-60" />
          </div>
          <p className="text-3xl font-black text-black dark:text-white tabular-nums leading-none mb-1">
            {stats.totalProblems}
          </p>
          {totalQuestions > 0 && (
            <p className="font-mono text-[10px] text-gray-400 mb-3">
              of {totalQuestions} total
            </p>
          )}
          <div className="h-px bg-gray-100 dark:bg-white/8 relative mt-3">
            <div
              className="absolute left-0 top-0 h-full bg-emerald-500 transition-all duration-700"
              style={{
                width:
                  totalQuestions > 0
                    ? `${Math.min(100, (stats.totalProblems / totalQuestions) * 100)}%`
                    : "0%",
              }}
            />
          </div>
          <p className="font-mono text-[10px] text-gray-400 dark:text-gray-500 mt-2">
            DSA Solved
          </p>
        </div>

        {/* Simulations */}
        <div className="border border-gray-100 dark:border-white/8 bg-white dark:bg-[#111] p-4 hover:border-gray-300 dark:hover:border-white/20 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[9px] tracking-[0.3em] text-gray-400 uppercase">
              Simulations
            </span>
            <PlayCircle className="w-3.5 h-3.5 text-amber-400 opacity-60" />
          </div>
          <p className="text-3xl font-black text-black dark:text-white tabular-nums leading-none mb-1">
            {stats.totalSimulations}
          </p>
          {totalSimulations > 0 && (
            <p className="font-mono text-[10px] text-gray-400 mb-3">
              of {totalSimulations} total
            </p>
          )}
          <div className="h-px bg-gray-100 dark:bg-white/8 relative mt-3">
            <div
              className="absolute left-0 top-0 h-full bg-amber-400 transition-all duration-700"
              style={{
                width:
                  totalSimulations > 0
                    ? `${Math.min(100, (stats.totalSimulations / totalSimulations) * 100)}%`
                    : "0%",
              }}
            />
          </div>
          <p className="font-mono text-[10px] text-gray-400 dark:text-gray-500 mt-2">
            Prod Simulations
          </p>
        </div>

        {/* Total XP */}
        <div className="border border-gray-100 dark:border-white/8 bg-white dark:bg-[#111] p-4 hover:border-gray-300 dark:hover:border-white/20 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[9px] tracking-[0.3em] text-gray-400 uppercase">
              XP
            </span>
            <Zap className="w-3.5 h-3.5 text-yellow-400 opacity-60" />
          </div>
          <p className="text-3xl font-black text-black dark:text-white tabular-nums leading-none mb-1">
            {userXP.toLocaleString()}
          </p>
          <p className="font-mono text-[10px] text-gray-400 mb-3">
            total earned
          </p>
          <div className="h-px bg-gray-100 dark:bg-white/8 relative">
            <div
              className="absolute left-0 top-0 h-full bg-yellow-400 transition-all duration-700"
              style={{ width: `${xpPct}%` }}
            />
          </div>
          <p className="font-mono text-[10px] text-gray-400 dark:text-gray-500 mt-2">
            Experience Points
          </p>
        </div>

        {/* Global Rank */}
        <div className="border border-gray-100 dark:border-white/8 bg-white dark:bg-[#111] p-4 hover:border-gray-300 dark:hover:border-white/20 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[9px] tracking-[0.3em] text-gray-400 uppercase">
              Rank
            </span>
            <Trophy className="w-3.5 h-3.5 text-gray-400 opacity-60" />
          </div>
          <p className="text-3xl font-black text-black dark:text-white tabular-nums leading-none mb-1">
            {stats.globalRank ? `#${stats.globalRank}` : "--"}
          </p>
          <p className="font-mono text-[10px] text-gray-400 mb-3">
            of {leaderboard.length || "--"} devs
          </p>
          <div className="h-px bg-gray-100 dark:bg-white/8 relative">
            {stats.globalRank && leaderboard.length > 0 && (
              <div
                className="absolute left-0 top-0 h-full bg-white dark:bg-white transition-all duration-700"
                style={{
                  width: `${Math.max(5, 100 - ((stats.globalRank - 1) / leaderboard.length) * 100)}%`,
                }}
              />
            )}
          </div>
          <p className="font-mono text-[10px] text-gray-400 dark:text-gray-500 mt-2">
            Global Rankings
          </p>
        </div>
      </div>

      {/* ── XP Level — Futuristic HUD ──────────────────── */}
      <div className="relative border border-gray-100 dark:border-white/15 bg-gray-50 dark:bg-[#0d0d0d] overflow-hidden">
        {/* Scan-line texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 4px)",
          }}
        />
        {/* Corner bracket decorations */}
        <span className="absolute top-3 right-3 w-5 h-5 border-t border-r border-white/20 pointer-events-none" />
        <span className="absolute bottom-3 left-3 w-5 h-5 border-b border-l border-white/20 pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5 p-5">
          {/* Level badge */}
          <div className="shrink-0 flex items-center gap-4">
            <div className="relative w-14 h-14 border border-gray-200 dark:border-white/25 bg-gray-100 dark:bg-white/5 flex items-center justify-center">
              <span className="font-mono font-black text-xl text-black dark:text-white tabular-nums">
                {String(lvl.level).padStart(2, "0")}
              </span>
              <span className="absolute top-0.5 left-0.5 w-2 h-2 border-t border-l border-gray-400 dark:border-white/40" />
              <span className="absolute top-0.5 right-0.5 w-2 h-2 border-t border-r border-gray-400 dark:border-white/40" />
              <span className="absolute bottom-0.5 left-0.5 w-2 h-2 border-b border-l border-gray-400 dark:border-white/40" />
              <span className="absolute bottom-0.5 right-0.5 w-2 h-2 border-b border-r border-gray-400 dark:border-white/40" />
            </div>
            <div>
              <p className="font-mono text-[9px] tracking-[0.4em] text-gray-400 dark:text-white/30 uppercase">
                Level {lvl.level}
              </p>
              <p className="font-bold text-black dark:text-white text-sm leading-tight">
                {lvl.title}
              </p>
              <p className="font-mono text-[10px] text-gray-500 dark:text-white/30 mt-0.5">
                {userXP.toLocaleString()} XP total
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="flex-1 w-full min-w-0">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] text-gray-500 dark:text-white/30">
                {lvl.maxXP < 999999
                  ? `To Level ${lvl.level + 1} — ${lvl.title.toUpperCase()}`
                  : "MAX LEVEL REACHED"}
              </span>
              {lvl.maxXP < 999999 && (
                <span className="font-mono text-xs font-bold text-black dark:text-white tabular-nums">
                  {xpPct}%
                </span>
              )}
            </div>

            {/* Bar */}
            <div className="h-3 bg-gray-200 dark:bg-black/60 relative overflow-hidden border border-gray-200 dark:border-white/8">
              {/* Fill with glow */}
              <div
                className="h-full relative transition-all duration-700"
                style={{
                  width: `${xpPct}%`,
                  background:
                    "linear-gradient(90deg, #555 0%, #ccc 55%, #fff 100%)",
                  boxShadow:
                    "0 0 12px rgba(255,255,255,0.35), 0 0 28px rgba(255,255,255,0.15)",
                }}
              >
                {/* Leading edge shine */}
                <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/30" />
              </div>
              {/* Tick marks */}
              {[25, 50, 75].map((p) => (
                <span
                  key={p}
                  className="absolute top-0 bottom-0 w-px bg-white/20 dark:bg-black/60 z-10"
                  style={{ left: `${p}%` }}
                />
              ))}
            </div>

            {/* Range labels */}
            {lvl.maxXP < 999999 && (
              <div className="flex justify-between mt-1.5">
                <span className="font-mono text-[9px] text-gray-400 dark:text-white/20">
                  {lvl.minXP.toLocaleString()} XP
                </span>
                <span className="font-mono text-[9px] text-gray-500 dark:text-white/25">
                  {(lvl.maxXP - userXP).toLocaleString()} XP remaining
                </span>
                <span className="font-mono text-[9px] text-gray-400 dark:text-white/20">
                  {lvl.maxXP.toLocaleString()} XP
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Daily Challenge + Leaderboard ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Daily Challenge */}
        <div className="border border-gray-100 dark:border-white/8 bg-white dark:bg-[#111] p-5 hover:border-gray-300 dark:hover:border-white/15 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-mono text-[9px] tracking-[0.3em] text-gray-400 uppercase">
                Daily Challenge
              </p>
              <h3 className="text-sm font-bold text-black dark:text-white mt-0.5">
                {"Today's Problem"}
              </h3>
            </div>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>

          <div className="border border-gray-100 dark:border-white/8 p-3 mb-3 hover:border-gray-200 dark:hover:border-white/15 transition-colors">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="font-semibold text-black dark:text-white text-sm">
                LRU Cache Implementation
              </p>
              <span className="font-mono text-[9px] px-2 py-0.5 border border-amber-400/40 text-amber-600 dark:text-amber-400 shrink-0">
                Medium
              </span>
            </div>
            <p className="font-mono text-[10px] text-gray-400">
              Data Structures · Hash Map + DLL
            </p>
            <div className="flex items-center justify-between mt-3">
              <span className="font-mono text-[10px] text-black dark:text-white font-semibold">
                +150 XP
              </span>
              <button className="flex items-center gap-1 font-mono text-[11px] text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                Solve <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/4 px-3 py-2">
            <Zap className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
            <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
              Complete today to maintain your streak
            </span>
          </div>
        </div>

        {/* Leaderboard Peek */}
        <div className="border border-gray-100 dark:border-white/8 bg-white dark:bg-[#111] p-5 hover:border-gray-300 dark:hover:border-white/15 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-mono text-[9px] tracking-[0.3em] text-gray-400 uppercase">
                Leaderboard
              </p>
              <h3 className="text-sm font-bold text-black dark:text-white mt-0.5">
                Top Performers
              </h3>
            </div>
            <Users className="w-4 h-4 text-gray-400" />
          </div>

          <div className="divide-y divide-gray-50 dark:divide-white/5">
            {top3.map((u, i) => {
              const isYou = u.username === currentUsername;
              return (
                <div
                  key={u._id ?? i}
                  className={`flex items-center gap-3 py-2.5 relative ${isYou ? "pl-3" : ""}`}
                >
                  {isYou && (
                    <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-white" />
                  )}
                  <span className="text-base w-7 text-center shrink-0">
                    {RANK_MEDALS[i]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs font-semibold text-black dark:text-white truncate">
                      {u.displayName || u.username}
                      {isYou && (
                        <span className="ml-1.5 font-mono text-[9px] px-1 py-0.5 bg-black dark:bg-white text-white dark:text-black align-middle">
                          you
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="font-mono text-[11px] text-gray-400 tabular-nums shrink-0">
                    {u.xp.toLocaleString()} XP
                  </span>
                </div>
              );
            })}

            {userRank >= 3 && userLbEntry && (
              <>
                <div className="py-1 text-center">
                  <span className="font-mono text-[10px] text-gray-300 dark:text-white/15">
                    · · ·
                  </span>
                </div>
                <div className="flex items-center gap-3 py-2.5 relative pl-3">
                  <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-white" />
                  <span className="font-mono text-xs w-7 text-center text-gray-400 shrink-0">
                    #{userRank + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs font-semibold text-black dark:text-white truncate">
                      {userLbEntry.displayName || userLbEntry.username}
                      <span className="ml-1.5 font-mono text-[9px] px-1 py-0.5 bg-black dark:bg-white text-white dark:text-black align-middle">
                        you
                      </span>
                    </p>
                  </div>
                  <span className="font-mono text-[11px] text-gray-400 tabular-nums shrink-0">
                    {userLbEntry.xp.toLocaleString()} XP
                  </span>
                </div>
              </>
            )}

            {top3.length === 0 && (
              <p className="font-mono text-[11px] text-gray-400 py-4 text-center">
                No data yet — be the first!
              </p>
            )}
          </div>

          <a
            href="/dashboard/leaderboard"
            className="flex items-center justify-center gap-1 mt-4 font-mono text-[11px] text-gray-400 hover:text-black dark:hover:text-white transition-colors"
          >
            Full leaderboard <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* ── Recent Activity ────────────────────────────── */}
      <div>
        <h2 className="font-mono text-[9px] tracking-[0.3em] text-gray-400 uppercase mb-3">
          Recent Activity
        </h2>

        {recentActivity.length === 0 ? (
          <div className="border border-gray-100 dark:border-white/8 bg-white dark:bg-[#111] p-8 text-center">
            <Code2 className="w-8 h-8 text-gray-200 dark:text-white/10 mx-auto mb-3" />
            <p className="font-mono text-sm text-gray-400 mb-2">
              No activity yet
            </p>
            <a
              href="/dashboard/dsa-arena"
              className="inline-flex items-center gap-1 font-mono text-xs text-black dark:text-white hover:underline"
            >
              Start solving problems <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        ) : (
          <div className="border border-gray-100 dark:border-white/8 divide-y divide-gray-50 dark:divide-white/5 overflow-hidden">
            {recentActivity.map((sub, i) => {
              const accepted = sub.verdict === "accepted";
              const title = sub.question?.title ?? "Unknown Question";
              const level = sub.question?.level ?? "";
              const levelColor =
                level === "Easy"
                  ? "text-emerald-500"
                  : level === "Medium"
                    ? "text-amber-400"
                    : level === "Hard"
                      ? "text-red-400"
                      : "text-gray-400";
              return (
                <a
                  key={sub._id ?? i}
                  href={`/dashboard/dsa-arena/${sub.question?._id ?? ""}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 bg-white dark:bg-[#111] hover:bg-gray-50 dark:hover:bg-[#161616] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-0.5 self-stretch shrink-0 ${
                        accepted
                          ? "bg-emerald-500"
                          : "bg-gray-200 dark:bg-white/10"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-black dark:text-white text-sm truncate">
                        {title}
                      </p>
                      <p className="font-mono text-[10px] mt-0.5">
                        {level && <span className={levelColor}>{level}</span>}
                        {level ? " · " : ""}
                        <span className="text-gray-400">
                          {sub.language} · {timeAgo(sub.createdAt)}
                        </span>
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-mono text-[10px] px-2 py-0.5 shrink-0 ${
                      accepted
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {accepted ? "Accepted" : sub.verdict || "Attempted"}
                  </span>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
