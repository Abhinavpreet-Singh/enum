"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import { proxy } from "@/app/proxy";
import { DashboardPageShell, DashboardPageHeader } from "@/components/dashboard/dashboard-page-shell";
import {
  Plus,
  Search,
  FileText,
  Copy,
  Archive,
  Trash2,
  Eye,
  EyeOff,
  MoreVertical,
  Users,
  Clock,
} from "lucide-react";

interface Assessment {
  id: string;
  title: string;
  status: string;
  duration: number;
  testCode: string;
  createdAt: string;
  updatedAt: string;
  _count: { attempts: number; invites: number; questions: number };
  settings: Record<string, unknown> | null;
}

const panelBorder = "border border-black/20 dark:border-white/25";
const panelSurface = `${panelBorder} bg-white/80 backdrop-blur-[2px] dark:bg-black/75`;

export default function TestsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const fetchAssessments = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (statusFilter !== "all") params.status = statusFilter;
    if (search) params.search = search;

    axios
      .get(`${proxy}/api/v1/assessments`, { params })
      .then((res) => setAssessments(res.data.data || []))
      .catch(() => setAssessments([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAssessments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAssessments();
  };

  const handleAction = async (action: string, id: string) => {
    setActionMenu(null);
    try {
      if (action === "publish") await axios.put(`${proxy}/api/v1/assessments/${id}/publish`);
      if (action === "unpublish") await axios.put(`${proxy}/api/v1/assessments/${id}/unpublish`);
      if (action === "archive") await axios.put(`${proxy}/api/v1/assessments/${id}/archive`);
      if (action === "duplicate") await axios.post(`${proxy}/api/v1/assessments/${id}/duplicate`);
      if (action === "delete") {
        if (!confirm("Are you sure you want to delete this assessment?")) return;
        await axios.delete(`${proxy}/api/v1/assessments/${id}`);
      }
      fetchAssessments();
    } catch (err) {
      console.error("Action failed:", err);
    }
  };

  const statusColor = (s: string) => {
    if (s === "published") return "text-emerald-600 dark:text-emerald-400 border-emerald-400/40 bg-emerald-50 dark:bg-emerald-950/30";
    if (s === "draft") return "text-amber-600 dark:text-amber-400 border-amber-400/40 bg-amber-50 dark:bg-amber-950/30";
    return "text-gray-500 border-gray-300 bg-gray-50 dark:bg-gray-900/30";
  };

  const tabs = ["all", "draft", "published", "archived"];

  return (
    <DashboardPageShell maxWidth="full">
      <DashboardPageHeader
        breadcrumb="Company"
        title="Tests"
        description="Create, manage, and monitor your assessments."
      >
        <Link
          href="/dashboard/tests/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-mono text-xs tracking-wider hover:opacity-90 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Test
        </Link>
      </DashboardPageHeader>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 font-mono text-[10px] tracking-wider border transition-colors ${
                statusFilter === tab
                  ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white"
                  : "bg-transparent text-gray-500 border-gray-300 dark:border-neutral-700 hover:border-gray-500 dark:hover:border-neutral-400"
              }`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 ${panelBorder}`}>
            <Search className="w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tests..."
              className="bg-transparent font-mono text-xs outline-none w-40 text-black dark:text-white placeholder:text-gray-400"
            />
          </div>
        </form>
      </div>

      {/* Table */}
      {loading ? (
        <div className={`${panelSurface} p-8`}>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-5 flex-1 bg-black/5 dark:bg-white/5 animate-pulse" />
                <div className="h-5 w-16 bg-black/5 dark:bg-white/5 animate-pulse" />
                <div className="h-5 w-12 bg-black/5 dark:bg-white/5 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ) : assessments.length === 0 ? (
        <div className={`${panelSurface} p-12 text-center`}>
          <FileText className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <h3 className="font-mono text-sm font-bold text-black dark:text-white mb-1">No tests found</h3>
          <p className="font-mono text-xs text-gray-400 mb-4">
            {statusFilter !== "all" ? `No ${statusFilter} tests.` : "Create your first assessment to get started."}
          </p>
          <Link
            href="/dashboard/tests/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-mono text-xs tracking-wider"
          >
            <Plus className="w-3 h-3" /> Create Test
          </Link>
        </div>
      ) : (
        <div className={`${panelSurface} overflow-hidden`}>
          {/* Header */}
          <div className="grid grid-cols-[1fr_100px_80px_80px_80px_100px_40px] gap-4 px-4 py-3 border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
            <span className="font-mono text-[9px] tracking-[0.3em] text-gray-400 uppercase">Test Name</span>
            <span className="font-mono text-[9px] tracking-[0.3em] text-gray-400 uppercase">Status</span>
            <span className="font-mono text-[9px] tracking-[0.3em] text-gray-400 uppercase text-center">Duration</span>
            <span className="font-mono text-[9px] tracking-[0.3em] text-gray-400 uppercase text-center">Questions</span>
            <span className="font-mono text-[9px] tracking-[0.3em] text-gray-400 uppercase text-center">Candidates</span>
            <span className="font-mono text-[9px] tracking-[0.3em] text-gray-400 uppercase">Created</span>
            <span />
          </div>
          {/* Rows */}
          {assessments.map((a) => (
            <div
              key={a.id}
              className="grid grid-cols-[1fr_100px_80px_80px_80px_100px_40px] gap-4 px-4 py-3 border-b border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors items-center"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-black dark:text-white truncate">{a.title}</p>
                <p className="font-mono text-[10px] text-gray-400 mt-0.5">{a.testCode}</p>
              </div>
              <span className={`inline-flex border px-2 py-0.5 font-mono text-[9px] uppercase w-fit ${statusColor(a.status)}`}>
                {a.status}
              </span>
              <span className="font-mono text-xs text-gray-600 dark:text-gray-400 text-center flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" /> {a.duration}m
              </span>
              <span className="font-mono text-xs font-bold text-black dark:text-white text-center tabular-nums">
                {a._count.questions}
              </span>
              <span className="font-mono text-xs text-gray-600 dark:text-gray-400 text-center flex items-center justify-center gap-1">
                <Users className="w-3 h-3" /> {a._count.attempts}
              </span>
              <span className="font-mono text-[10px] text-gray-400">
                {new Date(a.createdAt).toLocaleDateString()}
              </span>
              <div className="relative">
                <button
                  onClick={() => setActionMenu(actionMenu === a.id ? null : a.id)}
                  className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors"
                >
                  <MoreVertical className="w-4 h-4 text-gray-400" />
                </button>
                {actionMenu === a.id && (
                  <div className={`absolute right-0 top-8 z-50 w-40 ${panelSurface} shadow-lg py-1`}>
                    {a.status === "draft" && (
                      <button onClick={() => handleAction("publish", a.id)} className="w-full text-left px-3 py-2 font-mono text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2">
                        <Eye className="w-3 h-3" /> Publish
                      </button>
                    )}
                    {a.status === "published" && (
                      <button onClick={() => handleAction("unpublish", a.id)} className="w-full text-left px-3 py-2 font-mono text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2">
                        <EyeOff className="w-3 h-3" /> Unpublish
                      </button>
                    )}
                    <button onClick={() => handleAction("duplicate", a.id)} className="w-full text-left px-3 py-2 font-mono text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2">
                      <Copy className="w-3 h-3" /> Duplicate
                    </button>
                    <button onClick={() => handleAction("archive", a.id)} className="w-full text-left px-3 py-2 font-mono text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2">
                      <Archive className="w-3 h-3" /> Archive
                    </button>
                    <button onClick={() => handleAction("delete", a.id)} className="w-full text-left px-3 py-2 font-mono text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2">
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardPageShell>
  );
}
