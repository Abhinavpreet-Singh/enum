"use client";

import type { ExamQuestion, Answer } from "@/types";

interface Props {
  question?: ExamQuestion;
  answer: Answer | undefined;
  onAnswer: (value: string) => void;
}

export default function NumericalQuestion({ answer, onAnswer }: Props) {
  const value = (answer?.value as string) ?? "";

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Enter a numerical value.</p>
      <input
        type="number"
        value={value}
        onChange={(e) => onAnswer(e.target.value)}
        placeholder="Your answer…"
        className="w-full max-w-xs rounded-lg border border-black/12 bg-white px-4 py-3 text-sm text-[#0a0a0a] placeholder-gray-400 outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-black/10 transition-all font-mono"
      />
    </div>
  );
}
