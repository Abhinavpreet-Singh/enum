"use client";

import { ShieldCheck } from "lucide-react";
import {
  DashboardPageHeader,
  DashboardPageShell,
} from "@/components/dashboard/dashboard-page-shell";

export default function AdminPageShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <DashboardPageShell maxWidth="full">
      <DashboardPageHeader
        breadcrumb={
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-amber-600 dark:text-amber-400">
            <ShieldCheck className="w-3 h-3" /> Admin Panel
          </span>
        }
        title={title}
        description={description}
      />
      {children}
    </DashboardPageShell>
  );
}
