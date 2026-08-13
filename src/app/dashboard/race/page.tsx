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
        description="Create a lobby, invite friends, then race — first to pass every test wins."
      />
      <RaceLanding />
    </DashboardPageShell>
  );
}
