"use client";

import React from "react";
import { CheckCircle, XCircle, X, Award, Zap, Flame } from "lucide-react";
import type { EvaluationResult } from "@/systemDesign";

interface FeedbackPanelProps {
  result: EvaluationResult | null;
  onClose: () => void;
}

export default function FeedbackPanel({ result, onClose }: FeedbackPanelProps) {
  if (!result) return null;

  const pct = Math.round((result.score / result.maxScore) * 100);
  const passed = pct >= 80;
  const partial = pct >= 50;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-white dark:bg-[#111] border border-gray-200 dark:border-white/8 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 dark:border-white/6">
          <div className="flex items-center gap-2.5">
            <Award
              size={18}
              className={
                passed
                  ? "text-emerald-500"
                  : partial
                    ? "text-amber-400"
                    : "text-red-400"
              }
            />
            <div>
              <p className="font-mono text-[9px] tracking-[0.3em] text-gray-400 dark:text-gray-500 uppercase">
                Evaluation Result
              </p>
              <p className="text-sm font-bold text-black dark:text-white mt-0.5">
                {result.score} / {result.maxScore} pts
                <span
                  className={`ml-2 text-xs font-mono ${
                    passed
                      ? "text-emerald-500"
                      : partial
                        ? "text-amber-400"
                        : "text-red-400"
                  }`}
                >
                  ({pct}%)
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Score bar */}
        <div className="px-5 py-3 border-b border-gray-100 dark:border-white/6">
          <div className="h-1.5 bg-gray-100 dark:bg-white/8 w-full">
            <div
              className={`h-full transition-all duration-500 ${
                passed
                  ? "bg-emerald-500"
                  : partial
                    ? "bg-amber-400"
                    : "bg-red-400"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Feedback items */}
        <div className="max-h-72 overflow-y-auto px-5 py-3 space-y-1.5">
          {result.feedback.map((item, i) => (
            <div
              key={i}
              className={`flex items-start gap-2.5 px-3 py-2 border ${
                item.passed
                  ? "border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5"
                  : "border-red-400/20 bg-red-50/50 dark:bg-red-500/5"
              }`}
            >
              {item.passed ? (
                <CheckCircle
                  size={13}
                  className="text-emerald-500 shrink-0 mt-0.5"
                />
              ) : (
                <XCircle size={13} className="text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <p
                  className={`text-[11px] font-semibold ${
                    item.passed
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {item.rule}
                </p>
                <p className="text-[10px] font-mono text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                  {item.message}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-white/6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-wrap">
            {result.xpEarned !== undefined && result.xpEarned > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-mono font-semibold text-amber-500">
                <Zap size={11} className="shrink-0" />+{result.xpEarned} XP
                {result.totalXp !== undefined && (
                  <span className="text-gray-400 dark:text-gray-500 font-normal">
                    &nbsp;({result.totalXp} total)
                  </span>
                )}
              </span>
            )}
            {result.currentStreak !== undefined && result.currentStreak > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-mono font-semibold text-orange-500">
                <Flame size={11} className="shrink-0" />
                {result.currentStreak} day
                {result.currentStreak !== 1 ? "s" : ""} streak
              </span>
            )}
            {result.alreadyAwarded && (
              <p className="font-mono text-[10px] text-gray-500">
                XP already earned for this simulation.
              </p>
            )}
            {(!result.xpEarned || result.xpEarned === 0) &&
              !result.alreadyAwarded && (
                <p className="font-mono text-[10px] text-gray-400 dark:text-gray-500">
                  {partial
                    ? "Logged as attempt — XP only at 100% score."
                    : passed
                      ? "Excellent architecture!"
                      : "Review the requirements."}
                </p>
              )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-mono text-[11px] font-semibold tracking-wide bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shrink-0"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
