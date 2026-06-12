import CollabLanding from "@/components/collab/collab-landing";
import {
  DashboardPageHeader,
  DashboardPageShell,
} from "@/components/dashboard/dashboard-page-shell";
import { FeatureGate } from "@/components/common/feature-gate";

export default function CollabLandingPage() {
  return (
    <FeatureGate settingKey="collab_enabled" featureName="Collaboration Rooms">
      <DashboardPageShell>
        <DashboardPageHeader
          breadcrumb="Dashboard / Collaboration"
          title="Collaboration"
          description="Create or join a room to pair on simulations, incidents, and more."
        />
        <CollabLanding />
      </DashboardPageShell>
    </FeatureGate>
  );
}
