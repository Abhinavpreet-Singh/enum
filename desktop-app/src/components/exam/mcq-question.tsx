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
              ? "border-white bg-white/10 text-white"
              : "border-white/10 bg-white/3 text-gray-300 hover:border-white/30 hover:bg-white/8"
          }`}
        >
          <span className="mr-3 font-mono text-xs text-gray-500">
            {String.fromCharCode(65 + idx)}.
          </span>
          {opt.text}
        </button>
      ))}
    </div>
  );
}
