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
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-gray-500">
        Enter a numerical value
      </p>
      <input
        type="number"
        value={value}
        onChange={(e) => onAnswer(e.target.value)}
        placeholder="Your answer…"
        className="w-full max-w-sm rounded border border-black/10 bg-black/[0.03] px-4 py-4 font-mono text-sm text-black outline-none transition-colors placeholder:text-gray-400 focus:border-black/35 focus:ring-2 focus:ring-black/10 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-gray-600 dark:focus:border-white/35 dark:focus:ring-white/10"
      />
    </div>
  );
}
