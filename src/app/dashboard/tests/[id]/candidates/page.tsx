"use client";

import { useParams } from "next/navigation";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { CandidatesListView } from "@/components/dashboard/candidates/candidates-list-view";

export default function TestCandidatesPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  return (
    <DashboardPageShell>
      <CandidatesListView
        assessmentId={id}
        detailBasePath={`/dashboard/tests/${id}/candidates`}
        backHref={`/dashboard/tests/${id}`}
        backLabel="Back to test"
      />
    </DashboardPageShell>
  );
}
