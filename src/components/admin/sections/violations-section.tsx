"use client";
import { getMemoryToken } from "@/lib/tokenStore";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { proxy } from "@/app/proxy";
import {
  AlertTriangle, Shield, ShieldAlert, ShieldOff,
  Eye, Search, Filter,
} from "lucide-react";

const panelBorder = "border border-black/20 dark:border-white/25";
const panelSurface = `${panelBorder} bg-white/80 dark:bg-black/75`;

const cfg = () => {
  const token = typeof window !== "undefined" ? getMemoryToken() : null;
  return { withCredentials: true as const, headers: token ? { Authorization: `Bearer ${token}` } : undefined };
};

const SEVERITY_STYLES: Record<string, string> = {
  high: "text-red-600 dark:text-red-400 border-red-400/40 bg-red-50 dark:bg-red-950/20",
  medium: "text-amber-600 dark:text-amber-400 border-amber-400/40 bg-amber-50 dark:bg-amber-950/20",
  low: "text-gray-500 dark:text-gray-400 border-black/10 dark:border-white/10 bg-gray-50 dark:bg-gray-900/20",
};

const VIOLATION_TYPE_LABELS: Record<string, string> = {
  tab_switch: "Tab Switch",
  fullscreen_exit: "Fullscreen Exit",
  copy_paste: "Copy / Paste",
  multi_face: "Multi-Face",
  devtools: "DevTools",
  disconnect: "Disconnect",
};

function SeverityBadge({ severity }: { severity: string }) {
  const Icon = severity === "high" ? ShieldAlert : severity === "medium" ? ShieldOff : Shield;
  return (
    <span className={`inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.low}`}>
      <Icon className="w-2.5 h-2.5" /> {severity}
    </span>
  );
}

type Violation = {
  id: string;
  type: string;
  severity: string;
  description: string;
  timestamp: string;
  attemptId: string;
  candidateEmail: string;
  candidateName: string | null;
  assessmentTitle: string;
  testCode: string;
  suspicionLevel: string;
  attemptStatus: string;
};

type Summary = {
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
};

export default function ViolationsSection() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Summary>({ bySeverity: {}, byType: {} });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState("all");
  const [type, setType] = useState("all");
  const [detail, setDetail] = useState<Violation | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: "20" };
    if (severity !== "all") params.severity = severity;
    if (type !== "all") params.type = type;

    axios.get(`${proxy}/api/v1/admin/violations`, { ...cfg(), params })
      .then((r) => {
        setViolations(r.data.data.violations);
        setTotal(r.data.data.total);
        setSummary({ bySeverity: r.data.data.bySeverity, byType: r.data.data.byType });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, severity, type]);

  useEffect(() => { fetch(); }, [fetch]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Violations", value: total, icon: AlertTriangle },
          { label: "High Severity", value: summary.bySeverity.high ?? 0, icon: ShieldAlert, accent: "bg-red-50 dark:bg-red-950/20" },
          { label: "Medium Severity", value: summary.bySeverity.medium ?? 0, icon: ShieldOff, accent: "bg-amber-50 dark:bg-amber-950/20" },
          { label: "Low Severity", value: summary.bySeverity.low ?? 0, icon: Shield },
        ].map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className={`${panelSurface} p-4 flex items-center gap-3 ${accent ?? ""}`}>
            <Icon className="w-4 h-4 text-gray-400 shrink-0" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">{label}</p>
              <p className="font-mono text-2xl font-bold text-black dark:text-white">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Violation type breakdown */}
      {Object.keys(summary.byType).length > 0 && (
        <div className={`${panelSurface} p-4`}>
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400 mb-3">Violation types</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary.byType).sort((a, b) => b[1] - a[1]).map(([t, count]) => (
              <button
                key={t}
                onClick={() => { setType(type === t ? "all" : t); setPage(1); }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider border transition-colors ${
                  type === t
                    ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-black/15 dark:border-white/15 text-gray-600 dark:text-gray-400 hover:border-black dark:hover:border-white"
                }`}
              >
                {VIOLATION_TYPE_LABELS[t] ?? t}
                <span className="font-bold">{count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className={`flex items-center gap-2 px-3 py-1.5 ${panelBorder}`}>
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <select
            value={severity}
            onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
            className="bg-transparent font-mono text-xs text-black dark:text-white outline-none"
          >
            <option value="all">All severities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 ${panelBorder}`}>
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <select
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
            className="bg-transparent font-mono text-xs text-black dark:text-white outline-none"
          >
            <option value="all">All types</option>
            {Object.entries(VIOLATION_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <span className="font-mono text-[10px] text-gray-400">{total} total</span>
      </div>

      {/* Table */}
      <div className={`${panelSurface} overflow-hidden`}>
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 border-b border-black/5 dark:border-white/5 animate-pulse" />
          ))
        ) : violations.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="w-8 h-8 text-gray-200 dark:text-gray-800 mx-auto mb-2" />
            <p className="font-mono text-xs text-gray-400">No violations found.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10">
                {["Candidate", "Assessment", "Type", "Severity", "Time", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5 font-mono text-[9px] uppercase tracking-widest text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {violations.map((v) => (
                <tr key={v.id} className="border-b border-black/5 dark:border-white/5 last:border-b-0 hover:bg-black/1.5 dark:hover:bg-white/1.5">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-black dark:text-white">{v.candidateName || v.candidateEmail}</p>
                    {v.candidateName && <p className="font-mono text-[10px] text-gray-400">{v.candidateEmail}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-gray-600 dark:text-gray-400">{v.assessmentTitle}</p>
                    <p className="font-mono text-[10px] text-gray-400">{v.testCode}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-[10px] text-gray-500">
                      {VIOLATION_TYPE_LABELS[v.type] ?? v.type}
                    </span>
                  </td>
                  <td className="px-4 py-3"><SeverityBadge severity={v.severity} /></td>
                  <td className="px-4 py-3 font-mono text-[10px] text-gray-400">
                    {new Date(v.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setDetail(v)}
                      className="p-1 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-end">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
            className={`px-3 py-1 font-mono text-[10px] ${panelBorder} text-gray-500 hover:border-black dark:hover:border-white transition-colors disabled:opacity-40`}>
            ← Prev
          </button>
          <span className="font-mono text-[10px] text-gray-400">{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
            className={`px-3 py-1 font-mono text-[10px] ${panelBorder} text-gray-500 hover:border-black dark:hover:border-white transition-colors disabled:opacity-40`}>
            Next →
          </button>
        </div>
      )}

      {/* Detail drawer */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 dark:bg-black/60">
          <div className="w-full max-w-md h-full bg-white dark:bg-black border-l border-black/20 dark:border-white/25 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10">
              <div>
                <h2 className="font-mono text-xs font-bold uppercase text-black dark:text-white">Violation Detail</h2>
                <p className="font-mono text-[10px] text-gray-400 mt-0.5">{VIOLATION_TYPE_LABELS[detail.type] ?? detail.type}</p>
              </div>
              <button onClick={() => setDetail(null)} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                <Search className="w-4 h-4 text-gray-400 rotate-45" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className={`${panelSurface} divide-y divide-black/5 dark:divide-white/5`}>
                {[
                  ["Candidate", detail.candidateName || detail.candidateEmail],
                  ["Email", detail.candidateEmail],
                  ["Assessment", detail.assessmentTitle],
                  ["Test Code", detail.testCode],
                  ["Violation Type", VIOLATION_TYPE_LABELS[detail.type] ?? detail.type],
                  ["Severity", detail.severity],
                  ["Suspicion Level", detail.suspicionLevel],
                  ["Attempt Status", detail.attemptStatus],
                  ["Time", new Date(detail.timestamp).toLocaleString()],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between px-3 py-2 gap-4">
                    <span className="font-mono text-[10px] text-gray-400 uppercase tracking-wider shrink-0">{label}</span>
                    <span className="font-mono text-[10px] text-black dark:text-white text-right break-all">{value}</span>
                  </div>
                ))}
              </div>
              {detail.description && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400 mb-1">Description</p>
                  <div className={`${panelSurface} px-3 py-2`}>
                    <p className="font-mono text-xs text-gray-600 dark:text-gray-400">{detail.description}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-1 mt-2">
                <SeverityBadge severity={detail.severity} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
