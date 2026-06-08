"use client";

import DashboardContent from "@/components/dashboard/dashboard-content";
import OrganizationDashboardContent from "@/components/dashboard/organization/organization-dashboard-content";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import useAccountType from "@/hooks/useAccountType";

export default function DashboardPage() {
  const accountType = useAccountType();

  if (accountType === "organization") {
    return (
      <DashboardPageShell maxWidth="full">
        <OrganizationDashboardContent />
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell maxWidth="full">
      <DashboardContent />
    </DashboardPageShell>
  );
}
