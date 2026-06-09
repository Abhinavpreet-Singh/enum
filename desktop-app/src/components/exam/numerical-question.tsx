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
        className="w-full max-w-xs rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-white/30 focus:bg-white/10 transition-all font-mono"
      />
    </div>
  );
}
