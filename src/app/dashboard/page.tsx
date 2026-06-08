"use client";

import DashboardContent from "@/components/dashboard/dashboard-content";
import CompanyDashboardContent from "@/components/dashboard/company/company-dashboard-content";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import useAccountType from "@/hooks/useAccountType";

export default function DashboardPage() {
  const accountType = useAccountType();

  if (accountType === "company") {
    return (
      <DashboardPageShell maxWidth="full">
        <CompanyDashboardContent />
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell maxWidth="full">
      <DashboardContent />
    </DashboardPageShell>
  );
}
