"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { useExamStore } from "@/store/exam-store";
import SystemCheck from "@/components/pre-exam/system-check";
import ExamTimer from "@/components/exam/exam-timer";
import ViolationBadge from "@/components/security/violation-badge";
import type { SystemCheckResult } from "@/types";
import desktopApi from "@/lib/api";
import { loadLocalDraft } from "@/services/autosave";

export default function PreExamPage() {
  const router = useRouter();
  const { assessment, candidate, setAttemptId, setExamStatus } = useExamStore();

  const [checkResult, setCheckResult] = useState<SystemCheckResult | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [themeMode, setThemeMode] = useState<"light" | "dark">("dark");

  useEffect(() => {
    if (!assessment || !candidate) {
      router.replace("/login");
    }
  }, [assessment, candidate, router]);

  useEffect(() => {
    const savedTheme =
      typeof window !== "undefined" ? localStorage.getItem("enum_theme") : null;
    const initialTheme = savedTheme === "light" ? "light" : "dark";
    setThemeMode(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  function toggleTheme() {
    const nextTheme = themeMode === "dark" ? "light" : "dark";
    setThemeMode(nextTheme);
    localStorage.setItem("enum_theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }

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
    <div className="relative flex h-screen flex-col overflow-hidden bg-white text-[#0a0a0a] dark:bg-[#050505] dark:text-white">
      {/* Ambient glow + grid texture */}
      <div className="pointer-events-none fixed inset-0 enum-glow" />
      <div className="pointer-events-none fixed inset-0 enum-grid-bg" />

      <div
        className="relative z-50 flex h-14 shrink-0 items-center border-b border-black/10 bg-white dark:border-white/10 dark:bg-black"
        data-tauri-drag-region
      >
        <div className="flex h-full w-16 shrink-0 items-center justify-center border-r border-black/10 dark:border-white/10">
          <img
            src="/lgogo.png"
            alt="Enum logo"
            className="h-8 w-8 shrink-0 object-contain"
          />
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-4 px-4">
          <BrandText />
          <div className="min-w-0 border-l border-black/10 pl-4 dark:border-white/10">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-600 dark:text-gray-300">
              Test
            </p>
            <h1 className="truncate text-sm font-semibold text-black dark:text-white">
              {assessment.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4">
          <span className="border border-black/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-gray-700 dark:border-white/10 dark:text-gray-200">
            0/{assessment.totalQuestions} attempted
          </span>
          <IconAction
            label={themeMode === "dark" ? "Light mode" : "Dark mode"}
            onClick={toggleTheme}
            icon={themeMode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          />
          <ViolationBadge count={0} level="low" />
          <ExamTimer seconds={assessment.duration * 60} />
          <div
            className="grid h-8 w-8 place-items-center border border-black/10 bg-black text-[10px] font-bold uppercase tracking-[0.08em] text-white dark:border-white/10 dark:bg-white dark:text-black"
            title={candidate.displayName ?? candidate.email ?? "Candidate"}
          >
            {(candidate.displayName ?? candidate.email ?? "U").slice(0, 2)}
          </div>
        </div>
      </div>

      <div className="relative z-10 grid min-h-0 flex-1 grid-cols-[minmax(320px,0.86fr)_minmax(460px,1.14fr)] gap-0 overflow-hidden">
        <aside className="flex min-h-0 flex-col overflow-hidden border-r border-black/10 bg-white/80 p-6 animate-fade-slide-up dark:border-white/10 dark:bg-black/75">

          {/* Assessment header */}
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <h1 className="text-3xl font-black tracking-tight text-[#0a0a0a] dark:text-white">
              {assessment.title}
            </h1>
            {assessment.description && (
              <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-400">
                {assessment.description}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <AssessmentPill icon="Time" label="Duration" value={durationStr} />
              <AssessmentPill icon="?" label="Questions" value={String(assessment.totalQuestions)} />
              <AssessmentPill icon="Pass" label="Pass Mark" value={`${assessment.passingScore}%`} />
            </div>

            <div className="mt-7 border border-black/10 bg-white/85 p-5 dark:border-white/10 dark:bg-white/[0.035]">
              <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0a0a0a] dark:text-white">
                Before You Begin
              </p>
              <ul className="space-y-2 text-sm leading-5">
                <InstructionItem>Stay inside the exam app for the full session.</InstructionItem>
                {settings?.forceFullscreen && (
                  <InstructionItem>The exam opens in fullscreen mode.</InstructionItem>
                )}
                {settings?.copyPasteDetection && (
                  <InstructionItem>Copy and paste activity is monitored.</InstructionItem>
                )}
                {settings?.devToolsDetection && (
                  <InstructionItem>Developer tools are blocked.</InstructionItem>
                )}
                <InstructionItem>Violations are logged and reviewed by the administrator.</InstructionItem>
              </ul>
            </div>
          </div>
        </aside>

        <main className="flex min-h-0 flex-col overflow-hidden bg-white/80 p-6 animate-fade-slide-up animate-delay-100 dark:bg-black/75">
          <div className="mb-4 flex items-center gap-3">
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              System Check
            </span>
            <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {settings && (
            <SystemCheck settings={settings} onComplete={setCheckResult} />
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              <span className="mt-0.5 shrink-0">!</span>
              <span>{error}</span>
            </div>
          )}
          </div>

          {/* Actions */}
          <div className="mt-5 flex shrink-0 gap-3 border-t border-black/10 pt-4 dark:border-white/10">
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

          <p className="mt-4 text-center text-xs text-gray-400">
            Candidate: {candidate.displayName ?? candidate.email}
          </p>
        </main>
      </div>
    </div>
  );
}

function EnumLogo() {
  return (
    <div className="flex items-center gap-2 text-[#0a0a0a] dark:text-white">
      <img
        src="/lgogo.png"
        alt="Enum logo"
        className="h-7 w-7 shrink-0 object-contain"
      />
      <BrandText />
    </div>
  );
}

function BrandText() {
  return (
    <div className="leading-none">
      <span
        className="inline-flex select-none items-center text-[20px] font-bold leading-none"
        style={{ letterSpacing: "-0.085em", transform: "scaleX(0.9)", transformOrigin: "left" }}
      >
        <span>E</span>
        <span className="font-medium italic">N</span>
        <span>U</span>
        <span>M</span>
      </span>
      <p className="mt-1 font-mono text-[8px] font-semibold uppercase tracking-[0.24em] text-gray-400">
        EXAM CLIENT
      </p>
    </div>
  );
}

function IconAction({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onClick}
        className="grid h-8 w-8 place-items-center border border-black/10 text-gray-700 transition-colors hover:border-black/30 hover:text-black dark:border-white/10 dark:text-gray-200 dark:hover:border-white/30 dark:hover:text-white"
        aria-label={label}
      >
        {icon}
      </button>
      <div className="pointer-events-none absolute right-0 top-10 z-[9999] hidden whitespace-nowrap border border-black bg-black px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-white shadow-xl group-hover:block dark:border-white dark:bg-white dark:text-black">
        {label}
      </div>
    </div>
  );
}

function InstructionItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 border border-black/10 bg-black/[0.025] px-3 py-2 text-gray-800 dark:border-white/10 dark:bg-white/[0.045] dark:text-gray-200">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-black dark:bg-white" />
      <span>{children}</span>
    </li>
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
    <span className="inline-flex items-center gap-1.5 border border-black/10 bg-white px-3 py-1 text-xs shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <span className="text-gray-400">{icon}</span>
      <span className="text-gray-400">{label}:</span>
      <span className="font-medium text-[#0a0a0a] dark:text-white">{value}</span>
    </span>
  );
}
