"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { ExamQuestion, Answer } from "@/types";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const LANGUAGE_MAP: Record<string, string> = {
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  java: "java",
  cpp: "cpp",
  c: "c",
  sql: "sql",
  bash: "shell",
};

interface JudgeResult {
  passed?: boolean;
  output?: string;
  expected?: string;
  error?: string;
  input?: string[];
}

interface TestRunResult {
  index: number;
  passed: boolean;
  actual: string;
  expected: string;
  input: string;
  error?: string;
}

interface Props {
  question: ExamQuestion;
  answer: Answer | undefined;
  language?: string;
  onAnswer: (value: { code: string; language: string }) => void;
}

function formatInput(input: string | string[] | undefined): string {
  if (!input) return "—";
  if (Array.isArray(input)) return input.join("\n");
  return String(input);
}

export default function CodingQuestion({ question, answer, language = "python", onAnswer }: Props) {
  const existing = answer?.value as { code?: string; language?: string } | undefined;
  const [code, setCode] = useState(
    existing?.code ?? question.codeTemplate ?? "# Write your solution here\n",
  );
  const [lang, setLang] = useState(existing?.language ?? language);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestRunResult[]>([]);
  const [summary, setSummary] = useState("");
  const [runError, setRunError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      onAnswer({ code, language: lang });
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, lang]);

  async function runCode() {
    setRunning(true);
    setResults([]);
    setSummary("");
    setRunError("");

    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "https://enum-backend.onrender.com";
      const resp = await fetch(`${backendUrl}/api/v1/judge/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: lang,
          code,
          testCases: question.testCases ?? [],
          mode: "run",
          // Include function signature so the judge can auto-generate the harness
          functionName: question.functionName ?? undefined,
          parameterTypes: question.parameterTypes?.length ? question.parameterTypes : undefined,
          returnType: question.returnType ?? undefined,
        }),
      });
      const data = await resp.json();

      if (data.message && !data.results) {
        setRunError(data.message);
        return;
      }

      if (Array.isArray(data.results) && data.results.length > 0) {
        const mapped: TestRunResult[] = data.results.map((r: JudgeResult, i: number) => {
          const sample = question.testCases?.[i];
          return {
            index: i + 1,
            passed: Boolean(r.passed),
            actual: r.output ?? "",
            expected: r.expected ?? sample?.expectedOutput ?? "",
            input: formatInput(r.input ?? sample?.input),
            error: r.error,
          };
        });
        setResults(mapped);
        setSummary(`${data.passedCount ?? mapped.filter((r) => r.passed).length}/${data.totalCount ?? mapped.length} test cases passed`);
        return;
      }

      if (data.results?.length === 0) {
        setRunError("No test cases to run for this question.");
        return;
      }

      setRunError(data.output ?? data.error ?? data.message ?? "No output");
    } catch {
      setRunError("Judge service unavailable. Your code is saved.");
    } finally {
      setRunning(false);
    }
  }

  const langs = ["python", "javascript", "typescript", "java", "cpp", "c"];

  return (
    <div className="flex flex-col gap-3">
      {/* Language selector */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 uppercase tracking-wider">Language</span>
        <div className="flex gap-1.5">
          {langs.map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`rounded px-2.5 py-1 text-xs transition-all ${
                lang === l
                  ? "bg-[#0a0a0a] text-white font-semibold"
                  : "border border-black/12 text-gray-500 hover:border-black/30 hover:text-[#0a0a0a]"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="rounded-lg overflow-hidden border border-black/12 shadow-sm" style={{ height: 320 }}>
        <MonacoEditor
          height="100%"
          language={LANGUAGE_MAP[lang] ?? lang}
          theme="light"
          value={code}
          onChange={(v) => setCode(v ?? "")}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "ui-monospace, 'Cascadia Code', monospace",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            lineNumbers: "on",
            renderLineHighlight: "line",
          }}
        />
      </div>

      {/* Run + results */}
      <div className="flex flex-col gap-2">
        <button
          onClick={runCode}
          disabled={running}
          className="self-start rounded-lg border border-[#0a0a0a] bg-[#0a0a0a] px-4 py-2 text-xs font-medium text-white transition-all hover:bg-[#1f1f1f] hover:-translate-y-px disabled:opacity-50"
        >
          {running ? "Running…" : "▶ Run"}
        </button>

        {runError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600">
            {runError}
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            {summary && (
              <p className="text-xs font-medium text-gray-500">{summary}</p>
            )}
            {results.map((r) => (
              <div
                key={r.index}
                className={`rounded-lg border p-3 text-xs ${
                  r.passed
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 font-semibold uppercase tracking-wider ${
                      r.passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    Test {r.index}: {r.passed ? "Pass" : "Fail"}
                  </span>
                </div>

                <div className="space-y-2 font-mono">
                  <div>
                    <p className="mb-1 text-[10px] uppercase tracking-wider text-gray-400">Input</p>
                    <pre className="whitespace-pre-wrap rounded bg-white border border-black/8 p-2 text-gray-700">
                      {r.input || "—"}
                    </pre>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="mb-1 text-[10px] uppercase tracking-wider text-gray-400">
                        Your output
                      </p>
                      <pre className="whitespace-pre-wrap rounded bg-white border border-black/8 p-2 text-[#0a0a0a]">
                        {r.error ? r.error : r.actual || "(empty)"}
                      </pre>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] uppercase tracking-wider text-gray-400">
                        Expected output
                      </p>
                      <pre className="whitespace-pre-wrap rounded bg-white border border-black/8 p-2 text-emerald-700">
                        {r.expected || "(not set)"}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
