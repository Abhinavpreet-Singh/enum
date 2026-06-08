"use client";

import { DashboardPageShell, DashboardPageHeader } from "@/components/dashboard/dashboard-page-shell";
import { BarChart3, TrendingUp, PieChart, Activity } from "lucide-react";

const panelBorder = "border border-black/20 dark:border-white/25";
const panelSurface = `${panelBorder} bg-white/80 backdrop-blur-[2px] dark:bg-black/75`;

export default function AnalyticsPage() {
  return (
    <DashboardPageShell maxWidth="full">
      <DashboardPageHeader
        breadcrumb="Company"
        title="Analytics"
        description="Deep insights into assessment performance and candidate metrics."
      />
      <div className={`${panelSurface} p-12 text-center`}>
        <BarChart3 className="w-14 h-14 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
        <h3 className="font-mono text-sm font-bold text-black dark:text-white mb-2">
          Analytics Dashboard
        </h3>
        <p className="font-mono text-xs text-gray-400 mb-6 max-w-md mx-auto">
          View score distributions, completion rates, difficulty analysis, candidate skill breakdowns, and time-based trends.
        </p>
        <div className="flex items-center justify-center gap-3">
          <div className={`${panelSurface} p-4 flex flex-col items-center gap-2 w-32`}>
            <TrendingUp className="w-5 h-5 text-gray-400" />
            <span className="font-mono text-[9px] tracking-wider text-gray-500 uppercase">Trends</span>
          </div>
          <div className={`${panelSurface} p-4 flex flex-col items-center gap-2 w-32`}>
            <PieChart className="w-5 h-5 text-gray-400" />
            <span className="font-mono text-[9px] tracking-wider text-gray-500 uppercase">Breakdown</span>
          </div>
          <div className={`${panelSurface} p-4 flex flex-col items-center gap-2 w-32`}>
            <Activity className="w-5 h-5 text-gray-400" />
            <span className="font-mono text-[9px] tracking-wider text-gray-500 uppercase">Live</span>
          </div>
        </div>
        <p className="font-mono text-[10px] text-gray-300 dark:text-gray-600 mt-6">
          Full analytics dashboard is coming in Phase 6.
        </p>
      </div>
    </DashboardPageShell>
  );
}
