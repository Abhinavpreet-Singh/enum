"use client";

import AdminPageShell from "@/components/admin/admin-page-shell";
import { ContentTab } from "@/components/admin/admin-sections";

export default function AdminContentPage() {
  return (
    <AdminPageShell
      title="Content"
      description="Inventory of learning content, assessments, and recently updated scenarios."
    >
      <ContentTab />
    </AdminPageShell>
  );
}
