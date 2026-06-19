"use client";

import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Moon, RefreshCw, Sun, ZoomIn, ZoomOut } from "lucide-react";
import { useExamStore } from "@/store/exam-store";
import QuestionNavigator from "@/components/exam/question-navigator";
import QuestionRenderer from "@/components/exam/question-renderer";
import ExamTimer from "@/components/exam/exam-timer";
import ViolationBadge from "@/components/security/violation-badge";
import {
  applySecuritySettings,
  setViolationCallback,
  teardownSecurity,
  installKeyboardBlocker,
  installContextMenuBlocker,
} from "@/services/security";
import { startHeartbeat, stopHeartbeat } from "@/services/heartbeat";
import { startAutosave, stopAutosave, clearLocalDraft } from "@/services/autosave";
import {
  initViolationReporter,
  reportViolation,
  stopViolationReporter,
  flushAll,
} from "@/services/violations";
import desktopApi from "@/lib/api";
import type { ExamQuestion, ViolationType, ViolationSeverity } from "@/types";

export default function ExamPage() {
  const router = useRouter();

  const {
    assessment,
    candidate,
    questions,
    answers,
    attemptId,
    currentQuestionIndex,
    timeRemainingSeconds,
    violationCount,
    suspicionLevel,
    saveAnswer,
    setCurrentQuestion,
    incrementViolation,
    setExamStatus,
    setQuestions,
  } = useExamStore();

  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showRefreshConfirm, setShowRefreshConfirm] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [questionsError, setQuestionsError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<"home" | "question">("home");
  const [themeMode, setThemeMode] = useState<"light" | "dark">("dark");
  const [zoom, setZoom] = useState(100);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settings = assessment?.settings;

  useEffect(() => {
    if (!assessment || !attemptId) {
      router.replace("/login");
    }
  }, [assessment, attemptId, router]);

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

  useEffect(() => {
    if (!assessment || !attemptId) return;

    if (questions.length > 0) {
      setLoadingQuestions(false);
      return;
    }

    let cancelled = false;
    setLoadingQuestions(true);
    setQuestionsError("");

    (async () => {
      try {
        const { data } = await desktopApi.getQuestions();
        if (cancelled) return;
        setQuestions(data.data.questions ?? []);
      } catch {
        if (!cancelled) {
          setQuestionsError("Could not load exam questions. Please try again.");
        }
      } finally {
        if (!cancelled) setLoadingQuestions(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessment, attemptId]);

  useEffect(() => {
    if (!settings || !attemptId) return;

    const handleViolation = (
      type: ViolationType,
      description: string,
      severity: ViolationSeverity,
    ) => {
      reportViolation(type, description, severity);
      incrementViolation();
    };

    setViolationCallback(handleViolation);
    applySecuritySettings(settings).catch(() => {});
    if (settings) installKeyboardBlocker(settings);
    installContextMenuBlocker();

    return () => teardownSecurity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, attemptId]);

  useEffect(() => {
    if (!attemptId) return;
    initViolationReporter(attemptId);
    return () => stopViolationReporter();
  }, [attemptId]);

  useEffect(() => {
    if (!attemptId) return;
    startHeartbeat(attemptId, () => ({
      timeRemainingSeconds: useExamStore.getState().timeRemainingSeconds,
      currentQuestionIndex: useExamStore.getState().currentQuestionIndex,
    }));
    return () => stopHeartbeat();
  }, [attemptId]);

  useEffect(() => {
    if (!attemptId) return;
    startAutosave(attemptId, () => useExamStore.getState().answers);
    return () => stopAutosave();
  }, [attemptId]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      const store = useExamStore.getState();
      store.tickTimer();
      if (store.timeRemainingSeconds <= 1) {
        handleAutoSubmit();
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnswer = useCallback(
    (value: unknown) => {
      const q = questions[currentQuestionIndex];
      if (!q) return;
      saveAnswer({ aqId: q.aqId, value, savedAt: new Date().toISOString() });
    },
    [questions, currentQuestionIndex, saveAnswer],
  );

  function navigateToQuestion(index: number) {
    setCurrentQuestion(index);
    setView("question");
  }

  async function submitExam(reason: "manual" | "auto" = "manual") {
    if (submitting || !attemptId) return;
    setSubmitting(true);
    stopHeartbeat();
    stopAutosave();

    try {
      await flushAll();
      const { data } = await desktopApi.submit(
        attemptId,
        useExamStore.getState().answers,
        [],
        reason,
      );
      clearLocalDraft(attemptId);
      setExamStatus("submitted");

      const result = data.data as { totalScore: number; maxScore: number; passed: boolean };
      router.push(
        `/submitted?score=${result.totalScore}&max=${result.maxScore}&passed=${result.passed}`,
      );
    } catch {
      router.push("/submitted");
    } finally {
      setSubmitting(false);
      teardownSecurity();
    }
  }

  async function handleAutoSubmit() {
    if (timerRef.current) clearInterval(timerRef.current);
    await submitExam("auto");
  }

  async function refreshQuestions() {
    setShowRefreshConfirm(false);
    setRefreshing(true);
    setQuestionsError("");
    try {
      const { data } = await desktopApi.getQuestions();
      const nextQuestions = data.data.questions ?? [];
      setQuestions(nextQuestions);
      if (currentQuestionIndex >= nextQuestions.length) {
        setCurrentQuestion(Math.max(0, nextQuestions.length - 1));
      }
      setView("home");
    } catch {
      setQuestionsError("Could not refresh exam questions. Please try again.");
    } finally {
      setRefreshing(false);
    }
  }

  if (!assessment || !attemptId) return null;

  if (loadingQuestions) {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-black dark:bg-black dark:text-white">
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          Loading exam questions…
        </div>
      </div>
    );
  }

  if (questionsError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center text-black dark:bg-black dark:text-white">
        <p className="text-sm text-red-400">{questionsError}</p>
        <button
          onClick={() => router.replace("/login")}
          className="btn-ghost px-5 py-2"
        >
          Back to login
        </button>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center text-black dark:bg-black dark:text-white">
        <h1 className="text-xl font-bold">{assessment.title}</h1>
        <p className="max-w-md text-sm text-gray-400">
          This assessment has no questions yet. Ask your test administrator to add questions,
          then log in again.
        </p>
        <button
          onClick={() => router.replace("/login")}
          className="rounded border border-black bg-black px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-100"
        >
          Back to login
        </button>
      </div>
    );
  }

  const currentQ = questions[currentQuestionIndex];
  const currentAnswer = answers.find((a) => a.aqId === currentQ?.aqId);
  const answeredCount = answers.length;
  const totalQ = questions.length;

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-white text-black dark:bg-black dark:text-white">
      <div className="pointer-events-none fixed inset-0 enum-glow" />
      <div className="pointer-events-none fixed inset-0 enum-grid-bg opacity-40" />

      {/* ── Top Bar ── */}
      <div
        className="relative z-10 flex h-12 shrink-0 items-center gap-3 border-b border-black/10 bg-white px-4 dark:border-white/10 dark:bg-black"
        data-tauri-drag-region
      >
        <EnumLogo />
        <span className="flex-1 truncate font-mono text-xs tracking-[0.08em] text-gray-500 dark:text-gray-400">
          {assessment.title}
        </span>

        <div className="flex items-center gap-2">
          <IconAction
            label="Refresh test"
            onClick={() => setShowRefreshConfirm(true)}
            disabled={refreshing}
            icon={<RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />}
          />
          <div className="flex h-8 items-center gap-2 border border-black/10 px-2 dark:border-white/10">
            <ZoomOut className="h-3.5 w-3.5 text-gray-400" />
            <input
              type="range"
              min={85}
              max={115}
              step={5}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="h-1 w-24 accent-black dark:accent-white"
              title={`Zoom ${zoom}%`}
            />
            <ZoomIn className="h-3.5 w-3.5 text-gray-400" />
          </div>
          <IconAction
            label={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            onClick={toggleTheme}
            icon={themeMode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          />
          <ViolationBadge count={violationCount} level={suspicionLevel} />
          <ExamTimer seconds={timeRemainingSeconds} />
          <button
            onClick={() => setShowConfirm(true)}
            disabled={submitting}
            className="rounded border border-black bg-black px-4 py-1.5 font-mono text-[11px] font-semibold tracking-[0.16em] text-white transition-colors hover:bg-gray-800 disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-100"
          >
            {submitting ? "SUBMITTING" : "FINISH EXAM"}
          </button>
          <div
            className="grid h-8 w-8 place-items-center border border-black/10 bg-black text-[10px] font-bold uppercase tracking-[0.08em] text-white dark:border-white/10 dark:bg-white dark:text-black"
            title={candidate?.displayName ?? candidate?.email ?? "Candidate"}
          >
            {(candidate?.displayName ?? candidate?.email ?? "U").slice(0, 2)}
          </div>
        </div>
      </div>

      <div
        className="relative z-10 flex min-h-0 flex-1 overflow-hidden"
        style={{ fontSize: `${zoom}%` }}
      >
        {/* ── Left: Question Navigator ── */}
        <div
          className="flex w-14 shrink-0 flex-col items-center overflow-hidden border-r border-black/10 bg-white dark:border-white/10 dark:bg-black"
        >
          <div className="flex w-full flex-col items-center gap-2 border-b border-black/10 p-2 dark:border-white/10">
            <button
              type="button"
              onClick={() => setView("home")}
              title="Question overview"
              className={`grid h-10 w-10 place-items-center rounded border font-mono text-[10px] font-bold transition-colors ${
                view === "home"
                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-black/10 text-gray-500 hover:border-black/30 hover:text-black dark:border-white/10 dark:text-gray-400 dark:hover:border-white/30 dark:hover:text-white"
              }`}
            >
              HOME
            </button>
          </div>

          {/* Navigator grid */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <QuestionNavigator
              questions={questions}
              answers={answers}
              currentIndex={view === "question" ? currentQuestionIndex : -1}
              onNavigate={navigateToQuestion}
            />
          </div>
        </div>

        {/* ── Main: Question Area ── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white dark:bg-black">
          <div className="min-h-0 flex-1 overflow-hidden">
            {view === "home" ? (
              <QuestionOverview
                questions={questions}
                answers={answers}
                currentIndex={currentQuestionIndex}
                answeredCount={answeredCount}
                onNavigate={navigateToQuestion}
                onSubmit={() => setShowConfirm(true)}
                submitting={submitting}
              />
            ) : currentQ && (
              <QuestionRenderer
                key={currentQ.aqId}
                question={currentQ}
                questionNumber={currentQuestionIndex + 1}
                answer={currentAnswer}
                onAnswer={handleAnswer}
                onPrevious={() => setCurrentQuestion(Math.max(0, currentQuestionIndex - 1))}
                onNext={() => setCurrentQuestion(Math.min(totalQ - 1, currentQuestionIndex + 1))}
                canPrevious={currentQuestionIndex > 0}
                canNext={currentQuestionIndex < totalQ - 1}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Submit Confirmation Modal ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-black/20 bg-white p-6 shadow-2xl animate-fade-slide-up dark:border-white/10 dark:bg-[#101010]">
            <h3 className="text-base font-bold text-black dark:text-white">Submit Exam?</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              You have answered{" "}
              <span className="font-semibold text-black dark:text-white">{answeredCount}</span> of{" "}
              <span className="font-semibold text-black dark:text-white">{totalQ}</span> questions.
              This action cannot be undone.
            </p>
            {totalQ - answeredCount > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded border border-amber-400/25 bg-amber-400/10 p-2.5 text-xs text-amber-700 dark:text-amber-200">
                <span>!</span>
                <span>
                  {totalQ - answeredCount} question{totalQ - answeredCount > 1 ? "s" : ""} unanswered
                </span>
              </div>
            )}
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="btn-ghost flex-1 py-2.5"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowConfirm(false); submitExam("manual"); }}
                disabled={submitting}
                className="btn-primary flex-1 py-2.5"
              >
                {submitting ? "Submitting…" : "Confirm Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRefreshConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm">
          <div className="w-full max-w-sm border border-black/20 bg-white p-6 shadow-2xl animate-fade-slide-up dark:border-white/10 dark:bg-[#101010]">
            <h3 className="text-base font-bold text-black dark:text-white">Refresh Test?</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              This reloads the latest question list from the server. Your saved answers remain in this session.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowRefreshConfirm(false)}
                className="btn-ghost flex-1 py-2.5"
              >
                Cancel
              </button>
              <button
                onClick={refreshQuestions}
                disabled={refreshing}
                className="btn-primary flex-1 py-2.5"
              >
                {refreshing ? "Refreshing" : "Refresh"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EnumLogo() {
  return (
    <div className="flex items-center gap-2 text-black dark:text-white">
      <img
        src="/lgogo.png"
        alt="Enum logo"
        className="h-7 w-7 shrink-0 object-contain"
      />
      <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.2em]">
        ENUM EXAM CLIENT
      </span>
    </div>
  );
}

function IconAction({
  label,
  icon,
  onClick,
  disabled = false,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="grid h-8 w-8 place-items-center border border-black/10 text-gray-500 transition-colors hover:border-black/30 hover:text-black disabled:opacity-50 dark:border-white/10 dark:text-gray-400 dark:hover:border-white/30 dark:hover:text-white"
        aria-label={label}
      >
        {icon}
      </button>
      <div className="pointer-events-none absolute right-0 top-10 z-50 hidden whitespace-nowrap border border-black/10 bg-white px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-gray-600 shadow-sm group-hover:block dark:border-white/10 dark:bg-black dark:text-gray-300">
        {label}
      </div>
    </div>
  );
}

function QuestionOverview({
  questions,
  answers,
  currentIndex,
  answeredCount,
  onNavigate,
  onSubmit,
  submitting,
}: {
  questions: ExamQuestion[];
  answers: { aqId: string }[];
  currentIndex: number;
  answeredCount: number;
  onNavigate: (index: number) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const grouped = questions.reduce<Record<string, Array<{ question: ExamQuestion; index: number }>>>(
    (acc, question, index) => {
      const key = question.type.replace("_", " ").toUpperCase();
      acc[key] = acc[key] ?? [];
      acc[key].push({ question, index });
      return acc;
    },
    {},
  );
  const answered = new Set(answers.map((answer) => answer.aqId));

  return (
    <div className="h-full overflow-hidden p-4">
      <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_280px] gap-4">
        <section className="min-h-0 overflow-y-auto border border-black/20 bg-white/80 p-4 dark:border-white/25 dark:bg-black/75">
          <div className="mb-4 flex items-center justify-between border-b border-black/10 pb-3 dark:border-white/10">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-400">
                Exam Home
              </p>
              <h1 className="mt-1 font-mono text-xl font-bold tracking-tight text-black dark:text-white">
                Questions
              </h1>
            </div>
            <div className="font-mono text-xs text-gray-500">
              {answeredCount}/{questions.length} answered
            </div>
          </div>

          <div className="grid gap-4">
          {Object.entries(grouped).map(([type, rows]) => (
            <section
              key={type}
              className="border border-black/10 bg-white dark:border-white/10 dark:bg-black"
            >
              <div className="flex items-center justify-between border-b border-black/10 px-3 py-2 dark:border-white/10">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
                  {type}
                </h2>
                <span className="font-mono text-[10px] text-gray-400">
                  {rows.length} question{rows.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="divide-y divide-black/10 dark:divide-white/10">
                {rows.map(({ question, index }) => {
                  const isAnswered = answered.has(question.aqId);
                  const isCurrent = false;
                  return (
                    <div
                      key={question.aqId}
                      className={`flex items-center gap-3 px-3 py-2 ${
                        isCurrent
                          ? "bg-black text-white dark:bg-white dark:text-black"
                          : "bg-white text-black dark:bg-black dark:text-white"
                      }`}
                    >
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center border font-mono text-xs font-bold ${
                          isCurrent
                            ? "border-white/30 dark:border-black/20"
                            : "border-black/10 dark:border-white/10"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold">
                          {question.title || `Question ${index + 1}`}
                        </span>
                        <span
                          className={`mt-0.5 block font-mono text-[10px] uppercase tracking-[0.12em] ${
                            isCurrent ? "text-white/70 dark:text-black/60" : "text-gray-400"
                          }`}
                        >
                          {question.points} pts · {isAnswered ? "Answered" : "Not answered"}
                        </span>
                      </span>
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          isAnswered ? "bg-emerald-500" : "bg-gray-300 dark:bg-white/20"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => onNavigate(index)}
                        className={`border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${
                          isCurrent
                            ? "border-white/30 text-white hover:bg-white/10 dark:border-black/20 dark:text-black dark:hover:bg-black/10"
                            : "border-black/10 text-gray-600 hover:border-black/30 hover:text-black dark:border-white/10 dark:text-gray-400 dark:hover:border-white/30 dark:hover:text-white"
                        }`}
                      >
                        {isAnswered ? "Modify" : "Attempt"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        </section>

        <aside className="flex min-h-0 flex-col border border-black/20 bg-white/80 p-4 dark:border-white/25 dark:bg-black/75">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-400">
            Attempt
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-xs">
            <Stat label="Total" value={questions.length} />
            <Stat label="Done" value={answeredCount} />
            <Stat label="Left" value={Math.max(questions.length - answeredCount, 0)} />
            <Stat label="Current" value={currentIndex + 1} />
          </div>
          <div className="mt-auto border-t border-black/10 pt-4 dark:border-white/10">
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="w-full border border-black bg-black px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-gray-800 disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-100"
          >
            {submitting ? "Submitting" : "Submit Test"}
          </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-black/10 p-2 dark:border-white/10">
      <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-black dark:text-white">{value}</p>
    </div>
  );
}
