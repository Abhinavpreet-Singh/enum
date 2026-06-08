"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import LinuxArenaPage from "@/components/linux/LinuxArenaPage";

function LinuxArenaContent() {
  const searchParams = useSearchParams();
  return <LinuxArenaPage initialQuestionId={searchParams.get("id") ?? undefined} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LinuxArenaContent />
    </Suspense>
  );
}

