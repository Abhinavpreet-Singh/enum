"use client";

import { ChevronRight, Code2, ListChecks, Lightbulb, TriangleAlert } from "lucide-react";

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
  questions: LinuxQuestion[];
  activeQuestionId: string | null;
  onSelectQuestion: (questionId: string) => void;
}

const difficultyStyle: Record<string, string> = {
  easy: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
  medium: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  hard: "text-red-400 border-red-400/30 bg-red-400/10",
};

function formatExampleInput(example: LinuxExample) {
  return example.command || example.input || "";
}

export default function QuestionPanel({
  questions,
  activeQuestionId,
  onSelectQuestion,
}: QuestionPanelProps) {
  const activeQuestion =
    questions.find((question) => question.id === activeQuestionId) ??
    questions[0] ??
    null;

  if (!activeQuestion) {
    return (
      <div className="h-full flex items-center justify-center border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a]">
        <p className="font-mono text-sm text-gray-500">No Linux questions found.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] overflow-hidden">
      <div className="border-b border-gray-200 dark:border-white/10 px-4 py-3 space-y-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.32em] text-gray-400 uppercase">
            Linux Arena
          </p>
          <h1 className="mt-1 text-lg font-semibold text-black dark:text-white tracking-tight">
            {activeQuestion.title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`px-2.5 py-1 border font-mono text-[10px] tracking-wide uppercase ${difficultyStyle[activeQuestion.difficulty.toLowerCase()] || "text-gray-400 border-gray-300"}`}
          >
            {activeQuestion.difficulty}
          </span>
          <span className="px-2.5 py-1 border border-gray-200 dark:border-white/10 font-mono text-[10px] tracking-wide uppercase text-gray-500 dark:text-gray-400">
            {activeQuestion.language}
          </span>
          <span className="ml-auto font-mono text-[10px] text-gray-400">
            {questions.length} questions
          </span>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 dark-scrollbar">
          {questions.map((question, index) => {
            const isActive = question.id === activeQuestion.id;
            return (
              <button
                key={question.id}
                onClick={() => onSelectQuestion(question.id)}
                className={`flex items-center gap-2 shrink-0 px-3 py-2 border font-mono text-[10px] tracking-[0.14em] uppercase transition-colors ${
                  isActive
                    ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black"
                    : "border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-white/30 hover:text-black dark:hover:text-white"
                }`}
              >
                <span className="text-[9px] opacity-60">0{index + 1}</span>
                {question.slug.replace(/-/g, " ")}
              </button>
            );
          })}
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
            {activeQuestion.description}
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
            {activeQuestion.constraints.length > 0 ? (
              activeQuestion.constraints.map((constraint) => (
                <li key={constraint} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
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
            <TriangleAlert className="w-4 h-4 text-gray-500" />
            <h2 className="font-mono text-[10px] tracking-[0.28em] text-gray-400 uppercase">
              Examples
            </h2>
          </div>
          <div className="space-y-3">
            {activeQuestion.examples.length > 0 ? (
              activeQuestion.examples.map((example, index) => (
                <div key={`${activeQuestion.id}-example-${index}`} className="border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3">
                  <p className="font-mono text-[10px] tracking-[0.24em] text-gray-400 uppercase mb-2">
                    Command
                  </p>
                  <pre className="text-xs font-mono text-black dark:text-white whitespace-pre-wrap leading-relaxed">
                    {formatExampleInput(example)}
                  </pre>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="font-mono text-[10px] tracking-[0.24em] text-gray-400 uppercase mb-1">
                        Output
                      </p>
                      <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {example.output || ""}
                      </pre>
                    </div>
                    {example.explanation ? (
                      <div>
                        <p className="font-mono text-[10px] tracking-[0.24em] text-gray-400 uppercase mb-1">
                          Explanation
                        </p>
                        <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                          {example.explanation}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No examples available.</p>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-gray-500" />
            <h2 className="font-mono text-[10px] tracking-[0.28em] text-gray-400 uppercase">
              Hints
            </h2>
          </div>
          <div className="space-y-2">
            {activeQuestion.hints.length > 0 ? (
              activeQuestion.hints.map((hint) => (
                <div key={hint} className="border border-gray-200 dark:border-white/10 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-[#101010]">
                  {hint}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No hints provided.</p>
            )}
          </div>
        </section>

        <div className="border border-gray-200 dark:border-white/10 bg-white dark:bg-[#101010] px-3 py-2 text-xs font-mono text-gray-500 dark:text-gray-400 leading-relaxed">
          <span className="text-black dark:text-white">Starter:</span> the editor loads the template automatically. Use the Run button to execute your Bash command inside the Docker sandbox.
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400 uppercase tracking-[0.28em]">
          <ChevronRight className="w-3 h-3" />
          Match stdout exactly to pass the submission check.
        </div>
      </div>
    </div>
  );
}