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
  const grouped = questions.reduce<Record<string, Array<{ q: ExamQuestion; idx: number }>>>(
    (acc, q, idx) => {
      const key = q.type.replace("_", " ").toUpperCase();
      acc[key] = acc[key] ?? [];
      acc[key].push({ q, idx });
      return acc;
    },
    {},
  );

  return (
    <div className="grid justify-items-center gap-4 py-4">
      {Object.entries(grouped).map(([type, rows], sectionIndex) => (
        <section key={type} className="grid justify-items-center gap-2">
          <p
            className="w-9 border border-black/[0.06] bg-black/[0.025] py-1 text-center font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-black dark:border-white/[0.06] dark:bg-white/[0.035] dark:text-white"
            title={`Section ${String.fromCharCode(65 + sectionIndex)} · ${type}`}
          >
            {String.fromCharCode(65 + sectionIndex)}
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            {rows.map(({ q, idx }, localIdx) => {
              const answered = answers.some((a) => a.aqId === q.aqId);
              const isCurrent = idx === currentIndex;

              return (
                <button
                  key={q.aqId}
                  onClick={() => onNavigate(idx)}
                  title={`${type} · ${q.title ?? `Question ${idx + 1}`}`}
                  className={`group relative grid h-9 w-9 place-items-center border font-mono text-xs font-bold transition-colors ${
                    isCurrent
                      ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                      : answered
                      ? "border-black/10 bg-black/[0.035] text-black hover:border-black/20 dark:border-white/10 dark:bg-white/[0.045] dark:text-white dark:hover:border-white/20"
                      : "border-black/[0.06] bg-transparent text-gray-400 hover:border-black/20 hover:text-black dark:border-white/[0.06] dark:hover:border-white/20 dark:hover:text-white"
                  }`}
                >
                  <span
                    className={`absolute h-1.5 w-1.5 translate-x-2.5 translate-y-2.5 rounded-full ${
                      answered ? "bg-emerald-500" : "bg-gray-300 dark:bg-white/20"
                    }`}
                  />
                  {localIdx + 1}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
