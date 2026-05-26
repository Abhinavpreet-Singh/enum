"use client";

import { useEffect, useState } from "react";
import { Clock, Zap, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { proxy } from "@/app/proxy";
import type { IncidentSimulation } from "@/types/incident";
import {
  formatIncidentCode,
  getIncidentDisplayTitle,
} from "@/components/incidents/incident-display";
import {
  DashboardPageHeader,
  DashboardPageShell,
} from "@/components/dashboard/dashboard-page-shell";

interface IncidentListItem extends IncidentSimulation {
  status?: {
    attempted: boolean;
    completed: boolean;
    solved?: boolean;
    attempts?: number;
  };
}

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "border-emerald-300/60 text-emerald-800 dark:border-emerald-500/40 dark:text-emerald-300",
  medium: "border-amber-300/60 text-amber-800 dark:border-amber-500/40 dark:text-amber-300",
  hard: "border-red-300/60 text-red-800 dark:border-red-500/40 dark:text-red-300",
};

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "completed" | "attempted">(
    "all",
  );

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("accessToken");
        const response = await axios.get(`${proxy}/api/v1/incidents`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        setIncidents(response.data.data);
      } catch (err) {
        const message =
          axios.isAxiosError(err) && err.response?.data?.message
            ? err.response.data.message
            : "Failed to load incidents";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchIncidents();
    const refresh = () => fetchIncidents();
    window.addEventListener("focus", refresh);
    window.addEventListener("userXpUpdated", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("userXpUpdated", refresh);
    };
  }, []);

  const filteredIncidents = incidents.filter((incident) => {
    if (filter === "completed") return incident.status?.completed;
    if (filter === "attempted") return incident.status?.attempted;
    return true;
  });

  const tabClass = (active: boolean) =>
    `border-b-2 py-3 px-1 font-mono text-xs font-medium transition-colors ${
      active
        ? "border-black text-black dark:border-white dark:text-white"
        : "border-transparent text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
    }`;

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        breadcrumb="Dashboard / Incidents"
        title="Incident Simulations"
        description="Recreated production outages inspired by real-world incidents. Investigate logs, analyze metrics, and practice incident response."
      />

      <div className="-mx-4 mb-6 border-b border-gray-200 px-4 dark:border-white/10 sm:-mx-6 sm:px-6">
        <div className="flex gap-6">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={tabClass(filter === "all")}
          >
            All ({incidents.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("attempted")}
            className={tabClass(filter === "attempted")}
          >
            Attempted ({incidents.filter((i) => i.status?.attempted).length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("completed")}
            className={tabClass(filter === "completed")}
          >
            Completed ({incidents.filter((i) => i.status?.completed).length})
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-black dark:text-white" />
        </div>
      ) : error ? (
        <div className="flex h-96 items-center justify-center rounded-xl border border-gray-200 dark:border-white/10">
          <div className="text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500 dark:text-red-400" />
            <p className="mb-2 font-mono text-lg font-semibold text-black dark:text-white">
              Error loading incidents
            </p>
            <p className="font-mono text-sm text-gray-600 dark:text-gray-400">
              {error}
            </p>
          </div>
        </div>
      ) : filteredIncidents.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredIncidents.map((incident, index) => (
            <Link
              key={incident.id}
              href={`/dashboard/incidents/${incident.id}`}
              className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition-all hover:border-black hover:shadow-md dark:border-white/10 dark:bg-black dark:hover:border-white dark:hover:shadow-[0_0_24px_-8px_rgba(255,255,255,0.12)]"
            >
              {incident.status?.attempted && (
                <div
                  className={`flex items-center justify-between border-b px-4 py-2 ${
                    incident.status?.solved
                      ? "border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-500/30 dark:bg-emerald-950/25"
                      : "border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/[0.04]"
                  }`}
                >
                  <p
                    className={`flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${
                      incident.status?.solved
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {incident.status?.solved && (
                      <CheckCircle2 className="h-3 w-3" />
                    )}
                    {incident.status?.solved
                      ? "XP earned"
                      : incident.status?.completed
                        ? "Submitted"
                        : "In progress"}
                  </p>
                  {(incident.status?.attempts ?? 0) > 0 && (
                    <span className="font-mono text-[10px] text-gray-500 dark:text-gray-400">
                      {incident.status.attempts}{" "}
                      {incident.status.attempts === 1 ? "attempt" : "attempts"}
                    </span>
                  )}
                </div>
              )}

              <div className="p-5">
                <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-gray-400">
                  {formatIncidentCode(index)}
                </p>
                <div className="mb-3 flex items-start justify-between gap-2">
                  <h3 className="font-mono text-sm font-semibold text-black transition-colors group-hover:text-black dark:text-white dark:group-hover:text-white">
                    {getIncidentDisplayTitle(incident)}
                  </h3>
                  <span
                    className={`shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] font-medium ${DIFFICULTY_STYLES[incident.difficulty] || DIFFICULTY_STYLES.medium}`}
                  >
                    {incident.difficulty.charAt(0).toUpperCase() +
                      incident.difficulty.slice(1)}
                  </span>
                </div>

                <p className="mb-4 line-clamp-2 font-mono text-xs text-gray-600 dark:text-gray-400">
                  {incident.description}
                </p>

                <div className="mb-4 flex items-center gap-4 font-mono text-[11px] text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {incident.estimatedTime} min
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap className="h-3.5 w-3.5" />
                    +{incident.xpReward} XP
                  </span>
                </div>

                {incident.tags && incident.tags.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {incident.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded border border-gray-200 px-1.5 py-0.5 font-mono text-[9px] text-gray-600 dark:border-white/10 dark:text-gray-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="border-t border-gray-100 pt-3 dark:border-white/8">
                  <p className="font-mono text-[11px] font-medium text-black dark:text-white">
                    {incident.status?.completed
                      ? "View again →"
                      : incident.status?.attempted
                        ? "Continue →"
                        : "Start incident →"}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex h-96 items-center justify-center rounded-xl border border-gray-200 dark:border-white/10">
          <div className="text-center">
            <p className="mb-2 font-mono text-lg font-semibold text-black dark:text-white">
              No incidents found
            </p>
            <p className="font-mono text-sm text-gray-600 dark:text-gray-400">
              {filter === "completed"
                ? "You haven't completed any incidents yet."
                : filter === "attempted"
                  ? "You haven't started any incidents yet."
                  : "No incidents available."}
            </p>
          </div>
        </div>
      )}
    </DashboardPageShell>
  );
}
