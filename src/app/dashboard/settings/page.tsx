"use client";

import { DashboardPageShell, DashboardPageHeader } from "@/components/dashboard/dashboard-page-shell";
import SettingsContent from "@/components/dashboard/settings/settings-content";
import { useAccountSession } from "@/hooks/useAccountType";

export default function SettingsPage() {
  const { accountType, verified } = useAccountSession();
  const isOrganization = verified && accountType === "organization";

  return (
    <DashboardPageShell maxWidth="full">
      <DashboardPageHeader
        breadcrumb={isOrganization ? "Company" : "Account"}
        title="Settings"
        description={
          isOrganization
            ? "Manage your company profile, notifications, security, and appearance."
            : "Manage your account, notifications, security, and appearance."
        }
      />
      <SettingsContent />
    </DashboardPageShell>
  );
}
