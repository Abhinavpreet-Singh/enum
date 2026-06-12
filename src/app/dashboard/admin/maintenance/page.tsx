"use client";

import AdminPageShell from "@/components/admin/admin-page-shell";
import { MaintenanceTab } from "@/components/admin/admin-sections";

export default function AdminMaintenancePage() {
  return (
    <AdminPageShell
      title="Maintenance"
      description="Control which production pages show an under-maintenance message."
    >
      <MaintenanceTab />
    </AdminPageShell>
  );
}
