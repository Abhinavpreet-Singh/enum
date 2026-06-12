"use client";

import AdminPageShell from "@/components/admin/admin-page-shell";
import SettingsSection from "@/components/admin/sections/settings-section";

export default function AdminSettingsPage() {
  return (
    <AdminPageShell
      title="Platform Settings"
      description="Feature flags, platform limits, announcements, and broadcast messages."
    >
      <SettingsSection />
    </AdminPageShell>
  );
}
