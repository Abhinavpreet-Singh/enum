"use client";

import { API_BASE_URL } from "@/lib/api-config";
import api from "@/lib/api";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Search,
  ChevronRight,
  TrendingUp,
  Activity,
  ArrowLeft,
} from "lucide-react";

const panelBorder = "border border-black/20 dark:border-white/25";
const panelSurface = `${panelBorder} bg-white/80 backdrop-blur-[2px] dark:bg-black/75`;

export interface AttemptRow {
  id: string;
  email: string;
  rollNumber: string | null;
  status: string;
  startedAt: string;
  submittedAt: string | null;
  totalScore: number;
  maxScore: number;
  suspicionLevel: "low" | "medium" | "high";
  violationCount: number;
  highViolations: number;
  passed: boolean;
  durationSeconds: number | null;
}

export interface CandidatesStats {
  total: number;
  submitted: number;
  inProgress: number;
  passed: number;
  failed: number;
  highRisk: number;
  averageScore: number;
}

interface Assessment {
  id: string;
  title: string;
  passingScore: number;
  duration: number;
  status: string;
}

function fmtDuration(s: number | null) {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec}s`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

const statusChip = (s: string) => {
  const map: Record<string, string> = {
    submitted: "text-emerald-600 dark:text-emerald-400 border-emerald-400/40",
    auto_submitted: "text-blue-600 dark:text-blue-400 border-blue-400/40",
    in_progress: "text-amber-600 dark:text-amber-400 border-amber-400/40",
    flagged: "text-red-600 dark:text-red-400 border-red-400/40",
  };
  return map[s] ?? "text-gray-500 border-gray-400/40";
};

const riskChip = (l: string) => {
  if (l === "high") return "text-red-600 dark:text-red-400 border-red-400/40";
  if (l === "medium") return "text-amber-600 dark:text-amber-400 border-amber-400/40";
  return "text-emerald-600 dark:text-emerald-400 border-emerald-400/40";
};

interface Props {
  assessmentId: string;
  /** Base path for "View" links, e.g. "/dashboard/candidates/abc" or "/dashboard/tests/abc/candidates" */
  detailBasePath: string;
  /** Where the back arrow points */
  backHref: string;
  backLabel?: string;
}

export function CandidatesListView({ assessmentId, detailBasePath, backHref, backLabel = "Back" }: Props) {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [stats, setStats] = useState<CandidatesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(
        `/api/v1/organization-dashboard/assessments/${assessmentId}/attempts`,
        { withCredentials: true },
      );
      setAssessment(data.data.assessment);
      setAttempts(data.data.attempts);
      setStats(data.data.stats);
    } catch {
      setError("Failed to load candidates.");
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => { load(); }, [load]);

  const filtered = attempts.filter((a) => {
    const matchSearch =
      !search ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      (a.rollNumber && a.rollNumber.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    const matchRisk = riskFilter === "all" || a.suspicionLevel === riskFilter;
    return matchSearch && matchStatus && matchRisk;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="font-mono text-xs text-gray-400 animate-pulse">Loading candidates…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="font-mono text-xs text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Nav */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 font-mono text-[10px] text-gray-500 hover:text-black dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3 h-3" /> {backLabel}
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-lg font-bold text-black dark:text-white tracking-tight">
          {assessment?.title}
        </h1>
        <p className="font-mono text-[10px] text-gray-400 mt-0.5">
          Candidate submissions &amp; proctoring data
        </p>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          {[
            { label: "Total", value: stats.total, Icon: Users, color: "" },
            { label: "Submitted", value: stats.submitted, Icon: CheckCircle2, color: "text-emerald-500" },
            { label: "In Progress", value: stats.inProgress, Icon: Activity, color: "text-amber-500" },
            { label: "Passed", value: stats.passed, Icon: TrendingUp, color: "text-emerald-500" },
            { label: "Failed", value: stats.failed, Icon: XCircle, color: "text-red-500" },
            { label: "High Risk", value: stats.highRisk, Icon: ShieldAlert, color: "text-red-500" },
            { label: "Avg Score", value: `${stats.averageScore}%`, Icon: Clock, color: "" },
          ].map(({ label, value, Icon, color }) => (
            <div key={label} className={`${panelSurface} p-3`}>
              <div className={`mb-1 ${color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="font-mono text-lg font-bold text-black dark:text-white leading-none">
                {value}
              </div>
              <div className="font-mono text-[9px] text-gray-400 uppercase mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or roll no…"
            className="w-full pl-7 pr-3 py-1.5 border border-gray-300 dark:border-neutral-700 bg-white dark:bg-black font-mono text-xs text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 dark:border-neutral-700 bg-white dark:bg-black font-mono text-xs text-black dark:text-white px-2 py-1.5 outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="auto_submitted">Auto-submitted</option>
          <option value="in_progress">In Progress</option>
          <option value="flagged">Flagged</option>
        </select>
        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          className="border border-gray-300 dark:border-neutral-700 bg-white dark:bg-black font-mono text-xs text-black dark:text-white px-2 py-1.5 outline-none"
        >
          <option value="all">All Risk Levels</option>
          <option value="low">Low Risk</option>
          <option value="medium">Medium Risk</option>
          <option value="high">High Risk</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className={`${panelSurface} p-12 text-center`}>
          <Users className="w-6 h-6 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="font-mono text-xs text-gray-400">
            {attempts.length === 0
              ? "No candidates have taken this test yet."
              : "No candidates match your filters."}
          </p>
        </div>
      ) : (
        <div className={panelSurface}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-black/10 dark:border-white/10">
                  {["Candidate", "Status", "Score", "Duration", "Violations", "Risk", ""].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left font-mono text-[9px] uppercase text-gray-400 tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => (
                  <tr
                    key={a.id}
                    className={`border-b border-black/5 dark:border-white/5 hover:bg-black/2 dark:hover:bg-white/2 transition-colors cursor-pointer ${
                      i === filtered.length - 1 ? "border-b-0" : ""
                    }`}
                    onClick={() => window.location.href = `${detailBasePath}/${a.id}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-black dark:text-white">{a.email}</div>
                      {a.rollNumber && (
                        <div className="font-mono text-[9px] text-gray-400">{a.rollNumber}</div>
                      )}
                      <div className="font-mono text-[9px] text-gray-400">{fmtDate(a.startedAt)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`border px-2 py-0.5 font-mono text-[9px] uppercase whitespace-nowrap ${statusChip(a.status)}`}>
                        {a.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {a.maxScore > 0 ? (
                        <div>
                          <span className="font-mono text-xs text-black dark:text-white font-bold">
                            {a.totalScore}/{a.maxScore}
                          </span>
                          <span className="font-mono text-[9px] text-gray-400 ml-1">
                            ({Math.round((a.totalScore / a.maxScore) * 100)}%)
                          </span>
                          <div>
                            <span className={`font-mono text-[9px] ${a.passed ? "text-emerald-500" : "text-red-500"}`}>
                              {a.passed ? "Passed" : "Failed"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="font-mono text-[9px] text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] text-gray-500">
                      {fmtDuration(a.durationSeconds)}
                    </td>
                    <td className="px-4 py-3">
                      {a.violationCount > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                          <span className="font-mono text-[10px] text-black dark:text-white">{a.violationCount}</span>
                          {a.highViolations > 0 && (
                            <span className="font-mono text-[9px] text-red-500">({a.highViolations} high)</span>
                          )}
                        </div>
                      ) : (
                        <span className="font-mono text-[9px] text-gray-400">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`border px-2 py-0.5 font-mono text-[9px] uppercase ${riskChip(a.suspicionLevel)}`}>
                        {a.suspicionLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`${detailBasePath}/${a.id}`}
                        className="inline-flex items-center gap-1 font-mono text-[10px] text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                      >
                        View <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-black/5 dark:border-white/5">
            <p className="font-mono text-[9px] text-gray-400">
              {filtered.length} of {attempts.length} candidate{attempts.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
