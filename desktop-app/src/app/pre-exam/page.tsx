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
  const { assessment, candidate, setAttemptId, setExamStatus } = useExamStore();

  const [checkResult, setCheckResult] = useState<SystemCheckResult | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

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

      const draft = loadLocalDraft(attempt.id);
      if (draft.length > 0) {
        draft.forEach((a) => useExamStore.getState().saveAnswer(a));
      }

      setAttemptId(attempt.id);
      setExamStatus("in_progress");
      router.push(`/exam`);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to start exam. Please try again.";
      setError(msg);
    } finally {
      setStarting(false);
    }
  }

  const totalMinutes = assessment.duration;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const durationStr =
    hours > 0 ? `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}` : `${minutes}m`;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white">
      {/* Ambient glow + grid texture */}
      <div className="pointer-events-none fixed inset-0 enum-glow" />
      <div className="pointer-events-none fixed inset-0 enum-grid-bg" />

      {/* Title bar */}
      <div
        className="relative z-10 flex h-9 shrink-0 items-center px-4 border-b border-black/8 select-none"
        data-tauri-drag-region
      >
        <span
          className="text-xs font-black text-gray-400 uppercase"
          style={{ letterSpacing: "0.2em" }}
        >
          enum
        </span>
        <span className="ml-auto text-xs text-gray-400 tracking-wide">Pre-Exam Checks</span>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center overflow-y-auto p-6">
        <div className="w-full max-w-lg animate-fade-slide-up">

          {/* Assessment header */}
          <div className="mb-8">
            {assessment.organization?.name && (
              <p className="mb-1 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
                {assessment.organization.name}
              </p>
            )}
            <h1 className="text-2xl font-black tracking-tight text-[#0a0a0a]">
              {assessment.title}
            </h1>
            <div className="mt-4 flex flex-wrap gap-2">
              <AssessmentPill icon="⏱" label="Duration" value={durationStr} />
              <AssessmentPill icon="?" label="Questions" value={String(assessment.totalQuestions)} />
              <AssessmentPill icon="✓" label="Pass Mark" value={`${assessment.passingScore}%`} />
            </div>
          </div>

          {/* Divider */}
          <div className="mb-6 flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-400">
              System Check
            </span>
            <div className="flex-1 border-t border-black/8" />
          </div>

          {/* System Check */}
          {settings && (
            <SystemCheck settings={settings} onComplete={setCheckResult} />
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              <span className="mt-0.5 shrink-0">✕</span>
              <span>{error}</span>
            </div>
          )}

          {/* Instructions panel */}
          {checkResult?.canProceed && (
            <div className="enum-card mt-6 p-5 animate-fade-slide-up animate-delay-200">
              <p className="mb-3 text-sm font-semibold text-[#0a0a0a]">Before you begin</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-gray-300">—</span>
                  Do not switch tabs or windows during the exam.
                </li>
                {settings?.forceFullscreen && (
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 text-gray-300">—</span>
                    The exam will run in fullscreen mode.
                  </li>
                )}
                {settings?.copyPasteDetection && (
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 text-gray-300">—</span>
                    Copy-paste is monitored.
                  </li>
                )}
                {settings?.devToolsDetection && (
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 text-gray-300">—</span>
                    Developer tools are blocked.
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-gray-300">—</span>
                  All violations are logged and reviewed.
                </li>
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex gap-3">
            <button
              onClick={() => router.push("/login")}
              className="btn-ghost flex-1"
            >
              ← Back
            </button>
            <button
              onClick={handleStartExam}
              disabled={!checkResult?.canProceed || starting}
              className="btn-primary flex-1"
            >
              {starting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Starting…
                </span>
              ) : (
                "Begin Exam →"
              )}
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">
            Candidate: {candidate.name ?? candidate.email}
          </p>
        </div>
      </div>
    </div>
  );
}

function AssessmentPill({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1 text-xs shadow-sm">
      <span className="text-gray-400">{icon}</span>
      <span className="text-gray-400">{label}:</span>
      <span className="font-medium text-[#0a0a0a]">{value}</span>
    </span>
  );
}
