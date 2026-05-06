"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RotateCcw, Play, Send } from "lucide-react";
import axios from "axios";
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
    .filter((line, index, array) => line.length > 0 || index < array.length - 1);
}

export default function LinuxArenaPage({ initialQuestionId }: LinuxArenaPageProps) {
  const [questions, setQuestions] = useState<LinuxQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    initialQuestionId ?? null,
  );
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<ExecutionStatus>("idle");
  const [outputLines, setOutputLines] = useState<string[]>([
    "Linux arena ready. Pick a question and run your Bash command.",
  ]);
  const [actualOutput, setActualOutput] = useState<string | null>(null);
  const [expectedOutput, setExpectedOutput] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${proxy}/api/v1/questions/linux`, {
          withCredentials: true,
        });
        const nextQuestions = (response.data?.data ?? []) as LinuxQuestion[];
        setQuestions(nextQuestions);

        const requested =
          nextQuestions.find((question) => question.id === initialQuestionId || question.slug === initialQuestionId) ??
          nextQuestions[0] ??
          null;

        if (requested) {
          setSelectedQuestionId(requested.id);
          setCode(requested.starterCode || "");
          setExpectedOutput(requested.expectedOutput || "");
        }
      } catch {
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [initialQuestionId]);

  useEffect(() => {
    if (!selectedQuestionId || questions.length === 0) return;
    const selected = questions.find((question) => question.id === selectedQuestionId);
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
    () => questions.find((question) => question.id === selectedQuestionId) ?? questions[0] ?? null,
    [questions, selectedQuestionId],
  );

  const handleRun = async () => {
    if (!selectedQuestion) return;

    setStatus("running");
    setOutputLines(["$ Running Bash command...", ""]);

    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "bash", code }),
      });

      const data = await response.json();
      const output = String(data.output ?? data.stdout ?? data.error ?? "");
      setActualOutput(output);
      const nextLines = normalizeLines(output);
      setOutputLines((prev) => [...prev, ...(nextLines.length ? nextLines : ["(no output)"])]);
      setStatus("idle");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Execution failed";
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
      const response = await axios.post(`${proxy}/api/v1/submit/linux`, {
        questionId: selectedQuestion.id,
        code,
        language: "bash",
      });

      const result = response.data?.data as RunResult & {
        passed: boolean;
        verdict: string;
        expectedOutput?: string;
        normalizedOutput?: string;
      };

      setActualOutput(result?.output ?? null);
      setExpectedOutput(result?.expectedOutput ?? selectedQuestion.expectedOutput ?? null);
      setOutputLines([
        `Submission ${result?.passed ? "passed" : "failed"}`,
        "",
        ...(result?.output ? normalizeLines(result.output) : ["(no output)"]),
      ]);
      setStatus(result?.passed ? "passed" : "failed");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 font-mono text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading Linux arena...
        </div>
      </div>
    );
  }

  if (!selectedQuestion) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <p className="font-mono text-sm text-gray-500">No Linux questions available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white dark:bg-black overflow-hidden">
      <div className="h-full max-w-400 mx-auto p-4 lg:p-6 flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4 shrink-0">
          <div>
            <p className="font-mono text-[10px] tracking-[0.32em] text-gray-400 uppercase">
              Dashboard / Linux Arena
            </p>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-black dark:text-white">
              Bash Arena
            </h1>
            <p className="font-mono text-xs text-gray-500 dark:text-gray-400 mt-1">
              Execute real Bash commands, inspect stdout, and submit against expected output.
            </p>
          </div>

          <div className="flex items-center gap-2">
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

        <div className="grid flex-1 min-h-0 gap-4 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)_auto]">
          <div className="min-h-0 lg:row-span-2">
            <QuestionPanel
              questions={questions}
              activeQuestionId={selectedQuestion.id}
              onSelectQuestion={(questionId) => setSelectedQuestionId(questionId)}
            />
          </div>

          <div className="min-h-0 flex flex-col gap-3">
            <div className="flex items-center justify-between border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] px-4 py-3 shrink-0">
              <div>
                <p className="font-mono text-[10px] tracking-[0.28em] uppercase text-gray-400">
                  Bash Editor
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {selectedQuestion.slug.replace(/-/g, " ")}
                </p>
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-gray-400">
                shell syntax
              </div>
            </div>

            <div className="flex-1 min-h-0">
              <MonacoCodeEditor value={code} onChange={setCode} />
            </div>
          </div>

          <div className="lg:col-start-2">
            <OutputTerminal
              status={status}
              outputLines={outputLines}
              expectedOutput={expectedOutput}
              actualOutput={actualOutput}
            />
          </div>
        </div>
      </div>
    </div>
  );
}