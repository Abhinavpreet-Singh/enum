"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useExamStore } from "@/store/exam-store";

export default function ExitedPage() {
  const router = useRouter();
  const reset = useExamStore((s) => s.reset);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("examToken");
    }
    reset();
  }, [reset]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white p-6 text-black dark:bg-black dark:text-white">
      <div className="pointer-events-none fixed inset-0 enum-glow" />
      <div className="pointer-events-none fixed inset-0 enum-grid-bg" />

      <div className="relative z-10 w-full max-w-sm text-center animate-fade-slide-up">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded border border-black/10 bg-gray-50 text-2xl font-bold text-gray-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-400">
          →
        </div>

        <h1 className="text-3xl font-black tracking-tight text-[#0a0a0a] dark:text-white">
          Test exited
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          You left the test without finishing. This attempt was marked as
          abandoned.
        </p>

        <button
          type="button"
          onClick={() => router.replace("/login")}
          className="mt-8 w-full border border-black bg-black px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-gray-800 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-100"
        >
          Back to login
        </button>
      </div>
    </div>
  );
}
