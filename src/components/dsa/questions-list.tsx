"use client";

import Link from "next/link";
import { Question, fetchQuestions } from "@/data/dsa-questions";
import { useEffect, useState, useMemo } from "react";
import { Search, X, ChevronRight } from "lucide-react";

const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;

const DIFF_STYLE: Record<string, string> = {
  Easy: "text-emerald-500",
  Medium: "text-amber-400",
  Hard: "text-red-400",
};

const DIFF_ACTIVE_STYLE: Record<string, string> = {
  Easy: "bg-emerald-500 text-white border-emerald-500",
  Medium: "bg-amber-400 text-black border-amber-400",
  Hard: "bg-red-500 text-white border-red-500",
};

const DIFF_INACTIVE =
  "border-gray-200 dark:border-white/8 text-black dark:text-white bg-white dark:bg-[#111] hover:border-gray-400 dark:hover:border-white/30";

export default function QuestionsList() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeDiffs, setActiveDiffs] = useState<Set<string>>(new Set());
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    fetchQuestions()
      .then(setQuestions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(
    () => [...new Set(questions.map((q) => q.category))].sort(),
    [questions],
  );

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
    let result = questions;
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(term) ||
          p.category.toLowerCase().includes(term),
      );
    }
    if (activeDiffs.size)
      result = result.filter((p) => activeDiffs.has(p.difficulty));
    if (activeCategories.size)
      result = result.filter((p) => activeCategories.has(p.category));
    return result;
  }, [questions, search, activeDiffs, activeCategories]);

  const hasFilters = !!(search || activeDiffs.size || activeCategories.size);

  const counts = useMemo(
    () => ({
      Easy: questions.filter((q) => q.difficulty === "Easy").length,
      Medium: questions.filter((q) => q.difficulty === "Medium").length,
      Hard: questions.filter((q) => q.difficulty === "Hard").length,
    }),
    [questions],
  );

  const clearAll = () => {
    setSearch("");
    setActiveDiffs(new Set());
    setActiveCategories(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex items-center gap-4 font-mono text-xs">
        <span className="text-gray-500 dark:text-gray-400">
          <span className="text-black dark:text-white font-bold">
            {questions.length}
          </span>{" "}
          problems
        </span>
        <span className="text-emerald-500">
          <span className="font-bold">{counts.Easy}</span> Easy
        </span>
        <span className="text-amber-400">
          <span className="font-bold">{counts.Medium}</span> Medium
        </span>
        <span className="text-red-400">
          <span className="font-bold">{counts.Hard}</span> Hard
        </span>
      </div>

      {/* Search + difficulty */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search problems..."
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
        <div className="flex items-center gap-1.5">
          {DIFFICULTIES.map((d) => {
            const active = activeDiffs.has(d);
            return (
              <button
                key={d}
                onClick={() => setActiveDiffs(toggleSet(activeDiffs, d))}
                className={`px-3 py-2.5 border font-mono text-xs tracking-wide transition-all duration-200 ${active ? DIFF_ACTIVE_STYLE[d] : DIFF_INACTIVE}`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      {/* Category pills */}
      {categories.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {categories.map((cat) => {
            const active = activeCategories.has(cat);
            return (
              <button
                key={cat}
                onClick={() =>
                  setActiveCategories(toggleSet(activeCategories, cat))
                }
                className={`px-2.5 py-1 border font-mono text-[10px] tracking-widest uppercase transition-all duration-200 ${
                  active
                    ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black"
                    : "border-gray-200 dark:border-white/8 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-white/30 hover:text-black dark:hover:text-white"
                }`}
              >
                {cat}
              </button>
            );
          })}
          {hasFilters && (
            <button
              onClick={clearAll}
              className="px-2.5 py-1 font-mono text-[10px] tracking-widest text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            >
              CLEAR
            </button>
          )}
        </div>
      )}

      {/* Active count */}
      {hasFilters && (
        <p className="font-mono text-[10px] text-gray-400 tracking-widest">
          {filtered.length} of {questions.length} problems
        </p>
      )}

      {/* Table */}
      {loading ? (
        <div className="border border-gray-100 dark:border-white/8 bg-white dark:bg-[#111]">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 dark:border-white/5 last:border-0"
            >
              <div className="w-8 h-3 bg-gray-100 dark:bg-white/5 rounded animate-pulse" />
              <div className="flex-1 h-3 bg-gray-100 dark:bg-white/5 rounded animate-pulse" />
              <div className="w-14 h-3 bg-gray-100 dark:bg-white/5 rounded animate-pulse" />
              <div className="w-20 h-3 bg-gray-100 dark:bg-white/5 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-gray-100 dark:border-white/8 bg-white dark:bg-[#111] py-16 text-center">
          <p className="font-mono text-sm text-gray-400">No problems found.</p>
          {hasFilters && (
            <button
              onClick={clearAll}
              className="mt-2 font-mono text-xs text-gray-400 hover:text-black dark:hover:text-white underline transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="border border-gray-100 dark:border-white/8 overflow-hidden">
          {/* Header row */}
          <div className="hidden md:grid grid-cols-[3rem_1fr_7rem_9rem_2rem] items-center px-5 py-2.5 border-b border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-[#161616]">
            <span className="font-mono text-[10px] text-gray-400 tracking-widest">
              #
            </span>
            <span className="font-mono text-[10px] text-gray-400 tracking-widest">
              TITLE
            </span>
            <span className="font-mono text-[10px] text-gray-400 tracking-widest">
              DIFFICULTY
            </span>
            <span className="font-mono text-[10px] text-gray-400 tracking-widest">
              TOPIC
            </span>
            <span />
          </div>

          {filtered.map((q, i) => (
            <Link
              key={q.id ?? `q-${i}`}
              href={`/dashboard/dsa-arena/${q.id}`}
              className={`group flex md:grid md:grid-cols-[3rem_1fr_7rem_9rem_2rem] items-center gap-3 md:gap-0 px-5 py-3.5 border-b border-gray-100 dark:border-white/5 last:border-0 transition-colors ${
                i % 2 === 0
                  ? "bg-white dark:bg-[#111] hover:bg-gray-50 dark:hover:bg-[#161616]"
                  : "bg-gray-50/60 dark:bg-[#0d0d0d] hover:bg-gray-50 dark:hover:bg-[#161616]"
              }`}
            >
              <span className="hidden md:block font-mono text-xs text-gray-300 dark:text-white/20 tabular-nums">
                {i + 1}
              </span>
              <span className="flex-1 text-sm font-medium text-black dark:text-white">
                {q.title}
              </span>
              <span
                className={`font-mono text-xs font-semibold ${DIFF_STYLE[q.difficulty]}`}
              >
                {q.difficulty}
              </span>
              <span className="hidden md:block font-mono text-[10px] tracking-wide text-gray-400 dark:text-gray-500 uppercase">
                {q.category}
              </span>
              <ChevronRight className="hidden md:block w-4 h-4 text-gray-200 dark:text-white/15 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
