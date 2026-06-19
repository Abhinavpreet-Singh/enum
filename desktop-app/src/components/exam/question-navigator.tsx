"use client";

import type { Answer, ExamQuestion } from "@/types";

interface Props {
  questions: ExamQuestion[];
  answers: Answer[];
  currentIndex: number;
  onNavigate: (index: number) => void;
}

export default function QuestionNavigator({
  questions,
  answers,
  currentIndex,
  onNavigate,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-1.5 p-2">
      {questions.map((q, idx) => {
        const answered = answers.some((a) => a.aqId === q.aqId);
        const isCurrent = idx === currentIndex;

        return (
          <button
            key={q.aqId}
            onClick={() => onNavigate(idx)}
            title={q.title ?? `Question ${idx + 1}`}
            className={`group relative grid h-10 w-10 place-items-center rounded border font-mono text-xs font-bold transition-colors ${
              isCurrent
                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                : answered
                ? "border-black/20 bg-black/5 text-black hover:border-black/35 dark:border-white/20 dark:bg-white/[0.08] dark:text-white dark:hover:border-white/35"
                : "border-black/10 bg-transparent text-gray-400 hover:border-black/30 hover:text-black dark:border-white/10 dark:hover:border-white/25 dark:hover:text-white"
            }`}
          >
            <span
              className={`absolute h-1.5 w-1.5 translate-x-3 translate-y-3 rounded-full ${
                answered ? "bg-emerald-500" : "bg-gray-300 dark:bg-white/20"
              }`}
            />
            {idx + 1}
          </button>
        );
      })}
    </div>
  );
}
