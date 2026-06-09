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
    <div className="flex flex-wrap gap-1.5 p-3">
      {questions.map((q, idx) => {
        const answered = answers.some((a) => a.aqId === q.aqId);
        const isCurrent = idx === currentIndex;

        return (
          <button
            key={q.aqId}
            onClick={() => onNavigate(idx)}
            title={q.title ?? `Question ${idx + 1}`}
            className={`h-8 w-8 rounded text-xs font-semibold transition-all ${
              isCurrent
                ? "bg-white text-black"
                : answered
                ? "bg-white/20 text-white border border-white/30"
                : "bg-white/5 text-gray-500 border border-white/10 hover:border-white/30 hover:text-gray-300"
            }`}
          >
            {idx + 1}
          </button>
        );
      })}
    </div>
  );
}
