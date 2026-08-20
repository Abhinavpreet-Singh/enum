"use client";

import { Suspense } from "react";
import AdminPageShell from "@/components/admin/admin-page-shell";
import DsaContentPanel from "@/components/admin/dsa-content-panel";

export default function AdminDsaContentPage() {
  return (
    <AdminPageShell
      title="DSA Questions"
      description="Create, edit, and delete DSA Arena coding questions."
    >
      <Suspense
        fallback={
          <div className="font-mono text-xs text-gray-400">Loading DSA admin...</div>
        }
      >
        <DsaContentPanel />
      </Suspense>
    </AdminPageShell>
  );
}
