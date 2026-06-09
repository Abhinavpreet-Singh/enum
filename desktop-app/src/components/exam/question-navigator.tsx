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
            className={`h-8 w-8 rounded-lg text-xs font-semibold transition-all duration-150 ${
              isCurrent
                ? "bg-[#0a0a0a] text-white shadow-sm"
                : answered
                ? "border border-[#0a0a0a]/30 bg-[#0a0a0a]/8 text-[#0a0a0a] hover:bg-[#0a0a0a]/15"
                : "border border-black/10 bg-white text-gray-400 hover:border-black/30 hover:text-gray-700"
            }`}
          >
            {idx + 1}
          </button>
        );
      })}
    </div>
  );
}
