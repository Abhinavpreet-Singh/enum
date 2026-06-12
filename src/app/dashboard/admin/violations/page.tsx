"use client";

import AdminPageShell from "@/components/admin/admin-page-shell";
import ViolationsSection from "@/components/admin/sections/violations-section";

export default function AdminViolationsPage() {
  return (
    <AdminPageShell
      title="Proctoring & Violations"
      description="Review flagged assessment attempts, violation patterns, and candidate integrity scores."
    >
      <ViolationsSection />
    </AdminPageShell>
  );
}
