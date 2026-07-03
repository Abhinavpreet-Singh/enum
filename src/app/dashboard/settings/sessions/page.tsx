"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DashboardPageShell, DashboardPageHeader } from "@/components/dashboard/dashboard-page-shell";
import SessionsPanel from "@/components/dashboard/settings/sessions-panel";

export default function SessionsPage() {
  return (
    <DashboardPageShell maxWidth="6xl">
      <DashboardPageHeader
        breadcrumb="Settings"
        title="Active sessions"
        description="Review and revoke devices signed in to your account."
      />
      <Link
        href="/dashboard/settings/"
        className="mb-5 inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-gray-500 transition-colors hover:text-black dark:text-gray-400 dark:hover:text-white"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to settings
      </Link>
      <SessionsPanel />
    </DashboardPageShell>
  );
}
