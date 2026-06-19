"use client";

import type { ExamQuestion, Answer } from "@/types";

interface Props {
  question: ExamQuestion;
  answer: Answer | undefined;
  onAnswer: (value: number[]) => void;
}

export default function MSQQuestion({ question, answer, onAnswer }: Props) {
  const selected: number[] = Array.isArray(answer?.value)
    ? (answer!.value as number[])
    : [];
  const opts = question.options ?? [];

  function toggle(idx: number) {
    const next = selected.includes(idx)
      ? selected.filter((i) => i !== idx)
      : [...selected, idx];
    onAnswer(next);
  }

  return (
    <div className="space-y-3">
      <p className="mb-1 font-mono text-xs uppercase tracking-[0.14em] text-gray-500">
        Select all that apply
      </p>
      {opts.map((opt, idx) => {
        const checked = selected.includes(idx);
        return (
          <button
            key={idx}
            onClick={() => toggle(idx)}
            className={`flex w-full items-center gap-3 rounded border px-4 py-4 text-left text-sm transition-colors ${
              checked
                ? "border-black bg-black text-white shadow-sm dark:border-white dark:bg-white dark:text-black"
                : "border-black/10 bg-black/[0.03] text-gray-700 hover:border-black/30 hover:bg-black/[0.06] hover:text-black dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:border-white/30 dark:hover:bg-white/[0.06] dark:hover:text-white"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                checked
                  ? "border-white bg-white text-black dark:border-black dark:bg-black dark:text-white"
                  : "border-black/20 dark:border-white/20"
              }`}
            >
              {checked && "✓"}
            </span>
            {opt.text}
          </button>
        );
      })}
    </div>
  );
}
