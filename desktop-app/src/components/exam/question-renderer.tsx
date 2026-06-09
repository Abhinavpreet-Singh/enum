"use client";

import type { ExamQuestion, Answer } from "@/types";
import MCQQuestion from "./mcq-question";
import MSQQuestion from "./msq-question";
import NumericalQuestion from "./numerical-question";
import CodingQuestion from "./coding-question";

interface Props {
  question: ExamQuestion;
  questionNumber: number;
  answer: Answer | undefined;
  onAnswer: (value: unknown) => void;
}

export default function QuestionRenderer({
  question,
  questionNumber,
  answer,
  onAnswer,
}: Props) {
  return (
    <div className="flex flex-col gap-5">
      {/* Question header */}
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#0a0a0a] text-xs font-bold text-white">
          {questionNumber}
        </span>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="rounded border border-black/10 px-2 py-0.5 text-xs text-gray-500 uppercase tracking-wider">
              {question.type}
            </span>
            {question.difficulty && (
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  question.difficulty === "easy"
                    ? "text-green-700 bg-green-100"
                    : question.difficulty === "hard"
                    ? "text-red-700 bg-red-100"
                    : "text-amber-700 bg-amber-100"
                }`}
              >
                {question.difficulty}
              </span>
            )}
            <span className="ml-auto text-xs text-gray-400">{question.points} pt{question.points !== 1 ? "s" : ""}</span>
          </div>

          {question.title && (
            <h2 className="text-base font-semibold text-[#0a0a0a] mb-1">{question.title}</h2>
          )}
          {question.description && (
            <div className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
              {question.description}
            </div>
          )}
        </div>
      </div>

      {/* Question body */}
      <div className="pl-9">
        {(question.type === "mcq") && (
          <MCQQuestion question={question} answer={answer} onAnswer={onAnswer} />
        )}
        {(question.type === "msq") && (
          <MSQQuestion question={question} answer={answer} onAnswer={(v) => onAnswer(v)} />
        )}
        {(question.type === "numerical") && (
          <NumericalQuestion question={question} answer={answer} onAnswer={onAnswer} />
        )}
        {(question.type === "coding" || question.type === "sql" || question.type === "linux") && (
          <CodingQuestion
            question={question}
            answer={answer}
            language={
              question.type === "sql"
                ? "sql"
                : question.type === "linux"
                ? "bash"
                : "python"
            }
            onAnswer={onAnswer}
          />
        )}
        {(question.type === "system_design" || question.type === "incident" || question.type === "simulation") && (
          <div className="rounded-lg border border-black/10 bg-gray-50 p-4 text-sm text-gray-500">
            <p>
              This is a <span className="text-[#0a0a0a] font-medium">{question.type.replace("_", " ")}</span> question.
              Open the full environment to complete it.
            </p>
            <a
              href={`${process.env.NEXT_PUBLIC_WEB_URL || "https://enum.live"}/exam/${question.simulationId}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block rounded-lg border border-[#0a0a0a] px-4 py-2 text-xs font-medium text-[#0a0a0a] transition-all hover:bg-[#0a0a0a] hover:text-white"
            >
              Open in Browser →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
