"use client";

import { useParams } from "next/navigation";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { CandidateDetailView } from "@/components/dashboard/candidates/candidate-detail-view";

export default function TestCandidateDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const attemptId = typeof params.attemptId === "string" ? params.attemptId : "";

  return (
    <DashboardPageShell>
      <CandidateDetailView
        attemptId={attemptId}
        breadcrumbs={[
          { label: "Tests", href: "/dashboard/tests" },
          { label: "Edit Test", href: `/dashboard/tests/${id}` },
          { label: "Candidates", href: `/dashboard/tests/${id}/candidates` },
        ]}
      />
    </DashboardPageShell>
  );
}
