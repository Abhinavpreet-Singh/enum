"use client";

import { useState, useEffect, type ReactNode } from "react";
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
  input?: string | string[];
  isHidden?: boolean;
  caseNumber?: number;
}

interface TestRunResult {
  index: number;
  passed: boolean;
  actual: string;
  expected: string;
  input: string;
  error?: string;
  isHidden?: boolean;
}

type PanelTab = "testcase" | "result" | "custom";
type RunMode = "run" | "submit" | "custom";
type Verdict = "idle" | "running" | "accepted" | "wrong_answer" | "error";

interface SubmitOverlayState {
  phase: "submitting" | "done" | "error";
  passed: number;
  total: number;
  runtime: number | null;
  message?: string;
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
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<TestRunResult[]>([]);
  const [summary, setSummary] = useState("");
  const [runError, setRunError] = useState("");
  const [activeTab, setActiveTab] = useState<PanelTab>("testcase");
  const [customInput, setCustomInput] = useState("");
  const [runtime, setRuntime] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<Verdict>("idle");
  const [passedCount, setPassedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [lastMode, setLastMode] = useState<RunMode>("run");
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [editorTheme, setEditorTheme] = useState<"light" | "dark">("dark");
  const [submitOverlay, setSubmitOverlay] = useState<SubmitOverlayState | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      onAnswer({ code, language: lang });
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, lang]);

  useEffect(() => {
    const syncTheme = () =>
      setEditorTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  function openPanel(tab: PanelTab) {
    setActiveTab(tab);
    setPanelExpanded((expanded) => (activeTab === tab ? !expanded : true));
  }

  async function runCode(mode: RunMode = "run") {
    const isSubmit = mode === "submit";
    setRunning(!isSubmit);
    setSubmitting(isSubmit);
    setResults([]);
    setSummary("");
    setRunError("");
    setActiveTab("result");
    setPanelExpanded(true);
    setRuntime(null);
    setVerdict("running");
    setPassedCount(0);
    setTotalCount(0);
    setLastMode(mode);
    if (isSubmit) {
      setSubmitOverlay({ phase: "submitting", passed: 0, total: 0, runtime: null });
    }

    const testCases = mode === "custom"
      ? [{ input: customInput, expectedOutput: "" }]
      : question.testCases ?? [];
    const startTime = Date.now();
    const useServerCases = Boolean(question.bankQuestionId) && mode !== "custom";

    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "https://enum-backend.onrender.com";
      const resp = await fetch(`${backendUrl}/api/v1/judge/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: lang,
          code,
          mode: isSubmit ? "submit" : "run",
          functionName: question.functionName ?? undefined,
          parameterTypes: question.parameterTypes?.length ? question.parameterTypes : undefined,
          returnType: question.returnType ?? undefined,
          ...(useServerCases
            ? { bankQuestionId: question.bankQuestionId }
            : { testCases }),
        }),
      });
      const data = await resp.json();

      if (!resp.ok) {
        const message = data.message ?? `Judge request failed (${resp.status}).`;
        setRunError(message);
        setVerdict("error");
        setActiveTab("result");
        if (isSubmit) {
          setSubmitOverlay({
            phase: "error",
            passed: 0,
            total: 0,
            runtime: Date.now() - startTime,
            message,
          });
        }
        return;
      }

      if (data.message && !data.results) {
        setRunError(data.message);
        setVerdict("error");
        setActiveTab("result");
        if (isSubmit) {
          setSubmitOverlay({
            phase: "error",
            passed: 0,
            total: 0,
            runtime: Date.now() - startTime,
            message: data.message,
          });
        }
        return;
      }

      if (data.allPassed && isSubmit) {
        const passed = data.passedCount ?? 0;
        const total = data.totalCount ?? 0;
        setRuntime(Date.now() - startTime);
        setPassedCount(passed);
        setTotalCount(total);
        setVerdict("accepted");
        setResults([]);
        setSummary(`${passed}/${total} test cases passed`);
        setSubmitOverlay({
          phase: "done",
          passed,
          total,
          runtime: Date.now() - startTime,
        });
        onAnswer({
          code,
          language: lang,
          judge: {
            passed: true,
            passedCount: passed,
            totalCount: total,
            runtimeMs: Date.now() - startTime,
            submittedAt: new Date().toISOString(),
          },
        });
        return;
      }

      if (Array.isArray(data.results) && data.results.length > 0) {
        const mapped: TestRunResult[] = data.results.map((r: JudgeResult, i: number) => {
          const sample = testCases?.[i];
          return {
            index: typeof r.caseNumber === "number" ? r.caseNumber : i + 1,
            passed: Boolean(r.passed),
            actual: r.output ?? "",
            expected: r.expected ?? sample?.expectedOutput ?? "",
            input: formatInput(r.input ?? sample?.input),
            error: r.error,
            isHidden: Boolean(r.isHidden),
          };
        });
        setResults(mapped);
        setRuntime(Date.now() - startTime);
        const passed = data.passedCount ?? mapped.filter((r) => r.passed).length;
        const total = data.totalCount ?? mapped.length;
        const allPassed = data.allPassed ?? (mapped.length > 0 && mapped.every((r) => r.passed));
        const hasError = mapped.some((r) => r.error);
        setPassedCount(passed);
        setTotalCount(total);
        setVerdict(allPassed ? "accepted" : hasError ? "error" : "wrong_answer");
        setActiveTab("result");
        setSummary(
          mode === "custom"
            ? "Custom run completed"
            : `${passed}/${total} test cases passed`,
        );
        if (isSubmit) {
          setSubmitOverlay({
            phase: allPassed ? "done" : "error",
            passed,
            total,
            runtime: Date.now() - startTime,
          });
          onAnswer({
            code,
            language: lang,
            judge: {
              passed: allPassed,
              passedCount: passed,
              totalCount: total,
              runtimeMs: Date.now() - startTime,
              submittedAt: new Date().toISOString(),
            },
          });
        }
        return;
      }

      if (data.results?.length === 0) {
        setRunError("No test cases to run for this question.");
        setVerdict("error");
        setActiveTab("result");
        if (isSubmit) {
          setSubmitOverlay({
            phase: "error",
            passed: 0,
            total: 0,
            runtime: Date.now() - startTime,
            message: "No test cases to run for this question.",
          });
        }
        return;
      }

      setRunError(data.output ?? data.error ?? data.message ?? "No output");
      setVerdict("error");
      setActiveTab("result");
      if (isSubmit) {
        setSubmitOverlay({
          phase: "error",
          passed: 0,
          total: 0,
          runtime: Date.now() - startTime,
          message: data.output ?? data.error ?? data.message ?? "No output",
        });
      }
    } catch {
      setRunError("Judge service unavailable. Your code is saved.");
      setVerdict("error");
      setActiveTab("result");
      if (isSubmit) {
        setSubmitOverlay({
          phase: "error",
          passed: 0,
          total: 0,
          runtime: Date.now() - startTime,
          message: "Judge service unavailable. Your code is saved.",
        });
      }
    } finally {
      setRunning(false);
      setSubmitting(false);
    }
  }

  const languageOptions = [
    { label: "Python", value: "python" },
    { label: "Java", value: "java" },
    { label: "C", value: "c" },
    { label: "C++", value: "cpp" },
    { label: "JavaScript", value: "javascript" },
    { label: "TypeScript", value: "typescript" },
  ];
  const isProcessing = running || submitting;

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden border-l border-black/[0.06] bg-white dark:border-white/[0.06] dark:bg-black">
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-black/[0.06] bg-white px-3 dark:border-white/[0.06] dark:bg-black">
        <div
          className="relative"
          onMouseLeave={() => setLanguageMenuOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLanguageMenuOpen((open) => !open)}
            className="flex h-8 min-w-32 items-center justify-between gap-3 border border-black/[0.08] bg-white px-3 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-black outline-none transition-colors hover:border-black/20 dark:border-white/[0.08] dark:bg-black dark:text-white dark:hover:border-white/20"
            aria-haspopup="listbox"
            aria-expanded={languageMenuOpen}
          >
            <span>{languageOptions.find((opt) => opt.value === lang)?.label ?? lang}</span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">▾</span>
          </button>
          {languageMenuOpen && (
            <div
              className="absolute left-0 top-9 z-30 w-44 border border-black/[0.08] bg-white p-1 shadow-lg dark:border-white/[0.08] dark:bg-black"
              role="listbox"
            >
              {languageOptions.map((opt) => {
                const active = opt.value === lang;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setLang(opt.value);
                      setLanguageMenuOpen(false);
                    }}
                    className={`block h-8 w-full px-3 text-left font-mono text-xs font-semibold uppercase tracking-[0.08em] transition-colors ${
                      active
                        ? "bg-black text-white dark:bg-white dark:text-black"
                        : "text-gray-700 hover:bg-black/[0.05] hover:text-black dark:text-gray-200 dark:hover:bg-white/[0.06] dark:hover:text-white"
                    }`}
                    role="option"
                    aria-selected={active}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => runCode("run")}
            disabled={isProcessing}
            className="rounded border border-black bg-black px-4 py-1.5 font-mono text-xs font-semibold tracking-[0.14em] text-white transition-colors hover:bg-gray-800 disabled:opacity-50 dark:border-white/15 dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.14]"
          >
            {running ? "RUNNING" : "RUN"}
          </button>
          <button
            onClick={() => runCode("submit")}
            disabled={isProcessing}
            className="rounded border border-black bg-black px-4 py-1.5 font-mono text-xs font-semibold tracking-[0.14em] text-white transition-colors hover:bg-gray-800 disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-100"
          >
            {submitting ? "SUBMITTING" : "SUBMIT"}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden" data-allow-clipboard="true">
        <MonacoEditor
          height="100%"
          language={LANGUAGE_MAP[lang] ?? lang}
          theme={editorTheme === "dark" ? "pitch-black" : "exam-light"}
          beforeMount={(monaco) => {
            monaco.editor.defineTheme("exam-light", {
              base: "vs",
              inherit: true,
              rules: [],
              colors: {
                "editor.selectionBackground": "#c7c7c7",
                "editor.inactiveSelectionBackground": "#e2e2e2",
                "editor.selectionHighlightBackground": "#b8b8b880",
                "editor.lineHighlightBackground": "#f8fafc",
              },
            });
            monaco.editor.defineTheme("pitch-black", {
              base: "vs-dark",
              inherit: true,
              rules: [],
              colors: {
                "editor.background": "#000000",
                "editor.foreground": "#cbd5e1",
                "editorLineNumber.foreground": "#71717a",
                "editorLineNumber.activeForeground": "#ffffff",
                "editorCursor.foreground": "#ffffff",
                "editor.selectionBackground": "#f5f5f533",
                "editor.inactiveSelectionBackground": "#ffffff1f",
                "editor.selectionHighlightBackground": "#ffffff24",
                "editor.lineHighlightBackground": "#0a0a0a",
                "editorIndentGuide.background": "rgba(255, 255, 255, 0.12)",
                "editorIndentGuide.activeBackground": "rgba(255, 255, 255, 0.28)",
              },
            });
          }}
          value={code}
          onChange={(v) => setCode(v ?? "")}
          options={{
            minimap: { enabled: false },
            fontSize: 15,
            fontFamily: "ui-monospace, 'Cascadia Code', monospace",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            lineNumbers: "on",
            lineNumbersMinChars: 2,
            lineDecorationsWidth: 14,
            glyphMargin: false,
            folding: false,
            renderLineHighlight: "line",
            padding: { top: 14, bottom: 14 },
            wordWrap: "off",
            scrollbar: {
              horizontal: "auto",
              vertical: "auto",
              horizontalScrollbarSize: 8,
              verticalScrollbarSize: 8,
            },
          }}
        />
      </div>

      <div
        className={`flex shrink-0 flex-col border-t border-black/[0.06] bg-white transition-[height] duration-200 dark:border-white/[0.06] dark:bg-black ${
          panelExpanded ? "h-[280px]" : "h-10"
        }`}
      >
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-black/[0.06] bg-black/[0.02] px-2 dark:border-white/[0.06] dark:bg-white/[0.025]">
          <div className="flex items-center gap-1">
            <ConsoleTab active={activeTab === "testcase" && panelExpanded} onClick={() => openPanel("testcase")}>
              Testcase
            </ConsoleTab>
            <ConsoleTab active={activeTab === "result" && panelExpanded} onClick={() => openPanel("result")}>
              Console
            </ConsoleTab>
            <ConsoleTab active={activeTab === "custom" && panelExpanded} onClick={() => openPanel("custom")}>
              Custom
            </ConsoleTab>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <VerdictSummary
              verdict={verdict}
              runtime={runtime}
              passedCount={passedCount}
              totalCount={totalCount}
              summary={summary}
              lastMode={lastMode}
            />
            <button
              type="button"
              onClick={() => setPanelExpanded((expanded) => !expanded)}
              className="grid h-7 w-10 place-items-center border border-black/[0.08] bg-white font-mono text-xs leading-none text-gray-700 transition-colors hover:border-black/20 hover:text-black dark:border-white/[0.08] dark:bg-black dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
              title={panelExpanded ? "Hide console" : "Show console"}
            >
              {panelExpanded ? "⌄" : "⌃"}
            </button>
          </div>
        </div>

        {panelExpanded && <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {activeTab === "testcase" && (
            <TestcasePanel
              question={question}
              results={results}
              passedCount={passedCount}
              totalCount={totalCount}
            />
          )}

          {activeTab === "result" && (
            <ConsoleResults
              runError={runError}
              results={results}
              verdict={verdict}
              lastMode={lastMode}
              passedCount={passedCount}
              totalCount={totalCount}
              runtime={runtime}
            />
          )}

          {activeTab === "custom" && (
            <div className="flex h-full min-h-0 flex-col gap-3">
              <textarea
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Enter custom input exactly as stdin..."
                className="min-h-0 flex-1 resize-none rounded border border-black/10 bg-white p-3 font-mono text-xs text-gray-800 outline-none placeholder:text-gray-400 focus:border-black/35 dark:border-white/10 dark:bg-black dark:text-gray-200 dark:placeholder:text-gray-600 dark:focus:border-white/35"
              />
              <button
                onClick={() => runCode("custom")}
                disabled={isProcessing}
                className="self-end rounded border border-black/80 px-4 py-2 font-mono text-[11px] font-semibold tracking-[0.16em] text-black transition-colors hover:bg-black hover:text-white disabled:opacity-50 dark:border-white/80 dark:text-white dark:hover:bg-white dark:hover:text-black"
              >
                RUN CUSTOM
              </button>
            </div>
          )}
        </div>}
      </div>
      {submitOverlay && (
        <SubmitOverlay
          state={submitOverlay}
          onClose={() => setSubmitOverlay(null)}
        />
      )}
    </div>
  );
}

function ConsoleTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-7 px-3 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
        active
          ? "bg-black text-white dark:bg-white dark:text-black"
          : "text-gray-700 hover:bg-black/[0.06] hover:text-black dark:text-gray-200 dark:hover:bg-white/[0.06] dark:hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function VerdictSummary({
  verdict,
  runtime,
  passedCount,
  totalCount,
  summary,
  lastMode,
}: {
  verdict: Verdict;
  runtime: number | null;
  passedCount: number;
  totalCount: number;
  summary: string;
  lastMode: RunMode;
}) {
  if (verdict === "idle" && !summary) return null;

  const label =
    verdict === "running"
      ? "Running"
      : verdict === "accepted"
      ? "Accepted"
      : verdict === "wrong_answer"
      ? "Wrong Answer"
      : verdict === "error"
      ? "Runtime Error"
      : "Ready";

  const color =
    verdict === "accepted"
      ? "text-emerald-400"
      : verdict === "wrong_answer" || verdict === "error"
      ? "text-red-400"
      : "text-gray-400";

  return (
    <div className="ml-auto hidden items-center gap-2 pr-1 font-mono text-[11px] md:flex">
      <span className="uppercase tracking-[0.12em] text-gray-700 dark:text-gray-300">
        {lastMode === "submit" ? "Submit" : lastMode === "custom" ? "Custom" : "Run"}
      </span>
      <span className={color}>{label}</span>
      {totalCount > 0 && (
        <span className="text-gray-700 dark:text-gray-300">
          {passedCount}/{totalCount}
        </span>
      )}
      {runtime !== null && <span className="text-gray-700 dark:text-gray-300">{runtime}ms</span>}
    </div>
  );
}

function TestcasePanel({
  question,
  results,
  passedCount,
  totalCount,
}: {
  question: ExamQuestion;
  results: TestRunResult[];
  passedCount: number;
  totalCount: number;
}) {
  const samples = question.testCases ?? [];
  const visibleRows = results.length
    ? results
    : samples.map((test, index) => ({
        index: index + 1,
        passed: false,
        actual: "",
        expected: test.expectedOutput ?? "",
        input: formatInput(test.input),
      }));

  if (!visibleRows.length) {
    return (
      <div className="border border-black/10 bg-black/[0.03] p-4 text-sm text-gray-500 dark:border-white/10 dark:bg-white/[0.03]">
        No sample test cases are available for this question.
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-[220px_minmax(0,1fr)] gap-4">
      <aside className="min-h-0 border-r border-black/[0.06] pr-3 dark:border-white/[0.06]">
        <div className="space-y-2">
          {visibleRows.map((row) => (
            <div key={row.index} className="flex items-center gap-2 font-mono text-xs">
              <span className={row.passed ? "text-emerald-600" : "text-red-500"}>
                {row.passed ? "✓" : "×"}
              </span>
              <span
                className={`border px-2 py-1 ${
                  row.passed
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
                    : "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-200"
                }`}
              >
                Test case {row.index}
                {row.isHidden ? " (hidden)" : ""}
              </span>
            </div>
          ))}
        </div>
        {totalCount > 0 && (
          <p className="mt-4 font-mono text-xs text-emerald-700 dark:text-emerald-300">
            Test case passed {passedCount}/{totalCount}
          </p>
        )}
      </aside>

      <div className="min-h-0 overflow-y-auto pr-1">
        {visibleRows.map((row) => (
          <div key={row.index} className="mb-4 grid gap-3 last:mb-0">
            <OutputBlock label="Input" value={row.input || "-"} />
            <OutputBlock label="Expected Output" value={row.expected || "(not set)"} />
            <OutputBlock label="Your Output" value={row.actual || "(empty)"} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ConsoleResults({
  runError,
  results,
  verdict,
  lastMode,
  passedCount,
  totalCount,
  runtime,
}: {
  runError: string;
  results: TestRunResult[];
  verdict: Verdict;
  lastMode: RunMode;
  passedCount: number;
  totalCount: number;
  runtime: number | null;
}) {
  if (runError) {
    return (
      <div className="rounded border border-red-500/25 bg-red-500/10 p-3 font-mono text-xs text-red-600 dark:text-red-200">
        {runError}
      </div>
    );
  }

  const errored = results.find((result) => result.error);
  if (errored) {
    return (
      <div className="rounded border border-red-500/25 bg-red-500/10 p-4 font-mono text-xs text-red-700 dark:text-red-200">
        <p className="mb-2 text-[10px] uppercase tracking-[0.16em]">Compilation / Runtime Error</p>
        <pre className="whitespace-pre-wrap">{errored.error}</pre>
      </div>
    );
  }

  if (!results.length || verdict !== "error") {
    return (
      <div className="rounded border border-black/10 bg-white p-4 font-mono text-xs text-gray-500 dark:border-white/10 dark:bg-black">
        {verdict === "running"
          ? "Running your code..."
          : "No compilation errors."}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {results.map((r) => (
        <div
          key={r.index}
          className={`rounded border p-3 text-xs ${
            r.passed
              ? "border-emerald-500/25 bg-emerald-500/10"
              : "border-red-500/25 bg-red-500/10"
          }`}
        >
          <div className="mb-2 flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] ${
                r.passed
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200"
                  : "bg-red-500/15 text-red-700 dark:text-red-200"
              }`}
            >
              {lastMode === "submit" ? "Submit" : "Test"} {r.index}: {r.passed ? "Pass" : "Fail"}
            </span>
          </div>

          <div className="grid gap-2 font-mono lg:grid-cols-3">
            <OutputBlock label="Input" value={r.input || "-"} />
            <OutputBlock label="Your Output" value={r.error ? r.error : r.actual || "(empty)"} />
            <OutputBlock label="Expected" value={r.expected || "(not set)"} />
          </div>
        </div>
      ))}
    </div>
  );
}

function OutputBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-gray-500">{label}</p>
      <pre className="max-h-24 overflow-auto whitespace-pre-wrap rounded border border-black/10 bg-white p-2 text-gray-700 dark:border-white/10 dark:bg-black dark:text-gray-300">
        {value}
      </pre>
    </div>
  );
}

function SubmitOverlay({
  state,
  onClose,
}: {
  state: SubmitOverlayState;
  onClose: () => void;
}) {
  const done = state.phase !== "submitting";
  const passedAll = state.total > 0 && state.passed === state.total;

  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-white/85 backdrop-blur-sm dark:bg-black/85">
      <div className="w-full max-w-sm border border-black/20 bg-white p-6 text-center shadow-2xl dark:border-white/20 dark:bg-black">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-400">
          {state.phase === "submitting" ? "Submitting" : "Submission Result"}
        </p>
        <h3
          className={`mt-3 text-2xl font-bold ${
            state.phase === "submitting"
              ? "text-black dark:text-white"
              : passedAll
              ? "text-emerald-600 dark:text-emerald-300"
              : "text-red-600 dark:text-red-300"
          }`}
        >
          {state.phase === "submitting"
            ? "Checking final test cases..."
            : passedAll
            ? "Accepted"
            : "Failed"}
        </h3>
        {done && (
          <>
            <p className="mt-4 font-mono text-4xl font-bold text-black dark:text-white">
              {state.passed}/{state.total}
            </p>
            <p className="mt-1 font-mono text-xs uppercase tracking-[0.14em] text-gray-500">
              final test cases passed
            </p>
            {state.runtime !== null && (
              <p className="mt-2 font-mono text-xs text-gray-500">{state.runtime}ms</p>
            )}
            {state.message && (
              <pre className="mt-4 max-h-28 overflow-auto whitespace-pre-wrap border border-black/10 bg-black/[0.03] p-3 text-left font-mono text-xs text-red-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-red-200">
                {state.message}
              </pre>
            )}
          </>
        )}
        {state.phase === "submitting" ? (
          <div className="mx-auto mt-5 h-1 w-40 overflow-hidden bg-black/10 dark:bg-white/10">
            <div className="h-full w-1/2 animate-pulse bg-black dark:bg-white" />
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full border border-black bg-black px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-gray-800 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-100"
          >
            OK
          </button>
        )}
      </div>
    </div>
  );
}
