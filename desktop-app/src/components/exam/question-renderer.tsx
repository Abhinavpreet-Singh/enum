"use client";

import { useState, type MouseEvent as ReactMouseEvent } from "react";
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
  onPrevious: () => void;
  onNext: () => void;
  canPrevious: boolean;
  canNext: boolean;
}

export default function QuestionRenderer({
  question,
  questionNumber,
  answer,
  onAnswer,
  onPrevious,
  onNext,
  canPrevious,
  canNext,
}: Props) {
  const [leftWidth, setLeftWidth] = useState(45);
  const language =
    question.type === "sql" ? "sql" : question.type === "linux" ? "bash" : "python";
  const isCodingLike =
    question.type === "coding" || question.type === "sql" || question.type === "linux";

  function startResize(e: ReactMouseEvent<HTMLDivElement>) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftWidth;
    const container = e.currentTarget.parentElement;
    if (!container) return;
    const containerWidth = container.getBoundingClientRect().width;

    const onMove = (event: globalThis.MouseEvent) => {
      const delta = ((event.clientX - startX) / containerWidth) * 100;
      setLeftWidth(Math.min(64, Math.max(28, startWidth + delta)));
    };
    const onUp = () => {
      document.body.classList.remove("resize-active");
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.body.classList.add("resize-active");
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <div className="min-w-[280px] max-w-[64%]" style={{ width: `${leftWidth}%` }}>
        <QuestionDetails
          question={question}
          questionNumber={questionNumber}
          onPrevious={onPrevious}
          onNext={onNext}
          canPrevious={canPrevious}
          canNext={canNext}
        />
      </div>
      <div
        onMouseDown={startResize}
        className="w-1 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-black/20 dark:hover:bg-white/20"
        title="Resize question and answer panes"
      />
      <div className="min-w-[360px] flex-1 overflow-hidden border-l border-black/10 bg-white dark:border-white/10 dark:bg-black">
        {isCodingLike ? (
        <CodingQuestion
          question={question}
          answer={answer}
          language={language}
          onAnswer={onAnswer}
        />
        ) : (
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="shrink-0 border-b border-black/10 px-5 py-4 dark:border-white/10">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-400">
                Answer
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {question.type === "mcq" && (
                <MCQQuestion question={question} answer={answer} onAnswer={onAnswer} onSubmit={onNext} />
              )}
              {question.type === "msq" && (
                <MSQQuestion question={question} answer={answer} onAnswer={(v) => onAnswer(v)} />
              )}
              {question.type === "numerical" && (
                <NumericalQuestion question={question} answer={answer} onAnswer={onAnswer} />
              )}
              {(question.type === "system_design" ||
                question.type === "incident" ||
                question.type === "simulation") && (
                <div className="border border-black/10 bg-black/[0.03] p-4 text-sm text-gray-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-400">
                  <p>
                    This is a{" "}
                    <span className="font-medium text-black dark:text-white">
                      {question.type.replace("_", " ")}
                    </span>{" "}
                    question. Open the full environment to complete it.
                  </p>
                  <a
                    href={`${process.env.NEXT_PUBLIC_WEB_URL || "https://enum.live"}/exam/${question.simulationId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block border border-black/80 px-4 py-2 text-xs font-medium text-black transition-colors hover:bg-black hover:text-white dark:border-white/80 dark:text-white dark:hover:bg-white dark:hover:text-black"
                  >
                    Open in Browser →
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionDetails({
  question,
  questionNumber,
  onPrevious,
  onNext,
  canPrevious,
  canNext,
}: {
  question: ExamQuestion;
  questionNumber: number;
  onPrevious: () => void;
  onNext: () => void;
  canPrevious: boolean;
  canNext: boolean;
}) {
  return (
    <section
      className="flex h-full min-h-0 flex-col overflow-hidden border border-black/20 bg-white dark:border-white/25 dark:bg-black"
    >
      <div className="shrink-0 border-b border-black/10 p-4 dark:border-white/10">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded bg-black text-xs font-bold text-white dark:bg-white dark:text-black">
            {questionNumber}
          </span>
          <span className="rounded border border-black/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-gray-500 dark:border-white/10 dark:text-gray-400">
            {question.type.replace("_", " ")}
          </span>
          {question.difficulty && (
            <span
              className={`rounded px-2.5 py-1 text-[11px] font-semibold capitalize ${
                question.difficulty === "easy"
                  ? "bg-emerald-400/12 text-emerald-300"
                  : question.difficulty === "hard"
                  ? "bg-red-400/12 text-red-300"
                  : "bg-amber-400/12 text-amber-300"
              }`}
            >
              {question.difficulty}
            </span>
          )}
          <span className="ml-auto font-mono text-xs text-gray-500">
            {question.points} pt{question.points !== 1 ? "s" : ""}
          </span>
        </div>

        {question.title && (
          <h2 className="text-lg font-semibold tracking-tight text-black dark:text-white">
            {question.title}
          </h2>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {question.description ? (
          <div
            className="whitespace-pre-wrap text-sm leading-7 text-gray-700 dark:text-gray-300"
          >
            {question.description}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No additional instructions.</p>
        )}
      </div>
      <div className="flex h-12 shrink-0 items-center justify-between border-t border-black/10 px-3 dark:border-white/10">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!canPrevious}
          className="border border-black/10 bg-black/[0.03] px-3 py-1.5 text-xs text-gray-700 transition-colors hover:border-black/30 hover:text-black disabled:opacity-30 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:border-white/30 dark:hover:text-white"
        >
          ← Previous
        </button>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
          Question {questionNumber}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className="border border-black bg-black px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-30 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-100"
        >
          Next →
        </button>
      </div>
    </section>
  );
}
