"use client";

import type { ExamQuestion, Answer } from "@/types";

interface Props {
  question: ExamQuestion;
  answer: Answer | undefined;
  onAnswer: (value: unknown) => void;
  onSubmit: () => void;
}

export default function MCQQuestion({ question, answer, onAnswer, onSubmit }: Props) {
  const selected = typeof answer?.value === "number" ? answer.value : undefined;
  const opts = question.options ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
      {opts.map((opt, idx) => (
        <button
          key={idx}
          onClick={() => onAnswer(idx)}
          className="flex w-full items-center gap-3 rounded border border-black/[0.06] bg-black/[0.025] px-4 py-4 text-left text-sm text-gray-900 transition-colors hover:border-black/15 hover:bg-black/[0.045] hover:text-black dark:border-white/[0.06] dark:bg-white/[0.025] dark:text-gray-100 dark:hover:border-white/15 dark:hover:bg-white/[0.045] dark:hover:text-white"
        >
          <span
            className={`grid h-8 w-8 shrink-0 place-items-center rounded border font-mono text-xs font-semibold ${
              selected === idx
                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                : "border-black/10 text-gray-700 dark:border-white/10 dark:text-gray-200"
            }`}
          >
            {String.fromCharCode(65 + idx)}
          </span>
          <span>{opt.text}</span>
        </button>
      ))}
      </div>

      <div className="grid h-10 shrink-0 grid-cols-2 items-start gap-4 border-t border-black/[0.06] px-3 pt-1 dark:border-white/[0.06]">
        <button
          type="button"
          onClick={() => onAnswer(null)}
          disabled={selected === undefined}
          className="h-7 w-44 justify-self-start border border-black/[0.08] bg-black/[0.025] px-4 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-700 transition-colors hover:border-black/20 hover:text-black disabled:opacity-35 dark:border-white/[0.08] dark:bg-white/[0.025] dark:text-gray-300 dark:hover:border-white/20 dark:hover:text-white"
        >
          Clear Selection
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={selected === undefined}
          className="h-7 w-44 justify-self-end border border-black bg-black px-4 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-gray-800 disabled:opacity-40 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-100"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
