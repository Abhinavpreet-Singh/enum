import { Suspense } from "react";
import DSAArenaClientPage from "./ClientPage";

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="font-mono text-sm text-gray-500">
            Loading question...
          </div>
        </div>
      }
    >
      <DSAArenaClientPage />
    </Suspense>
  );
}
