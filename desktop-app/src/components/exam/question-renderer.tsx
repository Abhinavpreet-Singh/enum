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
        className="group relative w-2 shrink-0 cursor-col-resize bg-transparent"
        title="Resize question and answer panes"
      >
        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-black/15 transition-colors group-hover:bg-black/45 dark:bg-white/15 dark:group-hover:bg-white/45" />
        <span className="absolute left-1/2 top-1/2 h-16 w-1 -translate-x-1/2 -translate-y-1/2 bg-black/20 opacity-70 transition-all group-hover:w-1.5 group-hover:bg-black/55 group-hover:opacity-100 dark:bg-white/20 dark:group-hover:bg-white/55" />
      </div>
      <div className="min-w-[360px] flex-1 overflow-hidden border-l border-black/[0.06] bg-white dark:border-white/[0.06] dark:bg-black">
        {isCodingLike ? (
        <CodingQuestion
          question={question}
          answer={answer}
          language={language}
          onAnswer={onAnswer}
        />
        ) : (
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="flex h-12 shrink-0 items-center border-b border-black/[0.06] px-4 dark:border-white/[0.06]">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
                {question.type === "mcq" ? "Choose any one" : "Answer"}
              </p>
            </div>
            <div className={`min-h-0 flex-1 ${question.type === "mcq" ? "overflow-hidden" : "overflow-y-auto p-5"}`}>
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
      className="flex h-full min-h-0 flex-col overflow-hidden border border-black/[0.06] bg-white dark:border-white/[0.06] dark:bg-black"
    >
      <div className="flex h-12 shrink-0 items-center border-b border-black/[0.06] px-4 dark:border-white/[0.06]">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-7 w-7 place-items-center rounded bg-black text-xs font-bold text-white dark:bg-white dark:text-black">
            {questionNumber}
          </span>
          {question.title && (
            <h2 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight text-black dark:text-white">
              {question.title}
            </h2>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {question.description ? (
          <div
            className="whitespace-pre-wrap text-sm leading-7 text-gray-800 dark:text-gray-200"
          >
            {question.description}
          </div>
        ) : (
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No additional instructions.</p>
        )}
      </div>
      <div className="grid h-10 shrink-0 grid-cols-2 items-center gap-4 border-t border-black/[0.06] px-3 dark:border-white/[0.06]">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!canPrevious}
          className="h-7 w-44 justify-self-start border border-black/[0.08] bg-black/[0.025] px-4 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-700 transition-colors hover:border-black/20 hover:text-black disabled:opacity-30 dark:border-white/[0.08] dark:bg-white/[0.025] dark:text-gray-300 dark:hover:border-white/20 dark:hover:text-white"
        >
          ← Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className="h-7 w-44 justify-self-end border border-black bg-black px-4 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-gray-800 disabled:opacity-30 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-100"
        >
          Next →
        </button>
      </div>
    </section>
  );
}
