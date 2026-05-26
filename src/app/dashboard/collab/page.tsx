import CollabLanding from "@/components/collab/collab-landing";
import {
  DashboardPageHeader,
  DashboardPageShell,
} from "@/components/dashboard/dashboard-page-shell";

export default function CollabLandingPage() {
  return (
    <DashboardPageShell>
      <DashboardPageHeader
        breadcrumb="Dashboard / Collaboration"
        title="Collaboration"
        description="Create or join a room to pair on simulations, incidents, and more."
      />
      <CollabLanding />
    </DashboardPageShell>
  );
}
