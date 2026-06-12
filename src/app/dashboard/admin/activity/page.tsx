"use client";

import AdminPageShell from "@/components/admin/admin-page-shell";
import { ActivityTab } from "@/components/admin/admin-sections";

export default function AdminActivityPage() {
  return (
    <AdminPageShell
      title="Activity"
      description="Recent assessment attempts and incident sessions across the platform."
    >
      <ActivityTab />
    </AdminPageShell>
  );
}
