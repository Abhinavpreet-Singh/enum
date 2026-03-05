"use client";

import {
  Code2,
  BarChart3,
  Zap,
  PlayCircle,
  Trophy,
  ArrowRight,
  Star,
  Users,
  ChevronRight,
  Flame,
} from "lucide-react";
import { useState, useEffect } from "react";
import useAuth from "@/hooks/useAuth";

interface DashboardContentProps {
  userName?: string;
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
    arenaDistribution: [
      { name: "Frontend", value: 28, color: "#000000" },
      { name: "Backend", value: 24, color: "#4B5563" },
      { name: "Simulations", value: 20, color: "#6B7280" },
      { name: "DevOps", value: 18, color: "#9CA3AF" },
    ],
    dsaTopicsDistribution: [
      { name: "Arrays", value: 32, color: "#000000" },
      { name: "Strings", value: 28, color: "#4B5563" },
      { name: "Trees", value: 24, color: "#6B7280" },
      { name: "Graphs", value: 16, color: "#9CA3AF" },
    ],
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const name =
        userName ||
        localStorage.getItem("displayName") ||
        localStorage.getItem("Name") ||
        "Guest";
      if (name !== displayName) setDisplayName(name);

      const token = localStorage.getItem("accessToken");
      if (token) {
        const storedStats = localStorage.getItem("userStats");
        if (storedStats) {
          try {
            const parsedStats = JSON.parse(storedStats);
            setStats(parsedStats);
          } catch {
            // Stats couldn't be parsed, keeping defaults
          }
        }
      }
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

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-mono text-sm text-gray-500">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated state
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md text-center space-y-6 px-4">
          <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
            <BarChart3 className="w-10 h-10 text-gray-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold text-black">
              Welcome to Your Dashboard
            </h2>
            <p className="text-gray-600 font-mono text-sm">
              Please log in to view your stats, progress, and personalized
              recommendations.
            </p>
          </div>
          <a
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3 bg-black text-white font-mono text-sm tracking-wider hover:bg-gray-900 transition-colors"
          >
            Sign In
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  // Authenticated dashboard
  return (
    <div className="relative min-h-screen">
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, #000 1px, transparent 1px),
              linear-gradient(to bottom, #000 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative z-10 space-y-5 pb-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-1">
            Welcome back, {displayName}.
          </h1>
          <p className="text-gray-500 font-mono text-xs">
            Continue your journey to production-ready excellence
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="border border-gray-200 rounded-lg p-4 hover:border-black transition-all hover:shadow-md bg-white/80 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <Code2 className="w-4 h-4 text-gray-500" />
              <span className="font-mono text-[10px] text-gray-400">DSA</span>
            </div>
            <p className="text-2xl font-bold text-black mb-0.5">
              {stats.totalProblems > 0 ? stats.totalProblems : "--"}
            </p>
            <p className="font-mono text-[11px] text-gray-500">
              Problems Solved
            </p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 hover:border-black transition-all hover:shadow-md bg-white/80 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <PlayCircle className="w-4 h-4 text-gray-500" />
              <span className="font-mono text-[10px] text-gray-400">PROD</span>
            </div>
            <p className="text-2xl font-bold text-black mb-0.5">
              {stats.totalSimulations > 0 ? stats.totalSimulations : "--"}
            </p>
            <p className="font-mono text-[11px] text-gray-500">
              Simulations Done
            </p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 hover:border-black transition-all hover:shadow-md bg-white/80 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-4 h-4 text-gray-500" />
              <span className="font-mono text-[10px] text-gray-400">
                STREAK
              </span>
            </div>
            <p className="text-2xl font-bold text-black mb-0.5">
              {stats.currentStreak > 0 ? stats.currentStreak : "--"}
            </p>
            <p className="font-mono text-[11px] text-gray-500">Day Streak</p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 hover:border-black transition-all hover:shadow-md bg-white/80 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <Trophy className="w-4 h-4 text-gray-500" />
              <span className="font-mono text-[10px] text-gray-400">RANK</span>
            </div>
            <p className="text-2xl font-bold text-black mb-0.5">
              {stats.globalRank ? `#${stats.globalRank}` : "--"}
            </p>
            <p className="font-mono text-[11px] text-gray-500">
              Global Ranking
            </p>
          </div>
        </div>

        {/* XP Level Strip */}
        <div className="border border-gray-900 rounded-lg p-4 bg-gray-950 text-white flex items-center gap-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white font-mono text-sm font-bold">7</span>
            </div>
            <div>
              <p className="font-mono text-[10px] text-gray-400 tracking-widest">
                LEVEL
              </p>
              <p className="font-bold text-white text-sm">Incident Debugger</p>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="font-mono text-[10px] text-gray-500">
                2,450 XP
              </span>
              <span className="font-mono text-[10px] text-gray-500">
                3,000 XP
              </span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full"
                style={{ width: "82%" }}
              />
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-mono text-xs text-gray-400">550 XP to</p>
            <p className="font-mono text-xs text-white font-semibold">
              Level 8
            </p>
          </div>
        </div>

        {/* Daily Challenge + Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Daily Challenge */}
          <div className="border border-gray-200 rounded-lg p-5 bg-white/80 backdrop-blur-sm hover:border-black transition-all">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-mono text-[10px] tracking-widest text-gray-400">
                  DAILY CHALLENGE
                </p>
                <h3 className="text-sm font-bold text-black mt-0.5">
                  Today&apos;s Problem
                </h3>
              </div>
              <Flame className="w-4 h-4 text-gray-400" />
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-black text-sm">
                    LRU Cache Implementation
                  </p>
                  <span className="font-mono text-[10px] px-2 py-0.5 bg-gray-800 text-white rounded-full shrink-0">
                    Medium
                  </span>
                </div>
                <p className="font-mono text-[11px] text-gray-400 mt-1">
                  Data Structures · Hash Map + DLL
                </p>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3 h-3 ${
                          s <= 4
                            ? "fill-gray-800 text-gray-800"
                            : "text-gray-200"
                        }`}
                      />
                    ))}
                    <span className="font-mono text-[10px] text-gray-400 ml-1">
                      4.2
                    </span>
                  </div>
                  <button className="flex items-center gap-1 font-mono text-[11px] text-gray-500 hover:text-black transition-colors">
                    Solve now <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-md bg-gray-50">
                <Zap className="w-3.5 h-3.5 text-gray-500" />
                <span className="font-mono text-[11px] text-gray-500">
                  Complete today to earn
                </span>
                <span className="font-mono text-[11px] font-semibold text-black">
                  +150 XP
                </span>
              </div>
            </div>
          </div>

          {/* Leaderboard Peek */}
          <div className="border border-gray-200 rounded-lg p-5 bg-white/80 backdrop-blur-sm hover:border-black transition-all">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-mono text-[10px] tracking-widest text-gray-400">
                  LEADERBOARD
                </p>
                <h3 className="text-sm font-bold text-black mt-0.5">
                  Top Performers
                </h3>
              </div>
              <Users className="w-4 h-4 text-gray-400" />
            </div>
            <div className="space-y-2">
              {[
                { rank: 1, name: "alex_dev", xp: "12,840 XP", badge: "🏆" },
                { rank: 2, name: "priya_codes", xp: "11,200 XP", badge: "🥈" },
                { rank: 3, name: "max_sys", xp: "9,750 XP", badge: "🥉" },
                {
                  rank: 47,
                  name: "You",
                  xp: "2,450 XP",
                  badge: null,
                  isYou: true,
                },
              ].map((u) => (
                <div
                  key={u.rank}
                  className={`flex items-center gap-3 p-2.5 rounded-lg ${
                    u.isYou
                      ? "bg-gray-950 text-white border border-gray-800"
                      : "bg-gray-50 border border-gray-100"
                  }`}
                >
                  <span
                    className={`font-mono text-xs w-6 text-center font-bold ${
                      u.isYou ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    #{u.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-mono text-xs font-semibold truncate ${
                        u.isYou ? "text-white" : "text-gray-800"
                      }`}
                    >
                      {u.badge} {u.name}
                    </p>
                  </div>
                  <span
                    className={`font-mono text-[10px] ${
                      u.isYou ? "text-gray-400" : "text-gray-400"
                    }`}
                  >
                    {u.xp}
                  </span>
                </div>
              ))}
            </div>
            <a
              href="/dashboard/leaderboard"
              className="flex items-center justify-center gap-1 mt-3 font-mono text-[11px] text-gray-400 hover:text-black transition-colors"
            >
              View full leaderboard <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Recent Simulations */}
        <div>
          <h2 className="font-mono text-[10px] tracking-[0.2em] text-gray-400 mb-3">
            RECENT SIMULATIONS
          </h2>
          <div className="space-y-2">
            {[
              {
                title: "Memory Leak in Node.js API",
                tag: "Backend",
                diff: "Hard",
                time: "2h ago",
                done: true,
              },
              {
                title: "React Component Re-renders",
                tag: "Frontend",
                diff: "Medium",
                time: "Yesterday",
                done: true,
              },
              {
                title: "Database Connection Pool Exhaustion",
                tag: "DevOps",
                diff: "Hard",
                time: "2 days ago",
                done: false,
              },
            ].map((sim, i) => (
              <div
                key={i}
                className="border border-gray-200 rounded-lg p-4 bg-white/80 backdrop-blur-sm hover:border-black transition-all flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${sim.done ? "bg-gray-100" : "bg-gray-50"}`}
                  >
                    <PlayCircle className="w-3.5 h-3.5 text-gray-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-black text-sm truncate">
                      {sim.title}
                    </p>
                    <p className="font-mono text-[11px] text-gray-400">
                      {sim.tag} · {sim.diff} · {sim.time}
                    </p>
                  </div>
                </div>
                <span
                  className={`font-mono text-[10px] px-2 py-0.5 rounded-full shrink-0 ${sim.done ? "bg-gray-100 text-gray-500" : "bg-black text-white"}`}
                >
                  {sim.done ? "Completed" : "In Progress"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
