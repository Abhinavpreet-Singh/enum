"use client";

import { useEffect, useState } from "react";
import { Clock, Zap, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { proxy } from "@/app/proxy";
import type { IncidentSimulation } from "@/types/incident";

interface IncidentListItem extends IncidentSimulation {
  status?: {
    attempted: boolean;
    completed: boolean;
  };
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  hard: "bg-red-100 text-red-800",
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
  }, []);

  const filteredIncidents = incidents.filter((incident) => {
    if (filter === "completed") return incident.status?.completed;
    if (filter === "attempted") return incident.status?.attempted;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Historical Incident Simulations
          </h1>
          <p className="text-gray-600 max-w-2xl">
            Experience recreated production incidents inspired by real-world outages.
            Investigate logs, analyze metrics, and resolve critical issues to advance your
            debugging skills.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 flex gap-6">
          <button
            onClick={() => setFilter("all")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              filter === "all"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            All Incidents ({incidents.length})
          </button>
          <button
            onClick={() => setFilter("attempted")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              filter === "attempted"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Attempted (
            {incidents.filter((i) => i.status?.attempted).length})
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              filter === "completed"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Completed (
            {incidents.filter((i) => i.status?.completed).length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-96 bg-white rounded-lg border border-gray-200">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-900 mb-2">
                Error Loading Incidents
              </p>
              <p className="text-gray-600">{error}</p>
            </div>
          </div>
        ) : filteredIncidents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIncidents.map((incident) => (
              <Link
                key={incident.id}
                href={`/dashboard/incidents/${incident.id}`}
                className="group bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all overflow-hidden"
              >
                {/* Status Badge */}
                {incident.status?.completed && (
                  <div className="bg-green-50 border-b border-green-200 px-4 py-2">
                    <p className="text-xs font-semibold text-green-700">
                      ✓ Completed
                    </p>
                  </div>
                )}
                {incident.status?.attempted && !incident.status?.completed && (
                  <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
                    <p className="text-xs font-semibold text-blue-700">
                      ⚡ In Progress
                    </p>
                  </div>
                )}

                {/* Content */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {incident.title}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${DIFFICULTY_COLORS[incident.difficulty]}`}
                    >
                      {incident.difficulty.charAt(0).toUpperCase() +
                        incident.difficulty.slice(1)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {incident.description}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{incident.estimatedTime} min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <span>+{incident.xpReward} XP</span>
                    </div>
                  </div>

                  {/* Tags */}
                  {incident.tags && incident.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {incident.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* CTA */}
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-sm font-semibold text-blue-600 group-hover:text-blue-700">
                      {incident.status?.completed
                        ? "View Again →"
                        : incident.status?.attempted
                          ? "Continue →"
                          : "Start Incident →"}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-96 bg-white rounded-lg border border-gray-200">
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900 mb-2">
                No Incidents Found
              </p>
              <p className="text-gray-600">
                {filter === "completed"
                  ? "You haven't completed any incidents yet."
                  : filter === "attempted"
                    ? "You haven't started any incidents yet."
                    : "No incidents available."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
