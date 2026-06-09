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
    setAssessment,
  } = useExamStore();

  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [questionsError, setQuestionsError] = useState("");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settings = assessment?.settings;

  // ─── Guard ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!assessment || !attemptId) {
      router.replace("/login");
    }
  }, [assessment, attemptId, router]);

  // ─── Load / refresh questions ─────────────────────────────────────────────
  useEffect(() => {
    if (!assessment || !attemptId) return;

    let cancelled = false;
    setLoadingQuestions(true);
    setQuestionsError("");

    (async () => {
      try {
        if (questions.length > 0) return;
        const { data } = await desktopApi.getQuestions();
        if (cancelled) return;
        if (data.data.questions.length > 0) {
          setAssessment(data.data.assessment, data.data.questions);
        } else {
          setQuestions([]);
        }
      } catch {
        if (!cancelled) {
          setQuestionsError("Could not load exam questions. Please try again.");
        }
      } finally {
        if (!cancelled) setLoadingQuestions(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assessment, attemptId, questions.length, setAssessment, setQuestions]);

  // ─── Security engine ──────────────────────────────────────────────────────
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
    if (settings) {
      installKeyboardBlocker(settings);
    }
    installContextMenuBlocker();

    return () => teardownSecurity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, attemptId]);

  // ─── Violation reporter init ──────────────────────────────────────────────
  useEffect(() => {
    if (!attemptId) return;
    initViolationReporter(attemptId);
    return () => stopViolationReporter();
  }, [attemptId]);

  // ─── Heartbeat ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!attemptId) return;
    startHeartbeat(attemptId, () => ({
      timeRemainingSeconds: useExamStore.getState().timeRemainingSeconds,
      currentQuestionIndex: useExamStore.getState().currentQuestionIndex,
    }));
    return () => stopHeartbeat();
  }, [attemptId]);

  // ─── Autosave ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!attemptId) return;
    startAutosave(attemptId, () => useExamStore.getState().answers);
    return () => stopAutosave();
  }, [attemptId]);

  // ─── Timer ────────────────────────────────────────────────────────────────
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

  // ─── Answer handler ───────────────────────────────────────────────────────
  const handleAnswer = useCallback(
    (value: unknown) => {
      const q = questions[currentQuestionIndex];
      if (!q) return;
      saveAnswer({ aqId: q.aqId, value, savedAt: new Date().toISOString() });
    },
    [questions, currentQuestionIndex, saveAnswer],
  );

  // ─── Submission ───────────────────────────────────────────────────────────
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

  // ─── Render ───────────────────────────────────────────────────────────────
  if (!assessment || !attemptId) return null;

  if (loadingQuestions) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <p className="text-sm text-gray-400">Loading exam questions…</p>
      </div>
    );
  }

  if (questionsError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white">
        <p className="text-sm text-red-400">{questionsError}</p>
        <button
          onClick={() => router.replace("/login")}
          className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:border-white/30"
        >
          Back to login
        </button>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white">
        <h1 className="text-xl font-bold">{assessment.title}</h1>
        <p className="max-w-md text-sm text-gray-400">
          This assessment has no questions yet. Ask your test administrator to add
          questions from the dashboard, then log in again.
        </p>
        <button
          onClick={() => router.replace("/login")}
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-100"
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
    <div className="flex h-screen flex-col bg-black text-white overflow-hidden">
      {/* ── Top Bar ── */}
      <div
        className="flex h-10 shrink-0 items-center gap-3 border-b border-white/10 px-4"
        data-tauri-drag-region
      >
        <span className="text-xs font-black tracking-widest text-white/40 uppercase">
          enum
        </span>
        <span className="text-xs text-white/30 flex-1 truncate">{assessment.title}</span>

        <div className="flex items-center gap-2">
          <ViolationBadge count={violationCount} level={suspicionLevel} />
          <ExamTimer seconds={timeRemainingSeconds} />
          <button
            onClick={() => setShowConfirm(true)}
            disabled={submitting}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black transition-all hover:bg-gray-200 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: Question Navigator ── */}
        <div className="w-52 shrink-0 border-r border-white/10 overflow-y-auto">
          <div className="p-3 border-b border-white/10">
            <p className="text-xs text-gray-500">
              {answeredCount}/{totalQ} answered
            </p>
            <div className="mt-1.5 h-1 w-full rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${(answeredCount / totalQ) * 100}%` }}
              />
            </div>
          </div>
          <QuestionNavigator
            questions={questions}
            answers={answers}
            currentIndex={currentQuestionIndex}
            onNavigate={setCurrentQuestion}
          />
        </div>

        {/* ── Main: Question ── */}
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

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-400 transition-all hover:border-white/30 hover:text-white disabled:opacity-30"
            >
              ← Previous
            </button>

            <span className="text-xs text-gray-600">
              {currentQuestionIndex + 1} / {totalQ}
            </span>

            <button
              onClick={() =>
                setCurrentQuestion(Math.min(totalQ - 1, currentQuestionIndex + 1))
              }
              disabled={currentQuestionIndex === totalQ - 1}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-400 transition-all hover:border-white/30 hover:text-white disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* ── Submit Confirmation ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-zinc-900 p-6">
            <h3 className="text-lg font-bold text-white">Submit Exam?</h3>
            <p className="mt-2 text-sm text-gray-400">
              You have answered{" "}
              <span className="text-white font-medium">{answeredCount}</span> of{" "}
              <span className="text-white font-medium">{totalQ}</span> questions. This
              cannot be undone.
            </p>
            {totalQ - answeredCount > 0 && (
              <p className="mt-1 text-xs text-yellow-400">
                ⚠ {totalQ - answeredCount} question{totalQ - answeredCount > 1 ? "s" : ""}{" "}
                unanswered.
              </p>
            )}
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm text-gray-400 transition-all hover:border-white/30 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  submitExam("manual");
                }}
                disabled={submitting}
                className="flex-1 rounded-lg bg-white py-2.5 text-sm font-semibold text-black transition-all hover:bg-gray-100 disabled:opacity-50"
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
