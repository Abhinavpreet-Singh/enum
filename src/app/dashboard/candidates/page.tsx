"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import axios from "axios";
import { proxy } from "@/app/proxy";
import { DashboardPageShell, DashboardPageHeader } from "@/components/dashboard/dashboard-page-shell";
import {
  Users,
  Clock,
  Search,
  ChevronRight,
  FileText,
  Globe,
  GlobeLock,
  Archive,
  Activity,
  ShieldAlert,
} from "lucide-react";

const panelBorder = "border border-black/20 dark:border-white/25";
const panelSurface = `${panelBorder} bg-white/80 backdrop-blur-[2px] dark:bg-black/75`;

interface Assessment {
  id: string;
  title: string;
  description: string;
  status: string;
  duration: number;
  passingScore: number;
  _count: { attempts: number; questions: number };
}

const statusIcon = (s: string) => {
  if (s === "published") return <Globe className="w-3 h-3 text-emerald-500" />;
  if (s === "archived") return <Archive className="w-3 h-3 text-gray-400" />;
  return <GlobeLock className="w-3 h-3 text-amber-500" />;
};

const statusColor = (s: string) => {
  if (s === "published") return "text-emerald-600 dark:text-emerald-400 border-emerald-400/40";
  if (s === "draft") return "text-amber-600 dark:text-amber-400 border-amber-400/40";
  return "text-gray-500 dark:text-gray-400 border-gray-400/40";
};

export default function CandidatesPage() {
  const [tests, setTests] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get(`${proxy}/api/v1/assessments`, { withCredentials: true });
      // API returns { message, data: [...] }
      setTests(Array.isArray(data.data) ? data.data : []);
    } catch {
      setTests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = tests.filter(
    (t) => !search || t.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <DashboardPageShell maxWidth="full">
      <DashboardPageHeader
        breadcrumb="Company"
        title="Candidates"
        description="Select a test to view candidate submissions, scores, and proctoring data."
      />

      {/* Search */}
      <div className="relative mb-5 max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tests…"
          className="w-full pl-7 pr-3 py-1.5 border border-gray-300 dark:border-neutral-700 bg-white dark:bg-black font-mono text-xs text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <p className="font-mono text-xs text-gray-400 animate-pulse">Loading tests…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className={`${panelSurface} p-12 text-center`}>
          <FileText className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
          <p className="font-mono text-xs text-gray-400">
            {tests.length === 0 ? "No tests found. Create a test first." : "No tests match your search."}
          </p>
          {tests.length === 0 && (
            <Link
              href="/dashboard/tests/create"
              className="inline-block mt-4 px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-mono text-xs"
            >
              Create Test
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((test) => (
            <Link
              key={test.id}
              href={`/dashboard/candidates/${test.id}`}
              className={`${panelSurface} p-4 flex items-center gap-4 hover:border-black/40 dark:hover:border-white/40 transition-colors group`}
            >
              {/* Icon */}
              <div className="shrink-0 w-9 h-9 border border-black/10 dark:border-white/10 flex items-center justify-center">
                {statusIcon(test.status)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-mono text-sm font-bold text-black dark:text-white truncate">
                    {test.title}
                  </h3>
                  <span className={`border px-1.5 py-0.5 font-mono text-[8px] uppercase shrink-0 ${statusColor(test.status)}`}>
                    {test.status}
                  </span>
                </div>
                {test.description && (
                  <p className="font-mono text-[10px] text-gray-400 truncate mb-1">{test.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {test.duration} min
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" /> {test._count.questions} question{test._count.questions !== 1 ? "s" : ""}
                  </span>
                  <span>Pass: {test.passingScore}%</span>
                </div>
              </div>

              {/* Attempts badge */}
              <div className="shrink-0 text-right">
                <div className="flex items-center gap-2 justify-end">
                  {test._count.attempts > 0 && (
                    <div className="flex items-center gap-1 font-mono text-[10px] text-gray-500">
                      <Users className="w-3 h-3" />
                      {test._count.attempts} attempt{test._count.attempts !== 1 ? "s" : ""}
                    </div>
                  )}
                  {test._count.attempts === 0 && (
                    <span className="font-mono text-[9px] text-gray-300 dark:text-gray-600">No attempts yet</span>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-black dark:group-hover:text-white transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </DashboardPageShell>
  );
}
