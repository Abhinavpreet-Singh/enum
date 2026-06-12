import QuestionsList from "@/components/dsa/questions-list";
import {
  DashboardPageHeader,
  DashboardPageShell,
} from "@/components/dashboard/dashboard-page-shell";
import { FeatureGate } from "@/components/common/feature-gate";

export default function DSAArenaPage() {
  return (
    <FeatureGate settingKey="dsa_arena_enabled" featureName="DSA Arena">
      <DashboardPageShell>
        <DashboardPageHeader
          breadcrumb="Dashboard / DSA Arena"
          title="DSA Arena"
          description="Practice data structures & algorithms — LeetCode style"
        />
        <QuestionsList />
      </DashboardPageShell>
    </FeatureGate>
  );
}
