"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import TestEditor from "@/components/dashboard/tests/test-editor";
import type { TestEditorTab } from "@/components/dashboard/tests/test-editor-types";

function EditTestInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  const tab = (searchParams.get("tab") ?? "general") as TestEditorTab;

  return <TestEditor mode="edit" assessmentId={id} initialTab={tab} />;
}

export default function EditTestPage() {
  return (
    <Suspense fallback={<div className="p-8 font-mono text-xs text-gray-400">Loading…</div>}>
      <EditTestInner />
    </Suspense>
  );
}
