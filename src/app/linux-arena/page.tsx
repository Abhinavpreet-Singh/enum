import { Suspense } from "react";
import LinuxArenaPage from "@/components/linux/LinuxArenaPage";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center font-mono text-sm text-gray-500">
          Loading Linux arena...
        </div>
      }
    >
      <LinuxArenaPage />
    </Suspense>
  );
}
