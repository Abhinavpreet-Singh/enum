"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RotateCcw, Play, Send } from "lucide-react";
import axios from "axios";
import Link from "next/link";
import { proxy } from "@/app/proxy";
import QuestionPanel, { type LinuxQuestion } from "./QuestionPanel";
import MonacoCodeEditor from "./MonacoCodeEditor";
import OutputTerminal from "./OutputTerminal";

interface LinuxArenaPageProps {
  initialQuestionId?: string;
}

type ExecutionStatus = "idle" | "running" | "passed" | "failed" | "error";

interface RunResult {
  output: string;
  success: boolean;
}

function normalizeLines(value: string) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter(
      (line, index, array) => line.length > 0 || index < array.length - 1,
    );
}

export default function LinuxArenaPage({
  initialQuestionId,
}: LinuxArenaPageProps) {
  const [questions, setQuestions] = useState<LinuxQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    initialQuestionId ?? null,
  );
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<ExecutionStatus>("idle");
  const [outputLines, setOutputLines] = useState<string[]>([
    "Linux / Bash arena ready. Pick a question and run your Bash command.",
  ]);
  const [actualOutput, setActualOutput] = useState<string | null>(null);
  const [expectedOutput, setExpectedOutput] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(26);
  const [terminalHeight, setTerminalHeight] = useState(300);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingTerminal, setIsResizingTerminal] = useState(false);
  const [showTerminal, setShowTerminal] = useState(true);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      const response = await axios.get(`${proxy}/api/v1/simulations/linux`, {
        withCredentials: true,
      });
      const nextQuestions = (response.data?.data ?? []) as LinuxQuestion[];
      setQuestions(nextQuestions);

      const requested =
        nextQuestions.find(
          (question) =>
            question.id === initialQuestionId ||
            question.slug === initialQuestionId,
        ) ??
        nextQuestions[0] ??
        null;

      if (requested) {
        setSelectedQuestionId(requested.id);
        setCode(requested.starterCode || "");
        setExpectedOutput(requested.expectedOutput || "");
      }
      setLoading(false);
    };

    fetchQuestions().catch((err) => {
      console.error("Failed to fetch Linux questions:", err);
      setLoading(false);
    });
  }, [initialQuestionId]);

  useEffect(() => {
    if (!selectedQuestionId || questions.length === 0) return;
    const selected = questions.find(
      (question) => question.id === selectedQuestionId,
    );
    if (!selected) return;

    setCode(selected.starterCode || "");
    setExpectedOutput(selected.expectedOutput || "");
    setStatus("idle");
    setActualOutput(null);
    setOutputLines([
      `Selected: ${selected.title}`,
      "Use the editor to write a Bash command and press Run Code.",
    ]);
  }, [questions, selectedQuestionId]);

  const selectedQuestion = useMemo(
    () =>
      questions.find((question) => question.id === selectedQuestionId) ??
      questions[0] ??
      null,
    [questions, selectedQuestionId],
  );

  const handleRun = async () => {
    if (!selectedQuestion) return;

    setStatus("running");
    setOutputLines(["$ Running Bash command...", ""]);

    try {
      const response = await fetch(`${proxy}/api/v1/compiler/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "bash", code }),
      });

      const data = await response.json();
      const output = String(data.output ?? data.stdout ?? data.error ?? "");
      setActualOutput(output);
      const nextLines = normalizeLines(output);
      setOutputLines((prev) => [
        ...prev,
        ...(nextLines.length ? nextLines : ["(no output)"]),
      ]);
      setStatus("idle");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Execution failed";
      setActualOutput(message);
      setOutputLines((prev) => [...prev, `Error: ${message}`]);
      setStatus("error");
    }
  };

  const handleSubmit = async () => {
    if (!selectedQuestion) return;

    setSubmitting(true);
    setStatus("running");
    setOutputLines(["$ Submitting Bash solution...", ""]);

    try {
      const response = await axios.post(
        `${proxy}/api/v1/simulations/linux/submit`,
        {
          questionId: selectedQuestion.id,
          code,
          language: "bash",
        },
      );

      const result = response.data?.data as RunResult & {
        passed: boolean;
        verdict: string;
        expectedOutput?: string;
        normalizedOutput?: string;
        totalXp?: number;
      };

      setActualOutput(result?.output ?? null);
      setExpectedOutput(
        result?.expectedOutput ?? selectedQuestion.expectedOutput ?? null,
      );
      setOutputLines([
        `Submission ${result?.passed ? "passed" : "failed"}`,
        "",
        ...(result?.output ? normalizeLines(result.output) : ["(no output)"]),
      ]);
      setStatus(result?.passed ? "passed" : "failed");

      if (result?.passed && selectedQuestion) {
        localStorage.setItem("enum_linux_xp_awarded_" + selectedQuestion.id, "1");
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("userXpUpdated", {
              detail: { xp: result?.totalXp },
            }),
          );
        }
      }
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.message as string) || error.message
        : error instanceof Error
          ? error.message
          : "Submission failed";
      setStatus("error");
      setActualOutput(message);
      setOutputLines((prev) => [...prev, `Error: ${message}`]);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    if (!selectedQuestion) return;

    setCode(selectedQuestion.starterCode || "");
    setExpectedOutput(selectedQuestion.expectedOutput || "");
    setActualOutput(null);
    setStatus("idle");
    setOutputLines([
      "Editor reset to starter code.",
      "Use Run Code to test the current Bash command.",
    ]);
  };

  const handleLeftResizeMouseDown = (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    setIsResizingLeft(true);
    const startX = event.clientX;
    const startWidth = leftPanelWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const nextWidth = Math.min(Math.max(22, startWidth + deltaX / 16), 34);
      setLeftPanelWidth(nextWidth);
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleTerminalResizeMouseDown = (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    setIsResizingTerminal(true);
    const startY = event.clientY;
    const startHeight = terminalHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY;
      const nextHeight = Math.min(Math.max(200, startHeight + deltaY), 420);
      setTerminalHeight(nextHeight);
    };

    const handleMouseUp = () => {
      setIsResizingTerminal(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="flex items-center gap-2 font-mono text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading Linux questions...
        </div>
      </div>
    );
  }

  if (!selectedQuestion) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="text-center space-y-3">
          <p className="font-mono text-sm text-gray-500">
            No Linux questions available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white dark:bg-black overflow-hidden">
      <div className="h-full w-full p-4 lg:p-6 flex flex-col gap-4 overflow-hidden">
        <div className="flex items-center justify-between gap-3 shrink-0">
          <Link
            href="/dashboard/simulations"
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-white/10 font-mono text-xs tracking-wide text-black dark:text-white hover:border-gray-400 dark:hover:border-white/30 transition-colors shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Back
          </Link>

          <div className="min-w-0 flex-1 px-2">
            <p className="font-mono text-[10px] tracking-[0.32em] text-gray-400 uppercase">
              Linux / Bash Workspace
            </p>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-black dark:text-white truncate">
              Code Workspace
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowTerminal((v) => !v)}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-white/10 font-mono text-xs tracking-wide text-black dark:text-white hover:border-gray-400 dark:hover:border-white/30 transition-colors"
            >
              {showTerminal ? "Hide Console" : "Show Console"}
            </button>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-white/10 font-mono text-xs tracking-wide text-black dark:text-white hover:border-gray-400 dark:hover:border-white/30 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
            <button
              onClick={handleRun}
              disabled={status === "running" || submitting}
              className="inline-flex items-center gap-2 px-3 py-2 bg-black dark:bg-white text-white dark:text-black font-mono text-xs tracking-wide disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              <Play className="w-3.5 h-3.5" />
              Run Code
            </button>
            <button
              onClick={handleSubmit}
              disabled={status === "running" || submitting}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-white/10 font-mono text-xs tracking-wide text-black dark:text-white hover:border-gray-400 dark:hover:border-white/30 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Submit
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0 gap-0 overflow-hidden border border-gray-100 dark:border-white/8 bg-white dark:bg-[#0a0a0a] rounded-md">
          <div
            className="h-full min-h-0 overflow-hidden shrink-0"
            style={{ width: `${leftPanelWidth}%` }}
          >
            <QuestionPanel question={selectedQuestion} />
          </div>

          <div
            onMouseDown={handleLeftResizeMouseDown}
            className={`w-1 shrink-0 cursor-col-resize transition-colors ${
              isResizingLeft
                ? "bg-black dark:bg-white"
                : "bg-transparent hover:bg-gray-300 dark:hover:bg-white/20"
            }`}
          />

          <div className="flex-1 min-w-0 h-full min-h-0 overflow-hidden flex flex-col">
            <div className="flex-1 min-h-0 overflow-hidden">
              <MonacoCodeEditor value={code} onChange={setCode} />
            </div>

            {showTerminal && (
              <>
                <div
                  onMouseDown={handleTerminalResizeMouseDown}
                  className={`h-1 shrink-0 cursor-row-resize transition-colors ${
                    isResizingTerminal
                      ? "bg-black dark:bg-white"
                      : "bg-transparent hover:bg-gray-300 dark:hover:bg-white/20"
                  }`}
                />

                <div
                  style={{ height: `${terminalHeight}px` }}
                  className="min-h-[200px] overflow-hidden rounded-b-md shrink-0"
                >
                  <OutputTerminal
                    status={status}
                    outputLines={outputLines}
                    expectedOutput={expectedOutput}
                    actualOutput={actualOutput}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
