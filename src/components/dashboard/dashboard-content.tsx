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
  AlertTriangle,
  Handshake,
  Target,
} from "lucide-react";
import {
  CollabLivePreview,
  DsaTestRunnerPreview,
  IncidentOpsPreview,
  SimulationScenePreview,
} from "@/components/dashboard/panel-previews";

/** Always-visible panel borders — theme-aware, not hover-only */
const panelBorder = "border border-black/20 dark:border-white/25";
const panelSurface = `${panelBorder} bg-white/80 backdrop-blur-[2px] dark:bg-black/75`;
const panelHover =
  "transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out hover:border-black hover:bg-white/45 hover:shadow-sm hover:-translate-y-0.5 dark:hover:border-white dark:hover:bg-black/40 dark:hover:shadow-white/5";
const panelLink = `group block ${panelSurface} ${panelHover}`;
const statCard = `${panelSurface} p-4`;
const cardFooterArrow =
  "inline-flex h-6 w-6 items-center justify-center border border-black/12 transition-colors group-hover:border-black group-hover:bg-black group-hover:text-white dark:border-white/18 dark:group-hover:border-white dark:group-hover:bg-white dark:group-hover:text-black";
const arrowCardFooter = "relative mt-1 flex shrink-0 items-center justify-end";
/** Feature nav — preview grows to fill card */
const featureNavCard = `${panelLink} flex min-h-[11rem] min-w-0 flex-col overflow-hidden p-2.5 sm:min-h-[12rem] sm:p-3`;
const featureNavBody = "flex min-h-0 flex-1 flex-col";
/** Daily challenge & leaderboard share this footprint */
const sectionPanelH = "min-h-40 lg:min-h-[10.5rem]";
const progressTrack =
  "relative h-1.5 overflow-hidden rounded-sm border border-black/15 bg-black/[0.08] dark:border-white/20 dark:bg-white/[0.1]";
const progressFill =
  "absolute inset-y-0 left-0 bg-black dark:bg-white transition-all duration-700";
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

interface DailyChallengeSimulation {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  maxScore: number;
  tags?: string[];
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
      const hardSim = sdSims.find(
        (s: DailyChallengeSimulation) => s.difficulty === "hard",
      );
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

    const fetchProfileXp = () => {
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
            setStats((prev) => ({
              ...prev,
              currentStreak: data.currentStreak,
            }));
          }
        })
        .catch(() => {});
    };

    fetchProfileXp();

    const onXpUpdated = (e: Event) => {
      const xp = (e as CustomEvent<{ xp: number }>).detail?.xp;
      if (typeof xp === "number") setProfileXp(xp);
      else fetchProfileXp();
    };

    window.addEventListener("userXpUpdated", onXpUpdated);
    window.addEventListener("focus", fetchProfileXp);
    return () => {
      window.removeEventListener("userXpUpdated", onXpUpdated);
      window.removeEventListener("focus", fetchProfileXp);
    };
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
          <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white md:text-3xl">
            {greeting} {displayName}.
          </h1>
          <p className="mt-1 font-mono text-xs text-gray-500 dark:text-gray-400">
            Your workspace to practice, simulate, and collaborate.
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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Problems Solved */}
        <div className={statCard}>
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
          <div className={`${progressTrack} mt-3`}>
            <div
              className={progressFill}
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
        <div className={statCard}>
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
          <div className={`${progressTrack} mt-3`}>
            <div
              className={progressFill}
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
        <div className={statCard}>
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
          <div className={progressTrack}>
            <div className={progressFill} style={{ width: `${xpPct}%` }} />
          </div>
          <p className="font-mono text-[10px] text-gray-400 dark:text-gray-500 mt-2">
            Experience Points
          </p>
        </div>

        {/* Global Rank */}
        <div className={statCard}>
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
          <div className={progressTrack}>
            {stats.globalRank && leaderboard.length > 0 && (
              <div
                className={progressFill}
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

      {/* ── Feature nav: single row (4) ─────────────────── */}
      <div className="grid min-w-0 grid-cols-4 gap-2 sm:gap-3">
        <Link href="/dashboard/simulations" className={featureNavCard}>
          <div className={featureNavBody}>
            <div className="mb-1.5 flex shrink-0 items-center justify-between gap-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                Simulations
              </p>
              <PlayCircle className="h-3 w-3 shrink-0 text-amber-400/80" />
            </div>
            <SimulationScenePreview />
          </div>
          <div className={arrowCardFooter}>
            <span className={cardFooterArrow}>
              <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </Link>

        <Link href="/dashboard/incidents" className={featureNavCard}>
          <div className={featureNavBody}>
            <div className="mb-1.5 flex shrink-0 items-center justify-between gap-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                Incidents
              </p>
              <AlertTriangle className="h-3 w-3 shrink-0 text-red-500/80 animate-pulse" />
            </div>
            <IncidentOpsPreview />
          </div>
          <div className={arrowCardFooter}>
            <span className={cardFooterArrow}>
              <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </Link>

        <Link href="/dashboard/dsa-arena" className={featureNavCard}>
          <div className={featureNavBody}>
            <div className="mb-1.5 flex shrink-0 items-center justify-between gap-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                DSA Arena
              </p>
              <Target className="h-3 w-3 shrink-0 text-emerald-500/80" />
            </div>
            <DsaTestRunnerPreview />
          </div>
          <div className={arrowCardFooter}>
            <span className={cardFooterArrow}>
              <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </Link>

        <Link href="/dashboard/collab" className={featureNavCard}>
          <div className={featureNavBody}>
            <div className="mb-1.5 flex shrink-0 items-center justify-between gap-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                Collaboration
              </p>
              <Handshake className="h-3 w-3 shrink-0 text-violet-500/80" />
            </div>
            <CollabLivePreview />
          </div>
          <div className={arrowCardFooter}>
            <span className={cardFooterArrow}>
              <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </Link>
      </div>

      {/* ── XP Level ───────────────────────────────────── */}
      <div className={`${panelSurface} ${panelHover}`}>
        <div className="flex flex-col items-start gap-5 p-5 sm:flex-row sm:items-center">
          {/* Level badge */}
          <div className="flex shrink-0 items-center gap-4">
            <div
              className={`relative flex h-14 w-14 items-center justify-center ${panelBorder} bg-black/4 dark:bg-white/6`}
            >
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

            {/* Bar — black track/fill in light, white in dark */}
            <div className="relative h-4 overflow-hidden rounded-sm border border-black/25 bg-black/12 dark:border-white/30 dark:bg-white/14">
              <div
                className="h-full bg-black transition-all duration-700 dark:bg-white"
                style={{ width: `${xpPct}%` }}
              />
              {[25, 50, 75].map((p) => (
                <span
                  key={p}
                  className="absolute top-0 bottom-0 z-10 w-px bg-black/20 dark:bg-white/25"
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
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div
          className={`${panelSurface} ${panelHover} flex ${sectionPanelH} min-w-0 flex-col p-4`}
        >
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                Daily Challenge
              </p>
              <h3 className="mt-0.5 text-sm font-bold text-black dark:text-white">
                {"Today's Problem"}
              </h3>
            </div>
            <Flame className="h-4 w-4 text-orange-400" />
          </div>

          {dailyChallenge ? (
            <Link
              href={`/dashboard/simulations/system-design/${dailyChallenge.id}`}
              className={`${panelLink} flex flex-1 flex-col justify-between p-2.5`}
            >
              <div>
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <Network className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    <p className="line-clamp-1 text-sm font-semibold text-black dark:text-white">
                      {dailyChallenge.title}
                    </p>
                  </div>
                  <span className="shrink-0 border border-red-400/40 px-2 py-0.5 font-mono text-[9px] text-red-600 dark:text-red-400">
                    {dailyChallenge.difficulty.toUpperCase()}
                  </span>
                </div>
                <p className="line-clamp-1 font-mono text-[10px] text-gray-500 dark:text-gray-400">
                  {dailyChallenge.description}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {dailyChallenge.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="border border-black/10 px-1.5 py-0.5 font-mono text-[9px] text-black/70 dark:border-white/15 dark:text-white/70"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono text-[10px] font-semibold text-black dark:text-white">
                  +{dailyChallenge.maxScore * 10} XP
                </span>
                <span className={cardFooterArrow}>
                  <ChevronRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          ) : (
            <div className={`${panelBorder} flex flex-1 items-center p-2.5`}>
              <div className="animate-pulse space-y-2 w-full">
                <div className="h-4 w-3/4 rounded bg-black/5 dark:bg-white/5" />
                <div className="h-3 w-1/2 rounded bg-black/5 dark:bg-white/5" />
              </div>
            </div>
          )}
        </div>

        <Link
          href="/dashboard/leaderboard"
          className={`${panelLink} flex ${sectionPanelH} min-w-0 flex-col p-4`}
        >
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                Leaderboard
              </p>
              <h3 className="mt-0.5 text-sm font-bold text-black dark:text-white">
                Top performers
              </h3>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="flex items-center gap-1.5 border border-black/15 px-2 py-1 dark:border-white/20">
                <Flame className="h-3 w-3 text-orange-400" />
                <span className="font-mono text-[10px] tabular-nums text-black dark:text-white">
                  {stats.currentStreak}d
                </span>
              </div>
              <Users className="h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div className="min-h-0 flex-1 divide-y divide-gray-50 dark:divide-white/5">
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
                  className={`relative flex items-center gap-2 py-2 ${isYou ? "pl-2.5" : ""}`}
                >
                  {isYou && (
                    <span className="absolute top-1 bottom-1 left-0 w-0.5 bg-black dark:bg-white" />
                  )}
                  <span className="w-6 shrink-0 text-center text-sm">
                    {RANK_MEDALS[i]}
                  </span>
                  <p className="min-w-0 flex-1 truncate font-mono text-xs font-semibold text-black dark:text-white">
                    {u.displayName || u.username}
                    {isYou && (
                      <span className="ml-1 font-mono text-[9px] bg-black px-1 py-px text-white dark:bg-white dark:text-black">
                        you
                      </span>
                    )}
                  </p>
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-gray-400">
                    {u.xp.toLocaleString()}
                  </span>
                </div>
              );
            })}

            {userRank >= 3 && userLbEntry && (
              <div className="relative flex items-center gap-2 py-2 pl-2.5">
                <span className="absolute top-1 bottom-1 left-0 w-0.5 bg-black dark:bg-white" />
                <span className="w-6 shrink-0 text-center font-mono text-[10px] text-gray-400">
                  #{userRank + 1}
                </span>
                <p className="min-w-0 flex-1 truncate font-mono text-xs font-semibold text-black dark:text-white">
                  {userLbEntry.displayName || userLbEntry.username}
                  <span className="ml-1 font-mono text-[9px] bg-black px-1 py-px text-white dark:bg-white dark:text-black">
                    you
                  </span>
                </p>
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-gray-400">
                  {userLbEntry.xp.toLocaleString()}
                </span>
              </div>
            )}

            {top3.length === 0 && (
              <p className="py-3 text-center font-mono text-[11px] text-gray-400">
                No data yet — be the first!
              </p>
            )}
          </div>

          <div className="mt-1 flex justify-end">
            <span className={cardFooterArrow}>
              <ChevronRight className="h-4 w-4" />
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
