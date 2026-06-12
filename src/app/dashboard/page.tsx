"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardContent from "@/components/dashboard/dashboard-content";
import OrganizationDashboardContent from "@/components/dashboard/organization/organization-dashboard-content";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import useAccountType from "@/hooks/useAccountType";

export default function DashboardPage() {
  const accountType = useAccountType();
  const router = useRouter();

  useEffect(() => {
    if (accountType === "admin") {
      router.replace("/dashboard/admin");
    }
  }, [accountType, router]);

  if (accountType === "admin") {
    return (
      <DashboardPageShell maxWidth="full">
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="font-mono text-xs tracking-wider text-gray-400">
            Loading admin dashboard…
          </p>
        </div>
      </DashboardPageShell>
    );
  }

  if (accountType === "organization") {
    return (
      <DashboardPageShell maxWidth="full">
        <OrganizationDashboardContent />
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell maxWidth="full">
      <DashboardContent />
    </DashboardPageShell>
  );
}
