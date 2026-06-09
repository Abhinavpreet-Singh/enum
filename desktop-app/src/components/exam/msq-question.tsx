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
      <p className="text-xs text-gray-500 mb-1">Select all that apply.</p>
      {opts.map((opt, idx) => {
        const checked = selected.includes(idx);
        return (
          <button
            key={idx}
            onClick={() => toggle(idx)}
            className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-all flex items-center gap-3 ${
              checked
                ? "border-white bg-white/10 text-white"
                : "border-white/10 bg-white/3 text-gray-300 hover:border-white/30 hover:bg-white/8"
            }`}
          >
            <span
              className={`h-4 w-4 rounded border shrink-0 flex items-center justify-center text-xs ${
                checked ? "border-white bg-white text-black" : "border-gray-600"
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
