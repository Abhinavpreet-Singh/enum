import {
  DashboardPageHeader,
  DashboardPageShell,
} from "@/components/dashboard/dashboard-page-shell";

export default function SettingsPage() {
  return (
    <DashboardPageShell>
      <DashboardPageHeader
        breadcrumb="Dashboard / Settings"
        title="Settings"
        description="Account and application preferences"
      />
      <p className="text-gray-600 dark:text-gray-400">Coming soon...</p>
    </DashboardPageShell>
  );
}
