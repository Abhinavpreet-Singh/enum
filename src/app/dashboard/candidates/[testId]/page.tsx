"use client";

import { useParams } from "next/navigation";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { CandidatesListView } from "@/components/dashboard/candidates/candidates-list-view";

export default function CandidatesListPage() {
  const params = useParams();
  const testId = typeof params.testId === "string" ? params.testId : "";

  return (
    <DashboardPageShell maxWidth="full">
      <CandidatesListView
        assessmentId={testId}
        detailBasePath={`/dashboard/candidates/${testId}`}
        backHref="/dashboard/candidates"
        backLabel="All Tests"
      />
    </DashboardPageShell>
  );
}
