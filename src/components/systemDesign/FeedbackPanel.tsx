"use client";

import React from "react";
import { CheckCircle, XCircle, Trophy } from "lucide-react";
import type { EvaluationResult } from "@/systemDesign";

interface FeedbackPanelProps {
  result: EvaluationResult | null;
  onClose: () => void;
}

export default function FeedbackPanel({ result, onClose }: FeedbackPanelProps) {
  if (!result) return null;

  const pct = Math.round((result.score / result.maxScore) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div
          className={`px-6 py-5 ${
            pct >= 80
              ? "bg-green-500"
              : pct >= 50
                ? "bg-yellow-500"
                : "bg-red-500"
          } text-white`}
        >
          <div className="flex items-center gap-3">
            <Trophy size={28} />
            <div>
              <h2 className="text-xl font-bold">Evaluation Result</h2>
              <p className="text-sm opacity-90">
                Score: {result.score} / {result.maxScore} ({pct}%)
              </p>
            </div>
          </div>
        </div>

        {/* Feedback items */}
        <div className="px-6 py-4 max-h-80 overflow-y-auto space-y-3">
          {result.feedback.map((item, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 p-3 rounded-lg ${
                item.passed
                  ? "bg-green-50 dark:bg-green-900/20"
                  : "bg-red-50 dark:bg-red-900/20"
              }`}
            >
              {item.passed ? (
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p
                  className={`text-sm font-medium ${
                    item.passed
                      ? "text-green-700 dark:text-green-300"
                      : "text-red-700 dark:text-red-300"
                  }`}
                >
                  {item.rule}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  {item.message}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Close */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
