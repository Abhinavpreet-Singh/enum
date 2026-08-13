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
    clearAnswer,
    setCurrentQuestion,
    incrementViolation,
    setExamStatus,
    setQuestions,
  } = useExamStore();

  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [submitConfirmText, setSubmitConfirmText] = useState("");
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
    if (!showConfirm) setSubmitConfirmText("");
  }, [showConfirm]);

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
    startHeartbeat(
      attemptId,
      () => ({
        timeRemainingSeconds: useExamStore.getState().timeRemainingSeconds,
        currentQuestionIndex: useExamStore.getState().currentQuestionIndex,
      }),
      {
        onForceEnd: () => {
          void submitExam("force");
        },
      },
    );
    return () => stopHeartbeat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (value === null) {
        clearAnswer(q.aqId);
        if (attemptId) {
          const nextAnswers = useExamStore
            .getState()
            .answers.filter((answer) => answer.aqId !== q.aqId);
          desktopApi.autosave(attemptId, nextAnswers).catch(() => {});
        }
        return;
      }
      const answer = { aqId: q.aqId, value, savedAt: new Date().toISOString() };
      saveAnswer(answer);

      if (attemptId) {
        const currentAnswers = useExamStore.getState().answers;
        const existing = currentAnswers.findIndex((a) => a.aqId === answer.aqId);
        const nextAnswers =
          existing >= 0
            ? currentAnswers.map((a, i) => (i === existing ? answer : a))
            : [...currentAnswers, answer];
        desktopApi.autosave(attemptId, nextAnswers).catch(() => {});
      }
    },
    [questions, currentQuestionIndex, clearAnswer, saveAnswer, attemptId],
  );

  function navigateToQuestion(index: number) {
    setCurrentQuestion(index);
    setView("question");
  }

  async function submitExam(reason: "manual" | "auto" | "force" = "manual") {
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
        `/submitted?score=${result.totalScore}&max=${result.maxScore}&passed=${result.passed}${
          reason === "force" ? "&ended=1" : ""
        }`,
      );
    } catch {
      router.push(reason === "force" ? "/submitted?ended=1" : "/submitted");
    } finally {
      setSubmitting(false);
      teardownSecurity();
    }
  }

  async function exitExam() {
    if (submitting || !attemptId) return;
    setSubmitting(true);
    stopHeartbeat();
    stopAutosave();

    try {
      await flushAll();
      await desktopApi.exit(attemptId, useExamStore.getState().answers, []);
      clearLocalDraft(attemptId);
      setExamStatus("submitted");
      router.push("/exited");
    } catch {
      router.push("/exited");
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
        className="relative z-50 flex h-14 shrink-0 items-center border-b border-black/50 bg-white dark:border-white/50 dark:bg-black"
        data-tauri-drag-region
      >
        <div className="flex h-full w-16 shrink-0 items-center justify-center border-r border-black/50 dark:border-white/50">
          <img
            src="/lgogo.png"
            alt="Enum logo"
            className="h-8 w-8 shrink-0 object-contain"
          />
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-4 px-4">
          <BrandText />
          <div className="min-w-0 border-l border-black/25 pl-4 dark:border-white/25">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-400">
              Test
            </p>
            <h1 className="truncate text-sm font-semibold text-black dark:text-white">
              {assessment.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4">
          <span className="border border-black/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-gray-500 dark:border-white/10 dark:text-gray-400">
            {answeredCount}/{totalQ} attempted
          </span>
          <IconAction
            label="Refresh"
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
            label={themeMode === "dark" ? "Light mode" : "Dark mode"}
            onClick={toggleTheme}
            icon={themeMode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          />
          <ViolationBadge count={violationCount} level={suspicionLevel} />
          <ExamTimer seconds={timeRemainingSeconds} />
          <button
            type="button"
            onClick={() => setShowExitConfirm(true)}
            disabled={submitting}
            className="rounded border border-black/20 bg-transparent px-3 py-1.5 font-mono text-[11px] font-semibold tracking-[0.16em] text-gray-600 transition-colors hover:border-black hover:text-black disabled:opacity-50 dark:border-white/20 dark:text-gray-300 dark:hover:border-white dark:hover:text-white"
          >
            EXIT TEST
          </button>
          <button
            onClick={() => {
              setSubmitConfirmText("");
              setShowConfirm(true);
            }}
            disabled={submitting}
            className="rounded border border-black bg-black px-4 py-1.5 font-mono text-[11px] font-semibold tracking-[0.16em] text-white transition-colors hover:bg-gray-800 disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-100"
          >
            {submitting ? "SUBMITTING" : "END EXAM"}
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
          className="flex w-16 shrink-0 flex-col items-center overflow-hidden border-r border-black/50 bg-white dark:border-white/50 dark:bg-black"
        >
          <div className="flex w-full flex-col items-center gap-2 border-b border-black/[0.06] py-2 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={() => setView("home")}
              title="Question overview"
              className={`grid h-9 w-9 place-items-center rounded border font-mono text-[9px] font-bold transition-colors ${
                view === "home"
                  ? "border-black bg-black text-white shadow-sm dark:border-white dark:bg-white dark:text-black"
                  : "border-black/35 bg-black/[0.04] text-black hover:border-black hover:bg-black hover:text-white dark:border-white/35 dark:bg-white/[0.06] dark:text-white dark:hover:border-white dark:hover:bg-white dark:hover:text-black"
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
                onSubmit={() => {
                  setSubmitConfirmText("");
                  setShowConfirm(true);
                }}
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
                onNext={() => {
                  if (currentQuestionIndex >= totalQ - 1) {
                    setView("home");
                    return;
                  }
                  setCurrentQuestion(currentQuestionIndex + 1);
                }}
                canPrevious={currentQuestionIndex > 0}
                canNext={totalQ > 0}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Exit Confirmation Modal ── */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-black/20 bg-white p-6 shadow-2xl animate-fade-slide-up dark:border-white/10 dark:bg-[#101010]">
            <h3 className="text-base font-bold text-black dark:text-white">
              Exit Test?
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              You will leave without finishing. This attempt will be marked as
              abandoned and you may not be able to resume, depending on attempt
              limits.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="btn-ghost flex-1 py-2.5"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  void exitExam();
                }}
                disabled={submitting}
                className="flex-1 border border-red-500 bg-red-600 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? "Exiting…" : "Exit test"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Submit Confirmation Modal ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-black/20 bg-white p-6 shadow-2xl animate-fade-slide-up dark:border-white/10 dark:bg-[#101010]">
            <h3 className="text-base font-bold text-black dark:text-white">End Exam?</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              You have answered{" "}
              <span className="font-semibold text-black dark:text-white">{answeredCount}</span> of{" "}
              <span className="font-semibold text-black dark:text-white">{totalQ}</span> questions.
              This action cannot be undone.
            </p>
            <label className="mt-4 block">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                Type SUBMIT to end exam
              </span>
              <input
                value={submitConfirmText}
                onChange={(event) => setSubmitConfirmText(event.target.value.toUpperCase())}
                className="mt-2 w-full border border-black/10 bg-black/[0.03] px-3 py-2 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-black outline-none transition-colors placeholder:text-gray-400 focus:border-black/30 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-gray-600 dark:focus:border-white/30"
                placeholder="SUBMIT"
                autoComplete="off"
              />
            </label>
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
                disabled={submitting || submitConfirmText !== "SUBMIT"}
                className="btn-primary flex-1 py-2.5"
              >
                {submitting ? "Submitting…" : "End Exam"}
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

function BrandText() {
  return (
    <div className="shrink-0 leading-none text-black dark:text-white">
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
      <div className="pointer-events-none absolute right-0 top-10 z-[9999] hidden whitespace-nowrap border border-black bg-black px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-white shadow-xl group-hover:block dark:border-white dark:bg-white dark:text-black">
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
  const remainingCount = Math.max(questions.length - answeredCount, 0);
  const completionPercent = questions.length > 0
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;

  return (
    <div className="h-full overflow-hidden">
      <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-h-0 overflow-y-auto border-r border-black/10 bg-white p-4 dark:border-white/10 dark:bg-black">
          <div className="mb-4 flex items-center justify-between border-b border-black/10 pb-3 dark:border-white/10">
            <div>
              <h1 className="font-mono text-xl font-bold tracking-tight text-black dark:text-white">
                Question List
              </h1>
            </div>
          </div>

          <div className="grid gap-3">
          {Object.entries(grouped).map(([type, rows], sectionIndex) => {
            const sectionName = String.fromCharCode(65 + sectionIndex);
            return (
            <section
              key={type}
              className="overflow-hidden border border-black/10 bg-white dark:border-white/10 dark:bg-black"
            >
              <div className="grid grid-cols-[2rem_minmax(0,1fr)_1rem_6rem] items-center gap-3 border-b border-black/10 bg-black/[0.025] px-3 py-2 dark:border-white/10 dark:bg-white/[0.025]">
                <div className="grid h-8 w-8 place-items-center border border-black/10 bg-white font-mono text-sm font-bold uppercase tracking-[0.18em] text-black dark:border-white/10 dark:bg-black dark:text-white">
                  {sectionName}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-gray-700 dark:text-gray-200">
                    {type}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-gray-500 dark:text-gray-400">
                    {rows.length} question{rows.length === 1 ? "" : "s"}
                  </p>
                </div>
                <span />
                <span />
              </div>

              <div className="divide-y divide-black/10 dark:divide-white/10">
                {rows.map(({ question, index }, localIndex) => {
                  const isAnswered = answered.has(question.aqId);
                  const isCurrent = false;
                  return (
                    <div
                      key={question.aqId}
                      role="button"
                      tabIndex={0}
                      onClick={() => onNavigate(index)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onNavigate(index);
                        }
                      }}
                      className={`grid min-h-11 grid-cols-[2rem_minmax(0,1fr)_1rem_6rem] items-center gap-3 px-3 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 ${
                        isCurrent
                          ? "bg-black text-white dark:bg-white dark:text-black"
                          : "bg-white text-black hover:bg-black/[0.025] dark:bg-black dark:text-white dark:hover:bg-white/[0.025]"
                      }`}
                    >
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center border bg-black/[0.02] font-mono text-xs font-bold dark:bg-white/[0.025] ${
                          isCurrent
                            ? "border-white/30 dark:border-black/20"
                            : "border-black/10 dark:border-white/10"
                        }`}
                      >
                        {localIndex + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-gray-900 dark:text-gray-100">
                          {question.title || `Question ${index + 1}`}
                        </span>
                      </span>
                      <span className="grid h-full place-items-center">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isAnswered ? "bg-emerald-500" : "bg-gray-300 dark:bg-white/20"
                          }`}
                        />
                      </span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onNavigate(index);
                        }}
                        className={`h-7 w-24 justify-self-end border px-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                          isCurrent
                            ? "border-white/30 text-white hover:bg-white/10 dark:border-black/20 dark:text-black dark:hover:bg-black/10"
                            : "border-black/10 text-gray-700 hover:border-black/25 hover:text-black dark:border-white/10 dark:text-gray-200 dark:hover:border-white/25 dark:hover:text-white"
                        }`}
                      >
                        {isAnswered ? "Modify" : "Attempt"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          );
          })}
        </div>

        </section>

        <aside className="flex min-h-0 flex-col bg-white p-4 dark:bg-black">
          <div className="border border-black/10 p-3 dark:border-white/10">
            <div className="text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-600 dark:text-gray-300">
                Stats
              </p>
              <p className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-700 dark:text-gray-200">
                {completionPercent}% Complete
              </p>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-xs">
              <Stat label="Total" value={questions.length} />
              <Stat label="Attempted" value={answeredCount} />
              <Stat label="Left" value={remainingCount} />
            </div>
            <div className="mt-3 h-1.5 border border-black/10 bg-black/[0.025] dark:border-white/10 dark:bg-white/[0.035]">
              <div
                className="h-full bg-black transition-[width] dark:bg-white"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
          <div className="mt-auto border-t border-black/[0.06] pt-4 dark:border-white/[0.06]">
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="w-full border border-black bg-black px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-gray-800 disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-100"
          >
            {submitting ? "Submitting" : "End Exam"}
          </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-black/[0.06] p-2 text-center dark:border-white/[0.06]">
      <p className="text-[10px] uppercase tracking-[0.16em] text-gray-600 dark:text-gray-300">{label}</p>
      <p className="mt-1 text-lg font-bold text-black dark:text-white">{value}</p>
    </div>
  );
}
