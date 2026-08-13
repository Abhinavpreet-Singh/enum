import RaceLanding from "@/components/race/race-landing";
import {
  DashboardPageHeader,
  DashboardPageShell,
} from "@/components/dashboard/dashboard-page-shell";

export default function RaceLandingPage() {
  return (
    <DashboardPageShell>
      <DashboardPageHeader
        breadcrumb="Dashboard / Quick Race"
        title="Quick Race"
        description="Enter a display name, create a race, and share the invite link with a friend."
      />
      <RaceLanding />
    </DashboardPageShell>
  );
}
