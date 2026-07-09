import { Suspense } from "react";
import ContentCreateClient from "./content-create-client";

export default function AdminContentCreatePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 font-mono text-xs text-gray-400">Loading form…</div>
      }
    >
      <ContentCreateClient />
    </Suspense>
  );
}
