"use client";

import Link from "next/link";
import { Question, fetchQuestions } from "@/data/dsa-questions";
import {
  useEffect,
  useState,
  useMemo,
  useRef,
  useLayoutEffect,
} from "react";
import {
  Search,
  X,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Circle,
} from "lucide-react";

const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;

/** Preferred display order for topic tabs; unknown topics sort alphabetically after these. */
const TOPIC_TAB_ORDER = [
  "OOP",
  "Arrays",
  "Matrix",
  "String",
  "Stack",
  "Two Pointers",
  "Sliding Window",
  "Binary Search",
  "Dynamic Programming",
  "Greedy",
  "Math",
  "Deque",
] as const;

function sortTopics(topics: string[]): string[] {
  const order = new Map(TOPIC_TAB_ORDER.map((t, i) => [t, i]));
  return [...topics].sort((a, b) => {
    const ai = order.get(a as (typeof TOPIC_TAB_ORDER)[number]) ?? 999;
    const bi = order.get(b as (typeof TOPIC_TAB_ORDER)[number]) ?? 999;
    if (ai !== bi) return ai - bi;
    return a.localeCompare(b);
  });
}

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

type TopicTabItem = {
  key: string;
  label: string;
  count: number;
};

const MORE_BUTTON_WIDTH = 44;

function topicTabClass(active: boolean) {
  return `flex items-center gap-2 border px-3 py-2.5 font-mono text-[10px] tracking-wider uppercase transition-colors shrink-0 whitespace-nowrap ${
    active
      ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
      : "border-gray-200 dark:border-white/8 bg-transparent text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-white/30 hover:text-black dark:hover:text-white"
  }`;
}

function TopicTabButton({
  item,
  active,
  onClick,
}: {
  item: TopicTabItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={topicTabClass(active)}
    >
      <span>{item.label}</span>
      <span className={active ? "opacity-70" : "text-gray-400"}>
        ({item.count})
      </span>
    </button>
  );
}

function TopicTabsBar({
  items,
  activeTab,
  onSelect,
}: {
  items: TopicTabItem[];
  activeTab: string;
  onSelect: (key: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(items.length);
  const [menuOpen, setMenuOpen] = useState(false);

  useLayoutEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      const measureRow = measureRef.current;
      if (!container || !measureRow) return;

      const buttons = Array.from(measureRow.children) as HTMLElement[];
      const available = container.clientWidth;
      let used = 0;
      let fit = 0;

      for (let i = 0; i < buttons.length; i++) {
        const width = buttons[i].offsetWidth;
        const hasMoreAfter = i < buttons.length - 1;
        const reserve = hasMoreAfter ? MORE_BUTTON_WIDTH : 0;
        if (used + width + reserve > available) break;
        used += width;
        fit = i + 1;
      }

      setVisibleCount(Math.max(1, fit));
    };

    measure();
    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [items]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const hasOverflow = visibleCount < items.length;

  const { visibleItems, overflowItems } = useMemo(() => {
    if (!hasOverflow) {
      return { visibleItems: items, overflowItems: [] as TopicTabItem[] };
    }

    let visible = items.slice(0, visibleCount);
    let overflow = items.slice(visibleCount);
    const activeIdx = items.findIndex((item) => item.key === activeTab);

    if (activeIdx >= visibleCount && activeIdx !== -1) {
      const activeItem = items[activeIdx];
      visible = [...items.slice(0, visibleCount - 1), activeItem];
      overflow = items.filter(
        (item) => !visible.some((v) => v.key === item.key),
      );
    }

    return { visibleItems: visible, overflowItems: overflow };
  }, [items, visibleCount, hasOverflow, activeTab]);

  const menuHasActive = overflowItems.some((item) => item.key === activeTab);

  return (
    <div
      ref={containerRef}
      className="relative flex items-stretch gap-0 border-b border-gray-200 dark:border-white/10 -mx-1"
    >
      {/* Hidden row for width measurement */}
      <div
        ref={measureRef}
        className="invisible absolute top-0 left-0 flex flex-nowrap gap-0 pointer-events-none"
        aria-hidden
      >
        {items.map((item) => (
          <TopicTabButton
            key={`measure-${item.key}`}
            item={item}
            active={false}
            onClick={() => {}}
          />
        ))}
      </div>

      <div className="flex flex-nowrap items-stretch min-w-0 overflow-hidden">
        {visibleItems.map((item) => (
          <TopicTabButton
            key={item.key}
            item={item}
            active={activeTab === item.key}
            onClick={() => onSelect(item.key)}
          />
        ))}
      </div>

      {hasOverflow && (
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="true"
            aria-label="Show more topics"
            className={`flex h-full items-center justify-center border px-2.5 py-2.5 transition-colors ${
              menuOpen || menuHasActive
                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                : "border-gray-200 dark:border-white/8 bg-transparent text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-white/30 hover:text-black dark:hover:text-white"
            }`}
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-0.5 min-w-48 max-h-72 overflow-y-auto border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111] shadow-lg">
              <div className="flex flex-wrap gap-0 p-1">
                {items.map((item) => (
                  <TopicTabButton
                    key={`menu-${item.key}`}
                    item={item}
                    active={activeTab === item.key}
                    onClick={() => {
                      onSelect(item.key);
                      setMenuOpen(false);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function QuestionsList() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeDiffs, setActiveDiffs] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<string>("All");

  useEffect(() => {
    fetchQuestions()
      .then(setQuestions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const topics = useMemo(
    () => sortTopics([...new Set(questions.map((q) => q.category))]),
    [questions],
  );

  const topicCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const q of questions) {
      counts[q.category] = (counts[q.category] ?? 0) + 1;
    }
    return counts;
  }, [questions]);

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
    if (activeTab !== "All")
      result = result.filter((p) => p.category === activeTab);
    return result;
  }, [questions, search, activeDiffs, activeTab]);

  const hasFilters = !!(search || activeDiffs.size || activeTab !== "All");

  const tabQuestions = useMemo(
    () =>
      activeTab === "All"
        ? questions
        : questions.filter((q) => q.category === activeTab),
    [questions, activeTab],
  );

  const counts = useMemo(
    () => ({
      Easy: tabQuestions.filter((q) => q.difficulty === "Easy").length,
      Medium: tabQuestions.filter((q) => q.difficulty === "Medium").length,
      Hard: tabQuestions.filter((q) => q.difficulty === "Hard").length,
    }),
    [tabQuestions],
  );

  const topicTabItems = useMemo<TopicTabItem[]>(
    () => [
      { key: "All", label: "All", count: questions.length },
      ...topics.map((topic) => ({
        key: topic,
        label: topic,
        count: topicCounts[topic] ?? 0,
      })),
    ],
    [topics, questions.length, topicCounts],
  );

  const clearAll = () => {
    setSearch("");
    setActiveDiffs(new Set());
    setActiveTab("All");
  };

  return (
    <div className="space-y-4">
      {/* Topic tabs — single row with overflow dropdown */}
      {!loading && topics.length > 0 && (
        <TopicTabsBar
          items={topicTabItems}
          activeTab={activeTab}
          onSelect={setActiveTab}
        />
      )}
      {/* Stats */}
      <div className="flex items-center gap-4 font-mono text-xs">
        <span className="text-gray-500 dark:text-gray-400">
          <span className="text-black dark:text-white font-bold">
            {tabQuestions.length}
          </span>{" "}
          problems{activeTab !== "All" ? ` in ${activeTab}` : ""}
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

      {/* Active count */}
      {hasFilters && (
        <p className="font-mono text-[10px] text-gray-400 tracking-widest">
          {filtered.length} of {tabQuestions.length} problems
          <button
            type="button"
            onClick={clearAll}
            className="ml-3 text-gray-400 hover:text-black dark:hover:text-white underline transition-colors"
          >
            Clear filters
          </button>
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
          <div className="hidden md:grid grid-cols-[2.5rem_3rem_1fr_7rem_9rem_2rem] items-center px-5 py-2.5 border-b border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-[#161616]">
            <span className="font-mono text-[10px] text-gray-400 tracking-widest">
              STATUS
            </span>
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
              className={`group flex md:grid md:grid-cols-[2.5rem_3rem_1fr_7rem_9rem_2rem] items-center gap-3 md:gap-0 px-5 py-3.5 border-b border-gray-100 dark:border-white/5 last:border-0 transition-colors ${
                i % 2 === 0
                  ? "bg-white dark:bg-[#111] hover:bg-gray-50 dark:hover:bg-[#161616]"
                  : "bg-gray-50/60 dark:bg-[#0d0d0d] hover:bg-gray-50 dark:hover:bg-[#161616]"
              }`}
            >
              <span className="flex items-center justify-center">
                {q.status?.solved ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : q.status?.attempted ? (
                  <Circle className="w-4 h-4 text-amber-400" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-200 dark:text-white/10" />
                )}
              </span>
              <span className="hidden md:block font-mono text-xs text-gray-300 dark:text-white/20 tabular-nums">
                {i + 1}
              </span>
              <span className="flex-1 text-sm font-medium text-black dark:text-white">
                {q.title}
                {(q.status?.attempts ?? 0) > 1 && (
                  <span className="ml-2 font-mono text-[10px] text-gray-400">
                    {q.status?.attempts}×
                  </span>
                )}
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
