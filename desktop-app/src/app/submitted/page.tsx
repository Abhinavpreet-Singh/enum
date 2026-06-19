"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useExamStore } from "@/store/exam-store";

function SubmittedContent() {
  const router = useRouter();
  const params = useSearchParams();
  const reset = useExamStore((s) => s.reset);

  const score = Number(params.get("score") ?? 0);
  const max = Number(params.get("max") ?? 0);
  const passed = params.get("passed") === "true";
  const percent = max > 0 ? Math.round((score / max) * 100) : 0;

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("examToken");
    }
    reset();
  }, [reset]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white p-6 text-black dark:bg-black dark:text-white">
      {/* Ambient glow + grid texture */}
      <div className="pointer-events-none fixed inset-0 enum-glow" />
      <div className="pointer-events-none fixed inset-0 enum-grid-bg" />

      <div className="relative z-10 w-full max-w-sm text-center animate-fade-slide-up">
        {/* Result mark */}
        <div
          className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded border text-2xl font-bold ${
            passed
              ? "border-green-200 bg-green-50 text-green-600 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200"
              : "border-black/10 bg-gray-50 text-gray-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-400"
          }`}
        >
          {passed ? "✓" : "○"}
        </div>

        <h1 className="text-3xl font-black tracking-tight text-[#0a0a0a] dark:text-white">
          {passed ? "Passed" : "Submitted"}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Your exam has been submitted successfully.
        </p>

        {max > 0 && (
          <div className="enum-card mt-8 rounded-lg p-6 animate-fade-slide-up animate-delay-200">
            <div
              className={`text-5xl font-black tracking-tight ${
                passed ? "text-[#0a0a0a] dark:text-white" : "text-gray-700 dark:text-gray-300"
              }`}
            >
              {percent}
              <span className="text-2xl text-gray-300">%</span>
            </div>
            <div className="mt-1 text-xs text-gray-400" style={{ fontFamily: "var(--font-geist-mono), monospace" }}>
              {score} / {max} points
            </div>

            {/* Progress bar */}
            <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-black/8 dark:bg-white/10">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  passed ? "bg-green-500" : "bg-[#0a0a0a] dark:bg-white"
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>

            {/* Pass/fail label */}
            <div className="mt-3 text-xs text-gray-400">
              {passed ? "Above passing threshold" : "Below passing threshold"}
            </div>
          </div>
        )}

        <div className="mt-8 space-y-1.5 text-sm text-gray-400">
          <p>Results will be sent to your registered email.</p>
          <p>You may close this window.</p>
        </div>

        <button
          onClick={() => router.push("/login")}
          className="btn-ghost mt-6 w-full"
        >
          Return to Home
        </button>
      </div>

      {/* Footer */}
      <div
        className="relative z-10 mt-auto pt-8 text-xs text-gray-300"
        style={{ fontFamily: "var(--font-geist-mono), monospace", letterSpacing: "0.06em" }}
      >
        ENUM Secure Desktop Client · v0.1.0
      </div>
    </div>
  );
}

export default function SubmittedPage() {
  return (
    <Suspense fallback={null}>
      <SubmittedContent />
    </Suspense>
  );
}
