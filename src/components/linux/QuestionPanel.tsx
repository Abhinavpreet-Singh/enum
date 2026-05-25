"use client";

import { ChevronRight, Code2, ListChecks, Lightbulb } from "lucide-react";

export interface LinuxExample {
  input?: string;
  command?: string;
  output?: string;
  explanation?: string;
}

export interface LinuxQuestion {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  examples: LinuxExample[];
  starterCode: string;
  expectedOutput: string;
  constraints: string[];
  hints: string[];
  language: string;
}

interface QuestionPanelProps {
  question: LinuxQuestion | null;
}

const difficultyStyle: Record<string, string> = {
  easy: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
  medium: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  hard: "text-red-400 border-red-400/30 bg-red-400/10",
};

export default function QuestionPanel({ question }: QuestionPanelProps) {
  if (!question) {
    return (
      <div className="h-full flex items-center justify-center border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a]">
        <p className="font-mono text-sm text-gray-500">No questions found.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] overflow-hidden">
      <div className="border-b border-gray-200 dark:border-white/10 px-4 py-3 space-y-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.32em] text-gray-400 uppercase">
            Linux / Bash
          </p>
          <h1 className="mt-1 text-lg font-semibold text-black dark:text-white tracking-tight">
            {question.title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`px-2.5 py-1 border font-mono text-[10px] tracking-wide uppercase ${difficultyStyle[question.difficulty.toLowerCase()] || "text-gray-400 border-gray-300"}`}
          >
            {question.difficulty}
          </span>
          <span className="px-2.5 py-1 border border-gray-200 dark:border-white/10 font-mono text-[10px] tracking-wide uppercase text-gray-500 dark:text-gray-400">
            {question.language}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-4 space-y-5 dark-scrollbar">
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Code2 className="w-4 h-4 text-gray-500" />
            <h2 className="font-mono text-[10px] tracking-[0.28em] text-gray-400 uppercase">
              Problem
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-line">
            {question.description}
          </p>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-2">
            <ListChecks className="w-4 h-4 text-gray-500" />
            <h2 className="font-mono text-[10px] tracking-[0.28em] text-gray-400 uppercase">
              Constraints
            </h2>
          </div>
          <ul className="space-y-2">
            {question.constraints.length > 0 ? (
              question.constraints.map((constraint) => (
                <li
                  key={constraint}
                  className="flex gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <span className="text-gray-400 mt-0.5">•</span>
                  <span>{constraint}</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-gray-500">No constraints listed.</li>
            )}
          </ul>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-gray-500" />
            <h2 className="font-mono text-[10px] tracking-[0.28em] text-gray-400 uppercase">
              Hints
            </h2>
          </div>
          <div className="space-y-2">
            {question.hints.length > 0 ? (
              question.hints.map((hint) => (
                <div
                  key={hint}
                  className="border border-gray-200 dark:border-white/10 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-[#101010]"
                >
                  {hint}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No hints provided.</p>
            )}
          </div>
        </section>

        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400 uppercase tracking-[0.28em]">
          <ChevronRight className="w-3 h-3" />
          Match stdout exactly.
        </div>
      </div>
    </div>
  );
}
