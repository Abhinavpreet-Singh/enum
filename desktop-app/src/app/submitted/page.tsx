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
    // Clear sensitive session data
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("examToken");
    }
    reset();
  }, [reset]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-6">
      <div className="w-full max-w-sm text-center">
        {/* Result icon */}
        <div
          className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full text-4xl ${
            passed
              ? "bg-green-500/10 text-green-400"
              : "bg-yellow-500/10 text-yellow-400"
          }`}
        >
          {passed ? "✓" : "○"}
        </div>

        <h1 className="text-3xl font-black text-white">
          {passed ? "Passed!" : "Submitted"}
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Your exam has been submitted successfully.
        </p>

        {max > 0 && (
          <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="text-4xl font-black text-white">{percent}%</div>
            <div className="mt-1 text-xs text-gray-500">
              {score} / {max} points
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-1.5 w-full rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all ${
                  passed ? "bg-green-400" : "bg-yellow-400"
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-8 space-y-3 text-sm text-gray-500">
          <p>Results will be sent to your registered email.</p>
          <p>You may close this window.</p>
        </div>

        <button
          onClick={() => router.push("/login")}
          className="mt-8 w-full rounded-lg border border-white/10 py-3 text-sm text-gray-400 transition-all hover:border-white/30 hover:text-white"
        >
          Return to Home
        </button>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-xs text-gray-700">
        ENUM Secure Desktop Client — v0.1.0
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
