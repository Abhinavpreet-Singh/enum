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
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-white/10 text-xs font-bold text-white">
          {questionNumber}
        </span>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="rounded border border-white/10 px-2 py-0.5 text-xs text-gray-400 uppercase tracking-wider">
              {question.type}
            </span>
            {question.difficulty && (
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  question.difficulty === "easy"
                    ? "text-green-400 bg-green-400/10"
                    : question.difficulty === "hard"
                    ? "text-red-400 bg-red-400/10"
                    : "text-yellow-400 bg-yellow-400/10"
                }`}
              >
                {question.difficulty}
              </span>
            )}
            <span className="ml-auto text-xs text-gray-500">{question.points} pt{question.points !== 1 ? "s" : ""}</span>
          </div>

          {question.title && (
            <h2 className="text-base font-semibold text-white mb-1">{question.title}</h2>
          )}
          {question.description && (
            <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
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
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-gray-400">
            <p>
              This is a <span className="text-white font-medium">{question.type.replace("_", " ")}</span> question.
              Open the full environment to complete it.
            </p>
            <a
              href={`${process.env.NEXT_PUBLIC_WEB_URL || "https://enum.live"}/exam/${question.simulationId}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block rounded-lg border border-white/20 px-4 py-2 text-xs text-white transition-all hover:bg-white/10"
            >
              Open in Browser →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
