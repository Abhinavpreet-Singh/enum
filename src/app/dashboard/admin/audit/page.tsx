"use client";

import AdminPageShell from "@/components/admin/admin-page-shell";
import AuditSection from "@/components/admin/sections/audit-section";

export default function AdminAuditPage() {
  return (
    <AdminPageShell
      title="Audit Log"
      description="Immutable log of all admin actions: deletions, approvals, setting changes, and announcements."
    >
      <AuditSection />
    </AdminPageShell>
  );
}
