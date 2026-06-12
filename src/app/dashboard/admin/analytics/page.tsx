"use client";

import AdminPageShell from "@/components/admin/admin-page-shell";
import AnalyticsSection from "@/components/admin/sections/analytics-section";

export default function AdminAnalyticsPage() {
  return (
    <AdminPageShell
      title="Analytics"
      description="Platform growth, content engagement, and activity trends over time."
    >
      <AnalyticsSection />
    </AdminPageShell>
  );
}
