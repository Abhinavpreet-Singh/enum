import DashboardContent from "@/components/dashboard/dashboard-content";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";

export default function DashboardPage() {
  return (
    <DashboardPageShell maxWidth="full">
      <DashboardContent />
    </DashboardPageShell>
  );
}
