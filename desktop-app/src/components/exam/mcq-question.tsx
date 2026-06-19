"use client";

import type { ExamQuestion, Answer } from "@/types";

interface Props {
  question: ExamQuestion;
  answer: Answer | undefined;
  onAnswer: (value: unknown) => void;
  onSubmit: () => void;
}

export default function MCQQuestion({ question, answer, onAnswer, onSubmit }: Props) {
  const selected = answer?.value as number | undefined;
  const opts = question.options ?? [];

  return (
    <div className="flex min-h-full flex-col">
      <div className="space-y-3">
      {opts.map((opt, idx) => (
        <button
          key={idx}
          onClick={() => onAnswer(idx)}
          className={`flex w-full items-center gap-3 rounded border px-4 py-4 text-left text-sm transition-colors ${
            selected === idx
              ? "border-black bg-black text-white shadow-sm dark:border-white dark:bg-white dark:text-black"
              : "border-black/10 bg-black/[0.03] text-gray-700 hover:border-black/30 hover:bg-black/[0.06] hover:text-black dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:border-white/30 dark:hover:bg-white/[0.06] dark:hover:text-white"
          }`}
        >
          <span
            className={`grid h-8 w-8 shrink-0 place-items-center rounded border font-mono text-xs font-semibold ${
              selected === idx
                ? "border-white bg-white text-black dark:border-black dark:bg-black dark:text-white"
                : "border-black/10 text-gray-500 dark:border-white/10"
            }`}
          >
            {String.fromCharCode(65 + idx)}
          </span>
          <span>{opt.text}</span>
        </button>
      ))}
      </div>

      <div className="mt-auto border-t border-black/10 pt-4 dark:border-white/10">
        <button
          type="button"
          onClick={onSubmit}
          disabled={selected === undefined}
          className="w-full border border-black bg-black px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-gray-800 disabled:opacity-40 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-100"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
