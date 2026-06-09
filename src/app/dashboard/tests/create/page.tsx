"use client";

import { Suspense } from "react";
import TestEditor from "@/components/dashboard/tests/test-editor";

function CreateTestInner() {
  return <TestEditor mode="create" />;
}

export default function CreateTestPage() {
  return (
    <Suspense fallback={<div className="p-8 font-mono text-xs text-gray-400">Loading…</div>}>
      <CreateTestInner />
    </Suspense>
  );
}
