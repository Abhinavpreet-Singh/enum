"use client";

import { DashboardPageShell, DashboardPageHeader } from "@/components/dashboard/dashboard-page-shell";
import { Users, Send, Search, Download } from "lucide-react";

const panelBorder = "border border-black/20 dark:border-white/25";
const panelSurface = `${panelBorder} bg-white/80 backdrop-blur-[2px] dark:bg-black/75`;

export default function CandidatesPage() {
  return (
    <DashboardPageShell maxWidth="full">
      <DashboardPageHeader
        breadcrumb="Company"
        title="Candidates"
        description="Manage and track candidate performance across assessments."
      />
      <div className={`${panelSurface} p-12 text-center`}>
        <Users className="w-14 h-14 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
        <h3 className="font-mono text-sm font-bold text-black dark:text-white mb-2">
          Candidate Management
        </h3>
        <p className="font-mono text-xs text-gray-400 mb-6 max-w-md mx-auto">
          Track candidate attempts, view scores, monitor suspicious activity, and manage invitations — all in one place.
        </p>
        <div className="flex items-center justify-center gap-3">
          <div className={`${panelSurface} p-4 flex flex-col items-center gap-2 w-32`}>
            <Send className="w-5 h-5 text-gray-400" />
            <span className="font-mono text-[9px] tracking-wider text-gray-500 uppercase">Invite</span>
          </div>
          <div className={`${panelSurface} p-4 flex flex-col items-center gap-2 w-32`}>
            <Search className="w-5 h-5 text-gray-400" />
            <span className="font-mono text-[9px] tracking-wider text-gray-500 uppercase">Search</span>
          </div>
          <div className={`${panelSurface} p-4 flex flex-col items-center gap-2 w-32`}>
            <Download className="w-5 h-5 text-gray-400" />
            <span className="font-mono text-[9px] tracking-wider text-gray-500 uppercase">Export</span>
          </div>
        </div>
        <p className="font-mono text-[10px] text-gray-300 dark:text-gray-600 mt-6">
          Full candidate management is coming in Phase 4.
        </p>
      </div>
    </DashboardPageShell>
  );
}
