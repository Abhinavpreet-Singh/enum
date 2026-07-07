"use client";

import { API_BASE_URL } from "@/lib/api-config";
import api from "@/lib/api";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DashboardPageShell, DashboardPageHeader } from "@/components/dashboard/dashboard-page-shell";
import { TestLinkCopy } from "@/components/dashboard/organization/test-link-copy";
import {
  Plus,
  FileText,
  Search,
  Clock,
  Users,
  Send,
  Trash2,
  Globe,
  GlobeLock,
  Archive,
  Settings2,
  BarChart2,
} from "lucide-react";

const panelBorder = "border border-black/20 dark:border-white/25";
const panelSurface = `${panelBorder} bg-white/80 backdrop-blur-[2px] dark:bg-black/75`;
const inputCls =
  "w-full border border-gray-300 dark:border-neutral-700 bg-white dark:bg-black px-3 py-2 font-mono text-xs text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors";

interface Assessment {
  id: string;
  title: string;
  description: string;
  duration: number;
  status: string;
  testCode: string;
  passingScore: number;
  maxAttempts: number;
  createdAt: string;
  _count: { attempts: number; invites: number; questions: number };
}

const STATUS_FILTERS = ["all", "draft", "published", "archived"] as const;

const statusColor = (s: string) => {
  if (s === "published") return "text-emerald-600 dark:text-emerald-400 border-emerald-400/40";
  if (s === "draft") return "text-amber-600 dark:text-amber-400 border-amber-400/40";
  return "text-gray-500 dark:text-gray-400 border-gray-400/40";
};

export default function TestsPage() {
  const [tests, setTests] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchTests = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (statusFilter !== "all") params.status = statusFilter;
    if (search.trim()) params.search = search.trim();
    api
      .get("/api/v1/assessments", { params })
      .then((r) => setTests(r.data.data || []))
      .catch(() => setTests([]))
      .finally(() => setLoading(false));
  }, [statusFilter, search]);

  useEffect(() => {
    const t = setTimeout(fetchTests, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchTests, search]);

  async function handlePublish(id: string) {
    setActionLoading(id);
    try {
      await api.put(`/api/v1/assessments/${id}/publish`);
      fetchTests();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleUnpublish(id: string) {
    setActionLoading(id);
    try {
      await api.put(`/api/v1/assessments/${id}/unpublish`);
      fetchTests();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleArchive(id: string) {
    setActionLoading(id);
    try {
      await api.put(`/api/v1/assessments/${id}/archive`);
      fetchTests();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(id: string) {
    setActionLoading(id);
    try {
      await api.delete(`/api/v1/assessments/${id}`);
      setDeleteConfirm(null);
      fetchTests();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <DashboardPageShell maxWidth="full">
      <DashboardPageHeader
        breadcrumb="Company"
        title="Tests"
        description="Create and manage assessments. Share the test link with candidates for the desktop exam client."
      >
        <Link
          href="/dashboard/tests/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-mono text-xs tracking-wider hover:opacity-90 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" /> New Test
        </Link>
      </DashboardPageHeader>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tests…"
            className={`${inputCls} pl-9`}
          />
        </div>
        <div className="flex gap-0">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 font-mono text-[10px] tracking-wider border transition-colors ${
                statusFilter === s
                  ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white"
                  : "bg-transparent text-gray-500 border-gray-300 dark:border-neutral-700 hover:border-gray-500"
              }`}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${panelSurface} p-5 animate-pulse`}>
              <div className="h-4 w-48 bg-black/5 dark:bg-white/5 mb-3 rounded" />
              <div className="h-3 w-32 bg-black/5 dark:bg-white/5 rounded" />
            </div>
          ))}
        </div>
      ) : tests.length === 0 ? (
        <div className={`${panelSurface} p-12 text-center`}>
          <FileText className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <h3 className="font-mono text-sm font-bold text-black dark:text-white mb-1">No tests yet</h3>
          <p className="font-mono text-xs text-gray-400 mb-4">
            {search || statusFilter !== "all"
              ? "No tests match your filters."
              : "Create your first assessment and share the test link with candidates."}
          </p>
          <Link
            href="/dashboard/tests/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-mono text-xs tracking-wider"
          >
            <Plus className="w-3 h-3" /> Create Test
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {tests.map((test) => (
            <div key={test.id} className={`${panelSurface} p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-black dark:text-white truncate">{test.title}</h3>
                    <span className={`border px-2 py-0.5 font-mono text-[9px] uppercase shrink-0 ${statusColor(test.status)}`}>
                      {test.status}
                    </span>
                  </div>
                  {test.description && (
                    <p className="font-mono text-[10px] text-gray-400 mb-2 line-clamp-2">{test.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] text-gray-400">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {test.duration} min
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3 h-3" /> {test._count.attempts} attempts
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Send className="w-3 h-3" /> {test._count.invites} invites
                    </span>
                    <span className={test._count.questions === 0 ? "text-amber-600 dark:text-amber-400" : ""}>
                      {test._count.questions} question{test._count.questions === 1 ? "" : "s"}
                      {test._count.questions === 0 ? " (add questions)" : ""}
                    </span>
                    <span>Pass: {test.passingScore}%</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Link
                    href={`/dashboard/tests/${test.id}/candidates`}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 font-mono text-[10px] tracking-wider ${panelBorder} text-gray-600 dark:text-gray-300 hover:border-black dark:hover:border-white transition-colors`}
                  >
                    <BarChart2 className="w-3 h-3" />
                    Candidates
                    {test._count.attempts > 0 && (
                      <span className="ml-0.5 font-mono text-[8px] bg-black dark:bg-white text-white dark:text-black px-1">
                        {test._count.attempts}
                      </span>
                    )}
                  </Link>
                  <Link
                    href={`/dashboard/tests/${test.id}`}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 font-mono text-[10px] tracking-wider ${panelBorder} text-gray-600 dark:text-gray-300 hover:border-black dark:hover:border-white transition-colors`}
                  >
                    <Settings2 className="w-3 h-3" />
                    Edit
                  </Link>
                  {test.status === "draft" && (
                    <button
                      onClick={() => handlePublish(test.id)}
                      disabled={actionLoading === test.id}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 font-mono text-[10px] tracking-wider bg-black dark:bg-white text-white dark:text-black hover:opacity-90 disabled:opacity-50 transition-opacity`}
                    >
                      <Globe className="w-3 h-3" />
                      {actionLoading === test.id ? "…" : "Publish"}
                    </button>
                  )}
                  {test.status === "published" && (
                    <button
                      onClick={() => handleUnpublish(test.id)}
                      disabled={actionLoading === test.id}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 font-mono text-[10px] tracking-wider ${panelBorder} text-gray-600 dark:text-gray-300 hover:border-black dark:hover:border-white transition-colors disabled:opacity-50`}
                    >
                      <GlobeLock className="w-3 h-3" />
                      {actionLoading === test.id ? "…" : "Unpublish"}
                    </button>
                  )}
                  {test.status !== "archived" && (
                    <button
                      onClick={() => handleArchive(test.id)}
                      disabled={actionLoading === test.id}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 font-mono text-[10px] tracking-wider ${panelBorder} text-gray-500 hover:border-black dark:hover:border-white transition-colors disabled:opacity-50`}
                    >
                      <Archive className="w-3 h-3" />
                      Archive
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteConfirm(test.id)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 font-mono text-[10px] tracking-wider ${panelBorder} text-gray-400 hover:text-red-500 hover:border-red-400 transition-colors`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <TestLinkCopy testCode={test.testCode} />
            </div>
          ))}
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60">
          <div className={`${panelSurface} p-6 w-full max-w-sm mx-4 bg-white dark:bg-black shadow-2xl`}>
            <h3 className="font-mono text-xs font-bold text-black dark:text-white uppercase mb-2">Delete Test?</h3>
            <p className="font-mono text-xs text-gray-500 mb-5">
              This will permanently delete the assessment and all associated data.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className={`px-4 py-2 font-mono text-xs ${panelBorder} text-gray-500 hover:border-black dark:hover:border-white transition-colors`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={actionLoading === deleteConfirm}
                className="px-4 py-2 font-mono text-xs bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading === deleteConfirm ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardPageShell>
  );
}
