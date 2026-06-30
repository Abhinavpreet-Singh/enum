"use client";

import AdminPageShell from "@/components/admin/admin-page-shell";
import BillingSection from "@/components/admin/sections/billing-section";

export default function AdminBillingPage() {
  return (
    <AdminPageShell
      title="Premium Billing"
      description="Manage Pro products, INR/USD prices, payment orders, and manual access grants."
    >
      <BillingSection />
    </AdminPageShell>
  );
}
