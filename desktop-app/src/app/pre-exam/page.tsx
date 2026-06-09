"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useExamStore } from "@/store/exam-store";
import SystemCheck from "@/components/pre-exam/system-check";
import type { SystemCheckResult } from "@/types";
import desktopApi from "@/lib/api";
import { loadLocalDraft } from "@/services/autosave";

export default function PreExamPage() {
  const router = useRouter();
  const { assessment, candidate, setAttemptId, setExamStatus } =
    useExamStore();

  const [checkResult, setCheckResult] = useState<SystemCheckResult | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  // Guard: redirect if no session
  useEffect(() => {
    if (!assessment || !candidate) {
      router.replace("/login");
    }
  }, [assessment, candidate, router]);

  if (!assessment || !candidate) return null;

  const settings = assessment.settings;

  async function handleStartExam() {
    if (!checkResult?.canProceed) return;
    setError("");
    setStarting(true);
    try {
      const { data } = await desktopApi.startAttempt(assessment!.id);
      const attempt = data.data;

      // Load any locally-drafted answers (offline recovery)
      const draft = loadLocalDraft(attempt.id);
      if (draft.length > 0) {
        // Merge draft answers into store
        draft.forEach((a) =>
          useExamStore.getState().saveAnswer(a),
        );
      }

      setAttemptId(attempt.id);
      setExamStatus("in_progress");
      router.push(`/exam`);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to start exam. Please try again.";
      setError(msg);
    } finally {
      setStarting(false);
    }
  }

  const totalMinutes = assessment.duration;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const durationStr =
    hours > 0 ? `${hours}h ${minutes > 0 ? `${minutes}m` : ""}`.trim() : `${minutes}m`;

  return (
    <div className="flex min-h-screen flex-col bg-black">
      {/* Title bar */}
      <div
        className="flex h-9 items-center px-4 border-b border-white/10 select-none"
        data-tauri-drag-region
      >
        <span className="text-xs font-bold tracking-widest text-white/40 uppercase">enum</span>
        <span className="ml-auto text-xs text-white/30">Pre-Exam Checks</span>
      </div>

      <div className="flex flex-1 flex-col items-center p-6">
        <div className="w-full max-w-lg">
          {/* Assessment info */}
          <div className="mb-8">
            <p className="text-xs uppercase tracking-widest text-gray-500">
              {assessment.organization?.name}
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white">
              {assessment.title}
            </h1>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              <Pill label="Duration" value={durationStr} />
              <Pill label="Questions" value={String(assessment.totalQuestions)} />
              <Pill label="Pass Mark" value={`${assessment.passingScore}%`} />
            </div>
          </div>

          {/* System Check */}
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-400">
            System Check
          </h2>

          {settings && (
            <SystemCheck settings={settings} onComplete={setCheckResult} />
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Instructions */}
          {checkResult?.canProceed && (
            <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-gray-300 space-y-1.5">
              <p className="font-semibold text-white">Before you begin:</p>
              <ul className="space-y-1 text-gray-400">
                <li>• Do not switch tabs or windows during the exam.</li>
                {settings?.forceFullscreen && (
                  <li>• The exam will run in fullscreen mode.</li>
                )}
                {settings?.copyPasteDetection && (
                  <li>• Copy-paste is monitored.</li>
                )}
                {settings?.devToolsDetection && (
                  <li>• Developer tools are blocked.</li>
                )}
                <li>• All violations are logged and reviewed.</li>
              </ul>
            </div>
          )}

          {/* Start button */}
          <div className="mt-8 flex gap-3">
            <button
              onClick={() => router.push("/login")}
              className="flex-1 rounded-lg border border-white/10 py-3 text-sm text-gray-400 transition-all hover:border-white/30 hover:text-white"
            >
              Back
            </button>
            <button
              onClick={handleStartExam}
              disabled={!checkResult?.canProceed || starting}
              className="flex-1 rounded-lg bg-white py-3 text-sm font-semibold text-black transition-all hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {starting ? "Starting…" : "Begin Exam"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-white/10 px-3 py-1 text-gray-300">
      <span className="text-gray-500">{label}: </span>
      {value}
    </span>
  );
}
