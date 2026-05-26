import QuestionsList from "@/components/dsa/questions-list";
import {
  DashboardPageHeader,
  DashboardPageShell,
} from "@/components/dashboard/dashboard-page-shell";

export default function DSAArenaPage() {
  return (
    <DashboardPageShell>
      <DashboardPageHeader
        breadcrumb="Dashboard / DSA Arena"
        title="DSA Arena"
        description="Practice data structures & algorithms — LeetCode style"
      />
      <QuestionsList />
    </DashboardPageShell>
  );
}
