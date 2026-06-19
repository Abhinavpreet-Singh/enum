"use client";
import { getMemoryToken } from "@/lib/tokenStore";

import { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import axios from "axios";
import { proxy } from "@/app/proxy";
import type {
  IncidentSimulation,
  IncidentSession,
  IncidentRootCauseOption,
} from "@/types/incident";
import { getHypothesisLabel } from "./incident-display";

interface DiagnosisPanelProps {
  incident: IncidentSimulation;
  session: IncidentSession;
  onDiagnosisSubmit: (correct: boolean, selectedId: string) => void;
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const shell =
  "rounded border border-gray-200 bg-gray-50/80 dark:border-white/10 dark:bg-white/[0.03]";

export default function DiagnosisPanel({
  incident,
  session,
  onDiagnosisSubmit,
}: DiagnosisPanelProps) {
  const [selectedId, setSelectedId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    hint?: string;
  } | null>(null);

  const options = incident.rootCauseOptions;

  const handleSubmit = async () => {
    if (!selectedId) return;

    try {
      setIsSubmitting(true);
      const token = getMemoryToken();

      const response = await axios.post(
        `${proxy}/api/v1/incidents/${incident.id}/session/${session.id}/diagnose`,
        { rootCauseId: selectedId },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const { correct, hint } = response.data.data;
      setFeedback({ correct, hint });
      onDiagnosisSubmit(correct, selectedId);
    } catch (err) {
      console.error("Error submitting diagnosis:", err);
      setFeedback({ correct: false, hint: "Could not submit — try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (session.selectedRootCauseId) {
    const selected = options.find((r) => r.id === session.selectedRootCauseId);
    const isCorrect = session.correctDiagnosis;
    const letter = options.findIndex((o) => o.id === selected?.id);

    return (
      <div className={`${shell} p-3`}>
        <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-gray-500">
          Committed hypothesis
        </p>
        <div
          className={`rounded border px-2.5 py-2 ${
            isCorrect
              ? "border-emerald-400/60 bg-emerald-50/80 dark:border-emerald-500/35 dark:bg-emerald-950/25"
              : "border-red-400/60 bg-red-50/80 dark:border-red-500/35 dark:bg-red-950/25"
          }`}
        >
          <div className="flex items-start gap-2">
            {isCorrect ? (
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            )}
            <div className="min-w-0">
              <p className="font-mono text-xs font-semibold text-black dark:text-white">
                {letter >= 0 ? LETTERS[letter] : "?"}.{" "}
                {selected ? getHypothesisLabel(selected) : ""}
              </p>
              {!isCorrect && selected?.hint && (
                <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                  {selected.hint}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${shell} p-3`}>
      <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-black dark:text-white">
        What failed?
      </p>
      <p className="mt-1 text-xs leading-snug text-gray-500 dark:text-gray-400">
        Pick the root cause that matches the logs and metrics.
      </p>

      <div
        className="mt-2.5 space-y-1.5"
        role="radiogroup"
        aria-label="Root cause hypothesis"
      >
        {options.map((option: IncidentRootCauseOption, index) => {
          const letter = LETTERS[index] ?? String(index + 1);
          const selected = selectedId === option.id;

          return (
            <label
              key={option.id}
              className={`flex cursor-pointer items-start gap-2.5 rounded border px-2.5 py-2 transition-colors ${
                selected
                  ? "border-black bg-white dark:border-white dark:bg-white/[0.06]"
                  : "border-gray-200 hover:border-gray-400 dark:border-white/10"
              }`}
            >
              <input
                type="radio"
                name="rootCause"
                value={option.id}
                checked={selected}
                onChange={(e) => setSelectedId(e.target.value)}
                className="sr-only"
                disabled={isSubmitting}
              />
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded font-mono text-xs font-bold ${
                  selected
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "border border-gray-300 text-gray-600 dark:border-white/20"
                }`}
              >
                {letter}
              </span>
              <span className="min-w-0 flex-1 font-mono text-xs leading-snug text-black dark:text-white">
                {getHypothesisLabel(option)}
              </span>
            </label>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!selectedId || isSubmitting}
        className="mt-3 w-full rounded bg-black py-2 font-mono text-xs font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
      >
        {isSubmitting ? "Committing…" : "Commit hypothesis"}
      </button>

      {feedback && !session.selectedRootCauseId && (
        <p
          className={`mt-2 text-xs ${
            feedback.correct
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-red-700 dark:text-red-300"
          }`}
        >
          {feedback.correct
            ? "Correct — run one remediation, then submit your report."
            : feedback.hint || "Try again after reviewing the evidence."}
        </p>
      )}
    </div>
  );
}
