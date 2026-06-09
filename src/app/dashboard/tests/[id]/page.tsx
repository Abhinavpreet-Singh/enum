"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import TestEditor from "@/components/dashboard/tests/test-editor";

function EditTestInner() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  return <TestEditor mode="edit" assessmentId={id} />;
}

export default function EditTestPage() {
  return (
    <Suspense fallback={<div className="p-8 font-mono text-xs text-gray-400">Loading…</div>}>
      <EditTestInner />
    </Suspense>
  );
}
