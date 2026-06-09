"use client";

import { useParams } from "next/navigation";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { CandidateDetailView } from "@/components/dashboard/candidates/candidate-detail-view";

export default function CandidateDetailPage() {
  const params = useParams();
  const testId = typeof params.testId === "string" ? params.testId : "";
  const attemptId = typeof params.attemptId === "string" ? params.attemptId : "";

  return (
    <DashboardPageShell maxWidth="full">
      <CandidateDetailView
        attemptId={attemptId}
        breadcrumbs={[
          { label: "Candidates", href: "/dashboard/candidates" },
          { label: "Test Candidates", href: `/dashboard/candidates/${testId}` },
        ]}
      />
    </DashboardPageShell>
  );
}
