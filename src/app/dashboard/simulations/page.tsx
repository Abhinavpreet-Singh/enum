"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Bug,
  Clock,
  TrendingUp,
  ChevronRight,
  Loader2,
  Search,
  X,
  Server,
  Monitor,
  Boxes,
  Network,
  CheckCircle2,
  Circle,
  Terminal,
} from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { proxy } from "@/app/proxy";
import { browserSimulations } from "@/data/browser-simulations";
import type { LinuxQuestion } from "@/components/linux/QuestionPanel";
import { linuxQuestionsFallback } from "@/data/linux-questions";

interface SimulationItem {
  id: string;
  title: string;
  category: "frontend" | "backend" | "fullstack" | "devops" | "system-design";
  difficulty: "easy" | "medium" | "hard";
  description: string;
  estimatedTime: number;
  xpReward: number;
  tags: string[];
  status?: {
    attempted: boolean;
    solved: boolean;
    attempts?: number;
    bestScore?: number;
    bestScorePercent?: number;
  };
}

const CATEGORY_META: Record<
  string,
  { label: string; Icon: React.ElementType }
> = {
  frontend: { label: "Frontend", Icon: Monitor },
  backend: { label: "Backend", Icon: Server },
  fullstack: { label: "Linux / Bash", Icon: Terminal },
  "system-design": { label: "System Design", Icon: Network },
};

function normalizeDifficulty(value: string): "easy" | "medium" | "hard" {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "medium" || normalized === "hard") return normalized;
  return "easy";
}

function estimateLinuxTime(difficulty: string, constraintCount: number) {
  const base = {
    easy: 8,
    medium: 12,
    hard: 16,
  }[normalizeDifficulty(difficulty)];

  return base + Math.min(constraintCount, 3);
}

function estimateLinuxXp(difficulty: string, constraintCount: number) {
  const base = {
    easy: 50,
    medium: 75,
    hard: 100,
  }[normalizeDifficulty(difficulty)];

  return base + Math.min(constraintCount, 3) * 5;
}

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

const DIFF_TEXT: Record<string, string> = {
  easy: "text-emerald-500",
  medium: "text-amber-400",
  hard: "text-red-400",
};

const DIFF_ACTIVE: Record<string, string> = {
  easy: "bg-emerald-500 text-white border-emerald-500",
  medium: "bg-amber-400 text-black border-amber-400",
  hard: "bg-red-500 text-white border-red-500",
};

const DIFF_CHIP: Record<string, string> = {
  easy: "bg-emerald-500 text-white",
  medium: "bg-amber-400 text-black",
  hard: "bg-red-500 text-white",
};

export default function SimulationsPage() {
  const [simulations, setSimulations] = useState<SimulationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [activeCats, setActiveCats] = useState<Set<string>>(new Set());
  const [activeDiffs, setActiveDiffs] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"default" | "xp" | "time">("default");

  useEffect(() => {
    // Seed local browser simulations immediately
    const local: SimulationItem[] = browserSimulations.map((s) => ({
      id: s.id,
      title: s.title,
      category: s.category,
      difficulty: s.difficulty,
      description: s.description,
      estimatedTime: s.estimatedTime,
      xpReward: s.xpReward,
      tags: s.tags,
    }));

    Promise.all([
      axios
        .get(`${proxy}/api/v1/simulations/getSimulations`, {
          withCredentials: true,
        })
        .catch(() => null),
      axios
        .get(`${proxy}/api/v1/simulations/linux`, {
          withCredentials: true,
        })
        .catch(() => null),
      axios
        .get(`${proxy}/api/v1/system-design/simulations`, {
          withCredentials: true,
        })
        .catch(() => null),
    ])
      .then(([simRes, linuxRes, sdRes]) => {
        const backend: SimulationItem[] = simRes?.data?.data || [];
        const rawLinuxQuestions = (linuxRes?.data?.data ||
          []) as LinuxQuestion[];
        const linuxSource =
          rawLinuxQuestions.length > 0
            ? rawLinuxQuestions
            : linuxQuestionsFallback;
        const linuxQuestions: SimulationItem[] = linuxSource.map(
          (question) => ({
            id: question.id,
            title: question.title,
            category: "fullstack" as const,
            difficulty: normalizeDifficulty(question.difficulty),
            description: question.description,
            estimatedTime: estimateLinuxTime(
              question.difficulty,
              question.constraints.length,
            ),
            xpReward: estimateLinuxXp(
              question.difficulty,
              question.constraints.length,
            ),
            tags: [
              "Linux",
              "Bash",
              question.language.toUpperCase(),
              ...question.constraints.slice(0, 2),
            ].filter(Boolean),
          }),
        );
        const sdRaw: Array<{
          id: string;
          title: string;
          description: string;
          difficulty: string;
          tags: string[];
          maxScore: number;
          status?: {
            attempted: boolean;
            solved: boolean;
            bestScore?: number;
            bestScorePercent?: number;
          };
        }> = sdRes?.data?.data || [];
        const systemDesign: SimulationItem[] = sdRaw.map((s) => ({
          id: s.id,
          title: s.title,
          category: "system-design" as const,
          difficulty: (s.difficulty || "medium") as "easy" | "medium" | "hard",
          description: s.description,
          estimatedTime: 30,
          xpReward: (s.maxScore ?? 10) * 10,
          tags: s.tags || [],
          status: s.status,
        }));
        const merged = [
          ...local,
          ...linuxQuestions,
          ...systemDesign,
          ...backend,
        ];
        setSimulations(merged.filter((s) => s.category !== "devops"));
      })
      .finally(() => setLoading(false));
  }, []);

  const categories = Object.keys(
    CATEGORY_META,
  ) as (keyof typeof CATEGORY_META)[];

  const toggleSet = (set: Set<string>, val: string): Set<string> => {
    const next = new Set(set);
    if (next.has(val)) {
      next.delete(val);
    } else {
      next.add(val);
    }
    return next;
  };

  const filtered = useMemo(() => {
    let result = simulations;
    if (search.trim())
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(search.toLowerCase()) ||
          s.description.toLowerCase().includes(search.toLowerCase()) ||
          s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())),
      );
    if (activeCats.size)
      result = result.filter((s) => activeCats.has(s.category));
    if (activeDiffs.size)
      result = result.filter((s) => activeDiffs.has(s.difficulty));
    if (sortBy === "xp")
      result = [...result].sort((a, b) => b.xpReward - a.xpReward);
    if (sortBy === "time")
      result = [...result].sort((a, b) => a.estimatedTime - b.estimatedTime);
    return result;
  }, [simulations, search, activeCats, activeDiffs, sortBy]);

  const hasActiveFilters =
    search || activeCats.size || activeDiffs.size || sortBy !== "default";

  const clearAll = () => {
    setSearch("");
    setActiveCats(new Set());
    setActiveDiffs(new Set());
    setSortBy("default");
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] tracking-[0.3em] text-gray-400 uppercase mb-1">
              Dashboard / Simulations
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-black dark:text-white tracking-tight">
              Production Simulations
            </h1>
            <p className="font-mono text-xs text-gray-500 dark:text-gray-400 mt-1">
              {loading
                ? "—"
                : `${filtered.length} of ${simulations.length} simulations`}
            </p>
          </div>
        </div>

        {/* Status Legend */}
        <div className="flex items-center gap-4 font-mono text-[10px] text-gray-400 dark:text-gray-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Solved
          </span>
          <span className="flex items-center gap-1.5">
            <Circle className="w-3.5 h-3.5 text-amber-400" />
            Attempted
          </span>
          <span className="flex items-center gap-1.5">
            <Circle className="w-3.5 h-3.5 text-gray-200 dark:text-white/10" />
            Not Started
          </span>
        </div>

        {/* Category stat pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {categories.map((cat) => {
            const { label, Icon } = CATEGORY_META[cat];
            const count = simulations.filter((s) => s.category === cat).length;
            const isActive = activeCats.has(cat);
            return (
              <button
                key={cat}
                onClick={() => setActiveCats(toggleSet(activeCats, cat))}
                className={`flex items-center justify-between p-3 border text-left transition-all duration-200 ${
                  isActive
                    ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black"
                    : "border-gray-200 dark:border-white/8 bg-white dark:bg-[#111] hover:border-gray-400 dark:hover:border-white/30 text-black dark:text-white"
                }`}
              >
                <div>
                  <p className="font-mono text-[10px] tracking-widest text-current mb-0.5">
                    {label.toUpperCase()}
                  </p>
                  <p className="text-xl font-bold">{count}</p>
                </div>
                <Icon className="w-5 h-5 opacity-40" />
              </button>
            );
          })}
        </div>

        {/* Search + filter bar */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search simulations, tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#111] border border-gray-200 dark:border-white/8 text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-600 font-mono text-sm focus:outline-none focus:border-black dark:focus:border-white/50 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Difficulty filters */}
          <div className="flex items-center gap-1.5">
            {DIFFICULTIES.map((d) => {
              const active = activeDiffs.has(d);
              return (
                <button
                  key={d}
                  onClick={() => setActiveDiffs(toggleSet(activeDiffs, d))}
                  className={`px-3 py-2.5 border font-mono text-xs tracking-wide transition-all duration-200 ${
                    active
                      ? DIFF_ACTIVE[d]
                      : "border-gray-200 dark:border-white/8 text-black dark:text-white hover:border-gray-400 dark:hover:border-white/30 bg-white dark:bg-[#111]"
                  }`}
                >
                  {d.toUpperCase()}
                </button>
              );
            })}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1.5">
            {(
              [
                ["xp", "By XP"],
                ["time", "By Time"],
              ] as const
            ).map(([val, lbl]) => (
              <button
                key={val}
                onClick={() =>
                  setSortBy((prev) => (prev === val ? "default" : val))
                }
                className={`px-3 py-2.5 border font-mono text-xs tracking-wide transition-all duration-200 ${
                  sortBy === val
                    ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black"
                    : "border-gray-200 dark:border-white/8 text-black dark:text-white hover:border-gray-400 dark:hover:border-white/30 bg-white dark:bg-[#111]"
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] text-gray-400 tracking-widest">
              ACTIVE:
            </span>
            {[...activeCats].map((c) => (
              <button
                key={c}
                onClick={() => setActiveCats(toggleSet(activeCats, c))}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-black dark:bg-white text-white dark:text-black font-mono text-[10px] tracking-wide"
              >
                {CATEGORY_META[c]?.label ?? c}
                <X className="w-3 h-3" />
              </button>
            ))}
            {[...activeDiffs].map((d) => (
              <button
                key={d}
                onClick={() => setActiveDiffs(toggleSet(activeDiffs, d))}
                className={`flex items-center gap-1.5 px-2.5 py-1 font-mono text-[10px] tracking-wide ${DIFF_CHIP[d]}`}
              >
                {d.toUpperCase()}
                <X className="w-3 h-3" />
              </button>
            ))}
            {sortBy !== "default" && (
              <button
                onClick={() => setSortBy("default")}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-black dark:bg-white text-white dark:text-black font-mono text-[10px] tracking-wide"
              >
                Sort: {sortBy.toUpperCase()}
                <X className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={clearAll}
              className="font-mono text-[10px] text-gray-400 hover:text-black dark:hover:text-white transition-colors ml-1"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-100 dark:border-white/8" />

        {/* Body */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400 mr-2.5" />
            <span className="font-mono text-sm text-gray-500">
              Loading simulations...
            </span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 border border-gray-200 dark:border-white/8 flex items-center justify-center">
              <Bug className="w-5 h-5 text-gray-400" />
            </div>
            <p className="font-mono text-sm text-gray-500">
              No simulations match your filters.
            </p>
            <button
              onClick={clearAll}
              className="font-mono text-xs text-gray-400 hover:text-black dark:hover:text-white underline transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-px">
            {filtered.map((sim, idx) => {
              const { label: catLabel, Icon: CatIcon } = CATEGORY_META[
                sim.category
              ] ?? {
                label: sim.category,
                Icon: Boxes,
              };
              return (
                <Link
                  key={sim.id}
                  href={
                    sim.category === "system-design"
                      ? `/dashboard/simulations/system-design/${sim.id}`
                      : sim.category === "fullstack"
                        ? `/dashboard/simulations/linux?id=${sim.id}`
                        : `/dashboard/simulations/${sim.id}`
                  }
                  className="group flex items-start gap-5 p-5 border border-gray-100 dark:border-white/8 hover:border-gray-300 dark:hover:border-white/30 bg-white dark:bg-[#111] hover:bg-gray-50 dark:hover:bg-[#161616] transition-all duration-200"
                >
                  {/* Status + Index */}
                  <div className="flex flex-col items-center gap-2 shrink-0 pt-0.5">
                    {sim.status?.solved ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : sim.status?.attempted ? (
                      <Circle className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-200 dark:text-white/10" />
                    )}
                    <span className="font-mono text-xs text-gray-300 dark:text-white/20 select-none">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                  </div>

                  {/* Main */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-1.5">
                      <h3 className="font-bold text-black dark:text-white text-sm md:text-base leading-snug group-hover:underline underline-offset-2">
                        {sim.title}
                      </h3>
                      <ChevronRight className="w-4 h-4 text-gray-300 dark:text-white/20 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                    </div>

                    <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed mb-3 line-clamp-2">
                      {sim.description}
                    </p>

                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Difficulty */}
                      <span
                        className={`font-mono text-[10px] tracking-widest font-semibold ${DIFF_TEXT[sim.difficulty]}`}
                      >
                        {sim.difficulty.charAt(0).toUpperCase() +
                          sim.difficulty.slice(1)}
                      </span>

                      {/* Category */}
                      <span className="flex items-center gap-1 font-mono text-[10px] text-gray-400 dark:text-gray-500">
                        <CatIcon className="w-3 h-3" />
                        {catLabel.toUpperCase()}
                      </span>

                      {/* Time */}
                      <span className="flex items-center gap-1 font-mono text-[10px] text-gray-400 dark:text-gray-500">
                        <Clock className="w-3 h-3" />
                        {sim.estimatedTime}m
                      </span>

                      {/* XP */}
                      <span className="flex items-center gap-1 font-mono text-[10px] text-gray-400 dark:text-gray-500">
                        <TrendingUp className="w-3 h-3" />+{sim.xpReward} XP
                      </span>

                      {/* Tags */}
                      {sim.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="font-mono text-[10px] px-2 py-0.5 border border-gray-100 dark:border-white/8 text-gray-400 dark:text-gray-600"
                        >
                          {tag}
                        </span>
                      ))}
                      {sim.tags.length > 3 && (
                        <span className="font-mono text-[10px] text-gray-300 dark:text-white/20">
                          +{sim.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
