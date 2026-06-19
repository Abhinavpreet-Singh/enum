"use client";
import { getMemoryToken } from "@/lib/tokenStore";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { proxy } from "@/app/proxy";
import { CheckCircle2, XCircle, MinusCircle, Zap, Loader2 } from "lucide-react";
import type { ActivityLogEntry } from "@/types/activity";
import {
  DashboardPageHeader,
  DashboardPageShell,
} from "@/components/dashboard/dashboard-page-shell";

const TYPE_LABEL: Record<string, string> = {
  dsa: "DSA Arena",
  simulation: "Production simulation",
  system_design: "System design",
  incident: "Incident",
  browser: "Browser simulation",
};

const OUTCOME_LABEL: Record<string, string> = {
  correct: "Correct",
  partial: "Partial",
  incorrect: "Incorrect",
};

function outcomeIcon(outcome: string) {
  if (outcome === "correct")
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />;
  if (outcome === "partial")
    return <MinusCircle className="h-4 w-4 shrink-0 text-amber-500" />;
  return <XCircle className="h-4 w-4 shrink-0 text-red-400" />;
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PAGE_SIZE = 50;

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (skip: number, append: boolean) => {
    const token = getMemoryToken();
    if (!token) {
      setError("Log in to view your activity history.");
      setLoading(false);
      return;
    }

    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const res = await axios.get(
        `${proxy}/api/v1/users/activity?limit=${PAGE_SIZE}&skip=${skip}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const payload = res.data?.data;
      const batch: ActivityLogEntry[] = payload?.logs ?? payload ?? [];
      const count = payload?.total ?? batch.length;
      setTotal(count);
      setLogs((prev) => (append ? [...prev, ...batch] : batch));
      setError(null);
    } catch {
      setError("Could not load activity history.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(0, false);
    const refresh = () => fetchPage(0, false);
    window.addEventListener("userXpUpdated", refresh);
    return () => window.removeEventListener("userXpUpdated", refresh);
  }, [fetchPage]);

  const hasMore = logs.length < total;

  return (
    <DashboardPageShell maxWidth="6xl">
      <DashboardPageHeader
        breadcrumb="Dashboard / Activity"
        title="Activity"
        description="Every submission on Enum — correct, partial, or incorrect — with XP earned when applicable."
      >
        {!loading && (
          <p className="font-mono text-xs text-gray-500">
            {total} total {total === 1 ? "entry" : "entries"}
          </p>
        )}
      </DashboardPageHeader>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {error && !loading && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-mono text-sm text-red-800 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </p>
      )}

      {!loading && !error && logs.length === 0 && (
        <p className="font-mono text-sm text-gray-500">
          No activity yet. Solve a DSA problem, run a simulation, or complete an
          incident to see your history here.
        </p>
      )}

      <ul className="space-y-2">
        {logs.map((log) => (
          <li
            key={log.id}
            className="flex gap-3 rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 dark:border-white/10 dark:bg-[rgba(255,255,255,0.03)]"
          >
            <div className="pt-0.5">{outcomeIcon(log.outcome)}</div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-mono text-sm font-medium text-black dark:text-white">
                  {log.resourceTitle || "Untitled"}
                </p>
                {log.xpEarned > 0 && (
                  <span className="flex shrink-0 items-center gap-1 font-mono text-xs font-semibold text-amber-600 dark:text-amber-400">
                    <Zap className="h-3 w-3" />+{log.xpEarned} XP
                  </span>
                )}
              </div>
              <p className="mt-0.5 font-mono text-[11px] text-gray-500">
                {TYPE_LABEL[log.activityType] ?? log.activityType}
                <span className="mx-1.5">·</span>
                {OUTCOME_LABEL[log.outcome] ?? log.outcome}
                {log.score != null && log.maxScore != null && (
                  <>
                    <span className="mx-1.5">·</span>
                    {log.score}/{log.maxScore}
                  </>
                )}
              </p>
              {log.detail && (
                <p className="mt-1 font-mono text-xs text-gray-600 dark:text-gray-400">
                  {log.detail}
                </p>
              )}
              <p className="mt-1 font-mono text-[10px] text-gray-400">
                {formatWhen(log.createdAt)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {hasMore && !loading && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => fetchPage(logs.length, true)}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-mono text-xs font-medium text-black hover:border-black disabled:opacity-50 dark:border-white/15 dark:bg-black dark:text-white dark:hover:border-white"
          >
            {loadingMore
              ? "Loading…"
              : `Load more (${logs.length} of ${total})`}
          </button>
        </div>
      )}
    </DashboardPageShell>
  );
}
