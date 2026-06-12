"use client";

import AdminPageShell from "@/components/admin/admin-page-shell";
import { UsersTab } from "@/components/admin/admin-sections";

export default function AdminUsersPage() {
  return (
    <AdminPageShell
      title="Users"
      description="Search, inspect, and manage student accounts across the platform."
    >
      <UsersTab />
    </AdminPageShell>
  );
}
