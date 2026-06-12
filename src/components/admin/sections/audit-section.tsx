"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { proxy } from "@/app/proxy";
import { History, Filter } from "lucide-react";

const panelBorder = "border border-black/20 dark:border-white/25";
const panelSurface = `${panelBorder} bg-white/80 dark:bg-black/75`;

const cfg = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  return { withCredentials: true as const, headers: token ? { Authorization: `Bearer ${token}` } : undefined };
};

const ACTION_COLORS: Record<string, string> = {
  "user.delete": "text-red-600 dark:text-red-400",
  "user.suspend": "text-amber-600 dark:text-amber-400",
  "user.unsuspend": "text-emerald-600 dark:text-emerald-400",
  "org.approve": "text-emerald-600 dark:text-emerald-400",
  "org.reject": "text-red-600 dark:text-red-400",
  "setting.update": "text-sky-600 dark:text-sky-400",
  "announcement.create": "text-purple-600 dark:text-purple-400",
  "announcement.delete": "text-red-600 dark:text-red-400",
  "maintenance.create": "text-amber-600 dark:text-amber-400",
};

const TARGET_TYPE_OPTIONS = ["all", "user", "organization", "setting", "maintenance", "announcement"];

type AuditLog = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  targetName: string;
  detail: string;
  adminEmail: string;
  createdAt: string;
};

export default function AuditSection() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [targetType, setTargetType] = useState("all");

  const fetch = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: "20" };
    if (targetType !== "all") params.targetType = targetType;

    axios.get(`${proxy}/api/v1/admin/audit`, { ...cfg(), params })
      .then((r) => {
        setLogs(r.data.data);
        setTotal(r.data.total);
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [page, targetType]);

  useEffect(() => { fetch(); }, [fetch]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className={`flex items-center gap-2 px-3 py-1.5 ${panelBorder}`}>
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <select
            value={targetType}
            onChange={(e) => { setTargetType(e.target.value); setPage(1); }}
            className="bg-transparent font-mono text-xs text-black dark:text-white outline-none"
          >
            {TARGET_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t === "all" ? "All types" : t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
        <span className="font-mono text-[10px] text-gray-400">{total} entries</span>
      </div>

      {/* Log table */}
      <div className={`${panelSurface} overflow-hidden`}>
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 border-b border-black/5 dark:border-white/5 animate-pulse" />
          ))
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <History className="w-8 h-8 text-gray-200 dark:text-gray-800 mx-auto mb-2" />
            <p className="font-mono text-xs text-gray-400">No audit logs yet. Actions you take will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {logs.map((log) => (
              <div key={log.id} className="px-4 py-3 flex items-start gap-4 hover:bg-black/1 dark:hover:bg-white/1 transition-colors">
                <div className="shrink-0 mt-0.5">
                  <span className={`font-mono text-[10px] font-bold ${ACTION_COLORS[log.action] ?? "text-gray-600 dark:text-gray-400"}`}>
                    {log.action}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    {log.targetName && (
                      <span className="font-mono text-xs text-black dark:text-white font-semibold truncate">
                        {log.targetName}
                      </span>
                    )}
                    {log.targetType && (
                      <span className="font-mono text-[9px] uppercase tracking-wider text-gray-400 border border-black/10 dark:border-white/10 px-1.5 py-0.5">
                        {log.targetType}
                      </span>
                    )}
                  </div>
                  {log.detail && (
                    <p className="font-mono text-[10px] text-gray-500 mt-0.5 truncate">{log.detail}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-[9px] text-gray-400">{new Date(log.createdAt).toLocaleString()}</p>
                  {log.adminEmail && (
                    <p className="font-mono text-[9px] text-gray-400 mt-0.5">{log.adminEmail}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-end">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
            className={`px-3 py-1 font-mono text-[10px] ${panelBorder} text-gray-500 hover:border-black dark:hover:border-white disabled:opacity-40 transition-colors`}>
            ← Prev
          </button>
          <span className="font-mono text-[10px] text-gray-400">{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
            className={`px-3 py-1 font-mono text-[10px] ${panelBorder} text-gray-500 hover:border-black dark:hover:border-white disabled:opacity-40 transition-colors`}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
