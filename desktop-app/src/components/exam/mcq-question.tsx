"use client";

import type { ExamQuestion, Answer } from "@/types";

interface Props {
  question: ExamQuestion;
  answer: Answer | undefined;
  onAnswer: (value: unknown) => void;
}

export default function MCQQuestion({ question, answer, onAnswer }: Props) {
  const selected = answer?.value as number | undefined;
  const opts = question.options ?? [];

  return (
    <div className="space-y-3">
      {opts.map((opt, idx) => (
        <button
          key={idx}
          onClick={() => onAnswer(idx)}
          className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-all ${
            selected === idx
              ? "border-[#0a0a0a] bg-[#0a0a0a]/5 text-[#0a0a0a] shadow-sm"
              : "border-black/10 bg-white text-gray-700 hover:border-black/30 hover:bg-gray-50"
          }`}
        >
          <span className="mr-3 font-mono text-xs text-gray-400">
            {String.fromCharCode(65 + idx)}.
          </span>
          {opt.text}
        </button>
      ))}
    </div>
  );
}
