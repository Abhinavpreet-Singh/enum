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

function CircularRing({
  value,
  max,
  size = 72,
  stroke = 7,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        className="text-gray-200 dark:text-gray-800"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        className="text-gray-900 dark:text-white"
        strokeWidth={stroke}
        strokeDasharray={`${pct * circ} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray 0.7s ease-out" }}
      />
    </svg>
  );
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
  const tier = [...tiers].reverse().find((t) => xp >= t.minXP) ?? tiers[0];
  return tier;
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

  // Fetch live leaderboard + total questions count + simulations count
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

  // Fetch recent submissions for the current user
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

  // Derived: top 3 + current user's leaderboard entry
  const top3 = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);
  const userRank = useMemo(
    () => leaderboard.findIndex((e) => e.username === currentUsername),
    [leaderboard, currentUsername],
  );
  const userLbEntry = userRank !== -1 ? leaderboard[userRank] : null;
  const userXP = userLbEntry?.xp ?? 0;
  const lvl = computeLevel(userXP);

  // Loading state
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

  // Not authenticated state
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md text-center space-y-6 px-4">
          <div className="w-20 h-20 mx-auto bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center">
            <BarChart3 className="w-10 h-10 text-gray-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold text-black dark:text-white">
              Welcome to Your Dashboard
            </h2>
            <p className="text-gray-600 dark:text-gray-400 font-mono text-sm">
              Please log in to view your stats, progress, and personalized
              recommendations.
            </p>
          </div>
          <a
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3 bg-black dark:bg-white text-white dark:text-black font-mono text-sm tracking-wider hover:bg-gray-900 dark:hover:bg-gray-100 transition-colors"
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
              linear-gradient(to right, #888 1px, transparent 1px),
              linear-gradient(to bottom, #888 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative z-10 space-y-5 pb-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-black dark:text-white mb-1">
            Welcome back, {displayName}.
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-mono text-xs">
            Continue your journey to production-ready excellence
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:border-black dark:hover:border-gray-500 transition-all hover:shadow-md bg-white/80 dark:bg-black/80 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <Code2 className="w-4 h-4 text-gray-500" />
              <span className="font-mono text-[10px] text-gray-400">DSA</span>
            </div>
            <div className="flex items-center gap-3">
              <CircularRing
                value={stats.totalProblems}
                max={totalQuestions || 1}
              />
              <div>
                <p className="text-2xl font-bold text-black dark:text-white mb-0.5">
                  {stats.totalProblems}
                </p>
                <p className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
                  Problems Solved
                </p>
                {totalQuestions > 0 && (
                  <p className="font-mono text-[10px] text-gray-400 mt-0.5">
                    of {totalQuestions}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:border-black dark:hover:border-gray-500 transition-all hover:shadow-md bg-white/80 dark:bg-black/80 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <PlayCircle className="w-4 h-4 text-gray-500" />
              <span className="font-mono text-[10px] text-gray-400">PROD</span>
            </div>
            <div className="flex items-center gap-3">
              <CircularRing
                value={stats.totalSimulations}
                max={totalSimulations || 1}
              />
              <div>
                <p className="text-2xl font-bold text-black dark:text-white mb-0.5">
                  {stats.totalSimulations}
                </p>
                <p className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
                  Simulations Done
                </p>
                {totalSimulations > 0 && (
                  <p className="font-mono text-[10px] text-gray-400 mt-0.5">
                    of {totalSimulations}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:border-black dark:hover:border-gray-500 transition-all hover:shadow-md bg-white/80 dark:bg-black/80 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-4 h-4 text-gray-500" />
              <span className="font-mono text-[10px] text-gray-400">XP</span>
            </div>
            <p className="text-2xl font-bold text-black dark:text-white mb-0.5">
              {userXP.toLocaleString()}
            </p>
            <p className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
              Total XP
            </p>
          </div>

          <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:border-black dark:hover:border-gray-500 transition-all hover:shadow-md bg-white/80 dark:bg-black/80 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <Trophy className="w-4 h-4 text-gray-500" />
              <span className="font-mono text-[10px] text-gray-400">RANK</span>
            </div>
            <p className="text-2xl font-bold text-black dark:text-white mb-0.5">
              {stats.globalRank ? `#${stats.globalRank}` : "--"}
            </p>
            <p className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
              Global Ranking
            </p>
          </div>
        </div>

        {/* XP Level Strip */}
        <div className="border border-gray-900 rounded-lg p-4 bg-gray-950 text-white flex items-center gap-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white font-mono text-sm font-bold">
                {lvl.level}
              </span>
            </div>
            <div>
              <p className="font-mono text-[10px] text-gray-400 tracking-widest">
                LEVEL
              </p>
              <p className="font-bold text-white text-sm">{lvl.title}</p>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="font-mono text-[10px] text-gray-500">
                {userXP.toLocaleString()} XP
              </span>
              <span className="font-mono text-[10px] text-gray-500">
                {lvl.maxXP < 999999
                  ? lvl.maxXP.toLocaleString() + " XP"
                  : "MAX"}
              </span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-700"
                style={{
                  width:
                    lvl.maxXP < 999999
                      ? `${Math.min(100, Math.round(((userXP - lvl.minXP) / (lvl.maxXP - lvl.minXP)) * 100))}%`
                      : "100%",
                }}
              />
            </div>
          </div>
          <div className="text-right shrink-0">
            {lvl.maxXP < 999999 ? (
              <>
                <p className="font-mono text-xs text-gray-400">
                  {(lvl.maxXP - userXP).toLocaleString()} XP to
                </p>
                <p className="font-mono text-xs text-white font-semibold">
                  Level {lvl.level + 1}
                </p>
              </>
            ) : (
              <p className="font-mono text-xs text-white font-semibold">
                Max Level
              </p>
            )}
          </div>
        </div>

        {/* Daily Challenge + Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Daily Challenge */}
          <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-5 bg-white/80 dark:bg-black/80 backdrop-blur-sm hover:border-black dark:hover:border-gray-500 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-mono text-[10px] tracking-widest text-gray-400">
                  DAILY CHALLENGE
                </p>
                <h3 className="text-sm font-bold text-black dark:text-white mt-0.5">
                  Today&apos;s Problem
                </h3>
              </div>
              <Flame className="w-4 h-4 text-gray-400" />
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 dark:bg-[#111] rounded-lg border border-gray-100 dark:border-gray-800">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-black dark:text-white text-sm">
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
              <div className="flex items-center gap-2 p-2 rounded-md bg-gray-50 dark:bg-[#111]">
                <Zap className="w-3.5 h-3.5 text-gray-500" />
                <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
                  Complete today to earn
                </span>
                <span className="font-mono text-[11px] font-semibold text-black dark:text-white">
                  +150 XP
                </span>
              </div>
            </div>
          </div>

          {/* Leaderboard Peek */}
          <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-5 bg-white/80 dark:bg-black/80 backdrop-blur-sm hover:border-black dark:hover:border-gray-500 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-mono text-[10px] tracking-widest text-gray-400">
                  LEADERBOARD
                </p>
                <h3 className="text-sm font-bold text-black dark:text-white mt-0.5">
                  Top Performers
                </h3>
              </div>
              <Users className="w-4 h-4 text-gray-400" />
            </div>
            <div className="space-y-2">
              {/* Top 3 */}
              {top3.map((u, i) => {
                const badges = ["🏆", "🥈", "🥉"];
                const isYou = u.username === currentUsername;
                return (
                  <div
                    key={u._id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg ${
                      isYou
                        ? "bg-gray-950 text-white border border-gray-800"
                        : "bg-gray-50 dark:bg-[#111] border border-gray-100 dark:border-gray-800"
                    }`}
                  >
                    <span
                      className={`font-mono text-xs w-6 text-center font-bold ${
                        isYou ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      #{i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-mono text-xs font-semibold truncate ${
                          isYou ? "text-white" : "text-gray-800 dark:text-white"
                        }`}
                      >
                        {badges[i]} {u.displayName || u.username}
                        {isYou && " (You)"}
                      </p>
                    </div>
                    <span className="font-mono text-[10px] text-gray-400">
                      {u.xp.toLocaleString()} XP
                    </span>
                  </div>
                );
              })}
              {/* Current user if not in top 3 */}
              {userRank >= 3 && userLbEntry && (
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-950 text-white border border-gray-800">
                  <span className="font-mono text-xs w-6 text-center font-bold text-gray-400">
                    #{userRank + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs font-semibold truncate text-white">
                      {userLbEntry.displayName || userLbEntry.username} (You)
                    </p>
                  </div>
                  <span className="font-mono text-[10px] text-gray-400">
                    {userLbEntry.xp.toLocaleString()} XP
                  </span>
                </div>
              )}
              {top3.length === 0 && (
                <p className="font-mono text-[11px] text-gray-400 text-center py-2">
                  No data yet — be the first on the board!
                </p>
              )}
            </div>
            <a
              href="/dashboard/leaderboard"
              className="flex items-center justify-center gap-1 mt-3 font-mono text-[11px] text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            >
              View full leaderboard <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="font-mono text-[10px] tracking-[0.2em] text-gray-400 mb-3">
            RECENT ACTIVITY
          </h2>
          <div className="space-y-2">
            {recentActivity.length === 0 ? (
              <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 bg-white/80 dark:bg-black/80 text-center">
                <p className="font-mono text-sm text-gray-400">
                  No activity yet — start solving problems!
                </p>
                <a
                  href="/dashboard/dsa-arena"
                  className="inline-flex items-center gap-1 mt-2 font-mono text-xs text-black dark:text-white hover:underline"
                >
                  Go to DSA Arena <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            ) : (
              recentActivity.map((sub) => {
                const accepted = sub.verdict === "accepted";
                const title = sub.question?.title ?? "Unknown Question";
                const level = sub.question?.level ?? "";
                const levelColor =
                  level === "Easy"
                    ? "text-green-600"
                    : level === "Medium"
                      ? "text-yellow-600"
                      : "text-red-600";
                return (
                  <a
                    key={sub._id}
                    href={`/dashboard/dsa-arena/${sub.question?._id ?? ""}`}
                    className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 bg-white/80 dark:bg-black/80 backdrop-blur-sm hover:border-black dark:hover:border-gray-500 transition-all flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                          accepted
                            ? "bg-gray-900"
                            : "bg-gray-100 dark:bg-gray-800"
                        }`}
                      >
                        <Code2
                          className={`w-3.5 h-3.5 ${
                            accepted ? "text-white" : "text-gray-500"
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-black dark:text-white text-sm truncate">
                          {title}
                        </p>
                        <p className="font-mono text-[11px] text-gray-400">
                          <span className={levelColor}>{level}</span>
                          {level ? " · " : ""}
                          {sub.language} · {timeAgo(sub.createdAt)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-mono text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                        accepted
                          ? "bg-gray-900 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {accepted ? "Accepted" : "Attempted"}
                    </span>
                  </a>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
