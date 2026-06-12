"use client";

import AdminPageShell from "@/components/admin/admin-page-shell";
import { OverviewTab } from "@/components/admin/admin-sections";

export default function AdminOverviewPage() {
  return (
    <AdminPageShell
      title="Overview"
      description="Platform-wide metrics, recent signups, and pending company approvals."
    >
      <OverviewTab />
    </AdminPageShell>
  );
}
