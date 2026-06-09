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
                ? "border-[#0a0a0a] bg-[#0a0a0a]/5 text-[#0a0a0a] shadow-sm"
                : "border-black/10 bg-white text-gray-700 hover:border-black/30 hover:bg-gray-50"
            }`}
          >
            <span
              className={`h-4 w-4 rounded border shrink-0 flex items-center justify-center text-xs ${
                checked ? "border-[#0a0a0a] bg-[#0a0a0a] text-white" : "border-gray-300"
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
