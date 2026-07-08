"use client";
import { API_BASE_URL } from "@/lib/api-config";
import api from "@/lib/api";
import { getMemoryToken } from "@/lib/tokenStore";

import { useState, useEffect } from "react";
import { BarChart2, TrendingUp, Users, Activity, Target, Code, AlertTriangle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";

const panelBorder = "border border-black/20 dark:border-white/25";
const panelSurface = `${panelBorder} bg-white/80 dark:bg-black/75`;

const cfg = () => {
  const token = typeof window !== "undefined" ? getMemoryToken() : null;
  return { withCredentials: true as const, headers: token ? { Authorization: `Bearer ${token}` } : undefined };
};

const ACTIVITY_COLORS: Record<string, string> = {
  dsa: "#6366f1",
  simulation: "#0ea5e9",
  incident: "#f59e0b",
  system_design: "#10b981",
  browser: "#8b5cf6",
};

const ACTIVITY_LABELS: Record<string, string> = {
  dsa: "DSA",
  simulation: "Simulation",
  incident: "Incident",
  system_design: "System Design",
  browser: "Browser",
};

type DailyPoint = {
  date: string;
  dsa: number;
  simulation: number;
  incident: number;
  system_design: number;
  browser: number;
  total: number;
};

type AnalyticsData = {
  summary: {
    totalUsers: number;
    totalOrgs: number;
    totalAttempts: number;
    totalSessions: number;
    submissionCount: number;
    violationCount: number;
    totalXp: number;
    successRate: number;
    activityCount: number;
  };
  dailyData: DailyPoint[];
  byType: Record<string, number>;
};

function StatCard({ label, value, icon: Icon, sub }: { label: string; value: string | number; icon: typeof Users; sub?: string }) {
  return (
    <div className={`${panelSurface} p-4 flex items-center gap-4`}>
      <div className={`w-9 h-9 flex items-center justify-center border ${panelBorder} shrink-0`}>
        <Icon className="w-4 h-4 text-gray-400" />
      </div>
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400 truncate">{label}</p>
        <p className="font-mono text-xl font-bold text-black dark:text-white">{value}</p>
        {sub && <p className="font-mono text-[10px] text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

const RANGES = [
  { label: "7d", value: "7" },
  { label: "30d", value: "30" },
  { label: "90d", value: "90" },
];

export default function AnalyticsSection() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30");

  useEffect(() => {
    setLoading(true);
    api.get("/api/v1/admin/analytics", { ...cfg(), params: { range } })
      .then((r) => setData(r.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [range]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`${panelSurface} p-4 h-20 animate-pulse`} />
          ))}
        </div>
        <div className={`${panelSurface} h-56 animate-pulse`} />
      </div>
    );
  }

  if (!data) {
    return <p className="font-mono text-xs text-gray-400">Failed to load analytics.</p>;
  }

  const { summary, dailyData, byType } = data;

  // Slim daily data for chart display (show every Nth label to avoid clutter)
  const step = range === "90" ? 7 : range === "30" ? 3 : 1;
  const chartData = dailyData.map((d, i) => ({
    ...d,
    label: i % step === 0 ? d.date.slice(5) : "", // MM-DD
  }));

  const totalByType = Object.entries(byType).sort((a, b) => b[1] - a[1]);
  const maxByType = Math.max(...totalByType.map(([, v]) => v), 1);

  return (
    <div className="space-y-6">
      {/* Range selector */}
      <div className="flex items-center gap-1">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={`px-4 py-1.5 font-mono text-xs border transition-colors ${
              range === r.value
                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                : `${panelBorder} text-gray-400 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white`
            }`}
          >
            {r.label}
          </button>
        ))}
        <span className="ml-2 font-mono text-[10px] text-gray-400">time window</span>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Users" value={summary.totalUsers} icon={Users} />
        <StatCard label="Orgs" value={summary.totalOrgs} icon={BarChart2} />
        <StatCard label="Activities" value={summary.activityCount} icon={Activity} sub={`in last ${range} days`} />
        <StatCard label="Success Rate" value={`${summary.successRate}%`} icon={TrendingUp} sub="correct outcomes" />
        <StatCard label="XP Earned" value={summary.totalXp.toLocaleString()} icon={Target} sub={`in last ${range} days`} />
        <StatCard label="Code Submissions" value={summary.submissionCount} icon={Code} sub={`in last ${range} days`} />
        <StatCard label="Violations" value={summary.violationCount} icon={AlertTriangle} sub={`in last ${range} days`} />
        <StatCard label="Incident Sessions" value={summary.totalSessions} icon={Activity} sub={`in last ${range} days`} />
      </div>

      {/* Daily activity chart */}
      <div className={`${panelSurface} p-5`}>
        <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400 mb-4">
          Daily activity — last {range} days
        </p>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
              <XAxis dataKey="label" tick={{ fontFamily: "monospace", fontSize: 9 }} />
              <YAxis tick={{ fontFamily: "monospace", fontSize: 9 }} />
              <Tooltip
                contentStyle={{ fontFamily: "monospace", fontSize: 11, border: "1px solid rgba(0,0,0,0.2)", borderRadius: 0 }}
                labelStyle={{ fontFamily: "monospace", fontSize: 10 }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontFamily: "monospace", fontSize: 10 }} />
              {Object.keys(ACTIVITY_COLORS).map((k) => (
                <Line
                  key={k}
                  type="monotone"
                  dataKey={k}
                  name={ACTIVITY_LABELS[k]}
                  stroke={ACTIVITY_COLORS[k]}
                  strokeWidth={1.5}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Total activity chart */}
      <div className={`${panelSurface} p-5`}>
        <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400 mb-4">
          Total activity — last {range} days
        </p>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
              <XAxis dataKey="label" tick={{ fontFamily: "monospace", fontSize: 9 }} />
              <YAxis tick={{ fontFamily: "monospace", fontSize: 9 }} />
              <Tooltip
                contentStyle={{ fontFamily: "monospace", fontSize: 11, border: "1px solid rgba(0,0,0,0.2)", borderRadius: 0 }}
              />
              <Bar dataKey="total" fill="#111111" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdown by type */}
      <div className={`${panelSurface} p-5`}>
        <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400 mb-4">
          Engagement by content type — last {range} days
        </p>
        {totalByType.length === 0 ? (
          <p className="font-mono text-xs text-gray-400">No activity logged yet.</p>
        ) : (
          <div className="space-y-3">
            {totalByType.map(([t, count]) => (
              <div key={t} className="flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase text-gray-500 w-28 shrink-0">
                  {ACTIVITY_LABELS[t] ?? t}
                </span>
                <div className="flex-1 h-2 bg-black/5 dark:bg-white/5 overflow-hidden">
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${Math.round((count / maxByType) * 100)}%`,
                      backgroundColor: ACTIVITY_COLORS[t] ?? "#6b7280",
                    }}
                  />
                </div>
                <span className="font-mono text-[10px] font-bold text-black dark:text-white w-10 text-right">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
