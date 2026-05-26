"use client";

import { useState } from "react";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import axios from "axios";
import { proxy } from "@/app/proxy";
import type {
  IncidentSimulation,
  IncidentSession,
  IncidentRootCauseOption,
} from "@/types/incident";

interface DiagnosisPanelProps {
  incident: IncidentSimulation;
  session: IncidentSession;
  onDiagnosisSubmit: (correct: boolean, selectedId: string) => void;
}

export default function DiagnosisPanel({
  incident,
  session,
  onDiagnosisSubmit,
}: DiagnosisPanelProps) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    hint?: string;
  } | null>(null);

  const handleSubmit = async () => {
    if (!selectedId) return;

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("accessToken");

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
      setFeedback({ correct: false, hint: "Error submitting diagnosis" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (session.selectedRootCauseId) {
    const selected = incident.rootCauseOptions.find(
      (r) => r.id === session.selectedRootCauseId,
    );
    const isCorrect = session.correctDiagnosis;

    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-3">Your Diagnosis</h3>
        <div
          className={`p-3 rounded-lg border-2 ${
            isCorrect
              ? "bg-green-50 border-green-300"
              : "bg-red-50 border-red-300"
          }`}
        >
          <div className="flex items-start gap-3">
            {isCorrect ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p
                className={`font-semibold ${
                  isCorrect ? "text-green-900" : "text-red-900"
                }`}
              >
                {selected?.title}
              </p>
              <p
                className={`text-sm mt-1 ${
                  isCorrect ? "text-green-700" : "text-red-700"
                }`}
              >
                {isCorrect ? "✓ Correct diagnosis!" : "✗ Incorrect diagnosis"}
              </p>
              {!isCorrect && selected?.hint && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  {selected.hint}
                </div>
              )}
              <p className="text-sm mt-2 text-gray-600">
                {selected?.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <h3 className="font-semibold text-gray-900 mb-3">Root Cause Diagnosis</h3>
      <p className="text-sm text-gray-600 mb-3">
        Based on the metrics, logs, and timeline, what caused this incident?
      </p>

      <div className="space-y-2 mb-4">
        {incident.rootCauseOptions.map((option: IncidentRootCauseOption) => (
          <label
            key={option.id}
            className="flex items-start gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors"
          >
            <input
              type="radio"
              name="rootCause"
              value={option.id}
              checked={selectedId === option.id}
              onChange={(e) => setSelectedId(e.target.value)}
              className="mt-1"
              disabled={isSubmitting}
            />
            <div className="flex-1">
              <p className="font-medium text-gray-900">{option.title}</p>
              <p className="text-sm text-gray-600 mt-1">
                {option.description}
              </p>
            </div>
          </label>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!selectedId || isSubmitting}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
      >
        {isSubmitting ? "Submitting..." : "Submit Diagnosis"}
      </button>

      {feedback && (
        <div
          className={`mt-3 p-3 rounded-lg text-sm ${
            feedback.correct
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {feedback.correct
            ? "✓ Correct! You identified the root cause."
            : "✗ Incorrect. Try again or review the logs."}
          {feedback.hint && (
            <p className="mt-1 text-xs opacity-90">{feedback.hint}</p>
          )}
        </div>
      )}
    </div>
  );
}
