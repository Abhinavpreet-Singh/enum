"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import type { ViolationType, ViolationSeverity } from "@/types";

export default function ExamPage() {
  const router = useRouter();

  const {
    assessment,
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
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [questionsError, setQuestionsError] = useState("");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settings = assessment?.settings;

  useEffect(() => {
    if (!assessment || !attemptId) {
      router.replace("/login");
    }
  }, [assessment, attemptId, router]);

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

  if (!assessment || !attemptId) return null;

  if (loadingQuestions) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="flex items-center gap-3 text-sm text-gray-500">
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
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        <p className="text-sm text-red-600">{questionsError}</p>
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
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        <h1 className="text-xl font-bold text-[#0a0a0a]">{assessment.title}</h1>
        <p className="max-w-md text-sm text-gray-500">
          This assessment has no questions yet. Ask your test administrator to add questions,
          then log in again.
        </p>
        <button
          onClick={() => router.replace("/login")}
          className="rounded-lg bg-[#0a0a0a] px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-[#1f1f1f] hover:-translate-y-0.5"
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
  const progressPct = totalQ > 0 ? (answeredCount / totalQ) * 100 : 0;

  return (
    <div className="flex h-screen flex-col bg-white text-[#0a0a0a] overflow-hidden">
      {/* ── Top Bar ── */}
      <div
        className="flex h-10 shrink-0 items-center gap-3 border-b border-black/8 bg-white/90 px-4 backdrop-blur-sm"
        data-tauri-drag-region
      >
        <span
          className="text-xs font-black text-gray-400 uppercase"
          style={{ letterSpacing: "0.2em" }}
        >
          enum
        </span>
        <span className="h-3.5 w-px bg-black/10" />
        <span className="flex-1 truncate text-xs text-gray-500">{assessment.title}</span>

        <div className="flex items-center gap-2">
          <ViolationBadge count={violationCount} level={suspicionLevel} />
          <ExamTimer seconds={timeRemainingSeconds} />
          <button
            onClick={() => setShowConfirm(true)}
            disabled={submitting}
            className="rounded-lg bg-[#0a0a0a] px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-[#1f1f1f] hover:-translate-y-px disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: Question Navigator ── */}
        <div className="flex w-52 shrink-0 flex-col border-r border-black/8 bg-gray-50/60 overflow-hidden">
          {/* Progress header */}
          <div className="border-b border-black/8 p-3">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>Progress</span>
              <span className="font-mono">{answeredCount}/{totalQ}</span>
            </div>
            <div className="h-0.5 w-full overflow-hidden rounded-full bg-black/10">
              <div
                className="h-full rounded-full bg-[#0a0a0a] transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Navigator grid */}
          <div className="flex-1 overflow-y-auto">
            <QuestionNavigator
              questions={questions}
              answers={answers}
              currentIndex={currentQuestionIndex}
              onNavigate={setCurrentQuestion}
            />
          </div>
        </div>

        {/* ── Main: Question Area ── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            {currentQ && (
              <QuestionRenderer
                key={currentQ.aqId}
                question={currentQ}
                questionNumber={currentQuestionIndex + 1}
                answer={currentAnswer}
                onAnswer={handleAnswer}
              />
            )}

            {/* Navigation buttons */}
            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={() => setCurrentQuestion(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
                className="rounded-lg border border-black/12 bg-white px-4 py-2 text-sm text-gray-600 transition-all hover:border-black/30 hover:text-[#0a0a0a] disabled:opacity-30"
              >
                ← Previous
              </button>

              <span
                className="text-xs text-gray-400"
                style={{ fontFamily: "var(--font-geist-mono), monospace" }}
              >
                {currentQuestionIndex + 1} / {totalQ}
              </span>

              <button
                onClick={() =>
                  setCurrentQuestion(Math.min(totalQ - 1, currentQuestionIndex + 1))
                }
                disabled={currentQuestionIndex === totalQ - 1}
                className="rounded-lg border border-black/12 bg-white px-4 py-2 text-sm text-gray-600 transition-all hover:border-black/30 hover:text-[#0a0a0a] disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Submit Confirmation Modal ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-6 shadow-2xl animate-fade-slide-up">
            <h3 className="text-base font-bold text-[#0a0a0a]">Submit Exam?</h3>
            <p className="mt-2 text-sm text-gray-600">
              You have answered{" "}
              <span className="font-semibold text-[#0a0a0a]">{answeredCount}</span> of{" "}
              <span className="font-semibold text-[#0a0a0a]">{totalQ}</span> questions.
              This action cannot be undone.
            </p>
            {totalQ - answeredCount > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-700">
                <span>⚠</span>
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
    </div>
  );
}
