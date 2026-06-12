"use client";

import AdminPageShell from "@/components/admin/admin-page-shell";
import { CompaniesTab } from "@/components/admin/admin-sections";

export default function AdminCompaniesPage() {
  return (
    <AdminPageShell
      title="Companies"
      description="Review organization registrations, approvals, and hiring activity."
    >
      <CompaniesTab />
    </AdminPageShell>
  );
}
