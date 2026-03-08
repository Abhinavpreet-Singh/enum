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
  Network,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import useAuth from "@/hooks/useAuth";
import axios from "axios";
import { proxy } from "@/app/proxy";
import { browserSimulations } from "@/data/browser-simulations";

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
  currentStreak?: number;
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
  const [currentUserId] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("id") || "" : "",
  );
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [profileXp, setProfileXp] = useState<number | null>(null);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [totalSimulations, setTotalSimulations] = useState<number>(0);
  const [dailyChallenge, setDailyChallenge] = useState<{
    id: string;
    title: string;
    description: string;
    difficulty: string;
    maxScore: number;
    tags: string[];
  } | null>(null);
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
      axios.get(`${proxy}/api/v1/system-design/simulations`).catch(() => null),
    ]).then(([lbRes, qRes, simRes, sdRes]) => {
      const lb: LeaderboardEntry[] = lbRes?.data?.data ?? [];
      setLeaderboard(lb);
      setTotalQuestions((qRes?.data?.data ?? []).length);
      const prodSims = (
        (simRes?.data?.data ?? []) as Array<{
          category?: string;
        }>
      ).filter((s) => s?.category !== "devops");
      const sdSims = sdRes?.data?.data ?? [];
      setTotalSimulations(
        prodSims.length + sdSims.length + browserSimulations.length,
      );

      // Find a hard system design simulation for daily challenge
      const hardSim = sdSims.find((s: any) => s.difficulty === "hard");
      if (hardSim) {
        setDailyChallenge({
          id: hardSim.id,
          title: hardSim.title,
          description: hardSim.description,
          difficulty: hardSim.difficulty,
          maxScore: hardSim.maxScore,
          tags: hardSim.tags || [],
        });
      }

      const uid =
        typeof window !== "undefined" ? localStorage.getItem("id") || "" : "";
      const uname =
        typeof window !== "undefined" ? localStorage.getItem("Name") || "" : "";
      const dname =
        typeof window !== "undefined"
          ? localStorage.getItem("displayName") || ""
          : "";
      const normalize = (v: string) => v.trim().toLowerCase();
      const idx = lb.findIndex(
        (e) =>
          (uid && e._id === uid) ||
          (uname && normalize(e.username) === normalize(uname)) ||
          (dname && normalize(e.displayName || "") === normalize(dname)),
      );

      if (idx !== -1) {
        const entry = lb[idx];
        setProfileXp(entry.xp);
        setStats((prev) => ({
          ...prev,
          totalProblems: entry.problemsSolved,
          totalSimulations: entry.simulationsSolved,
          globalRank: idx + 1,
          currentStreak: entry.currentStreak ?? 0,
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

    axios
      .get(`${proxy}/api/v1/users/profile`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const data = res?.data?.data;
        if (typeof data?.xp === "number") {
          setProfileXp(data.xp);
        }
        if (typeof data?.currentStreak === "number") {
          setStats((prev) => ({ ...prev, currentStreak: data.currentStreak }));
        }
      })
      .catch(() => {});
  }, []);

  const top3 = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);
  const userLbEntry = useMemo(() => {
    const normalize = (v: string) => v.trim().toLowerCase();
    return (
      leaderboard.find((e) => currentUserId && e._id === currentUserId) ??
      leaderboard.find(
        (e) =>
          currentUsername &&
          normalize(e.username) === normalize(currentUsername),
      ) ??
      leaderboard.find(
        (e) =>
          displayName &&
          normalize(e.displayName || "") === normalize(displayName),
      ) ??
      null
    );
  }, [leaderboard, currentUserId, currentUsername, displayName]);

  const userRank = useMemo(
    () =>
      userLbEntry
        ? leaderboard.findIndex((e) => e._id === userLbEntry._id)
        : -1,
    [leaderboard, userLbEntry],
  );
  const userXP = profileXp ?? userLbEntry?.xp ?? 0;
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

          {dailyChallenge ? (
            <Link
              href={`/dashboard/simulations/system-design/${dailyChallenge.id}`}
              className="block border border-gray-100 dark:border-white/8 p-3 mb-3 hover:border-gray-200 dark:hover:border-white/15 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <Network className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="font-semibold text-black dark:text-white text-sm">
                    {dailyChallenge.title}
                  </p>
                </div>
                <span className="font-mono text-[9px] px-2 py-0.5 border border-red-400/40 text-red-600 dark:text-red-400 shrink-0">
                  {dailyChallenge.difficulty.toUpperCase()}
                </span>
              </div>
              <p className="font-mono text-[10px] text-gray-400 line-clamp-2 mb-3">
                {dailyChallenge.description}
              </p>
              <div className="flex items-center flex-wrap gap-1.5 mb-3">
                {dailyChallenge.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="font-mono text-[9px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="font-mono text-[10px] text-black dark:text-white font-semibold">
                  +{dailyChallenge.maxScore * 10} XP
                </span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                  Design <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ) : (
            <div className="border border-gray-100 dark:border-white/8 p-3 mb-3">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-100 dark:bg-white/5 rounded w-3/4" />
                <div className="h-3 bg-gray-100 dark:bg-white/5 rounded w-1/2" />
              </div>
            </div>
          )}

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
              const normalize = (v: string) => v.trim().toLowerCase();
              const isYou =
                (currentUserId && u._id === currentUserId) ||
                (currentUsername &&
                  normalize(u.username) === normalize(currentUsername)) ||
                (displayName &&
                  normalize(u.displayName || "") === normalize(displayName));
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
    </div>
  );
}
