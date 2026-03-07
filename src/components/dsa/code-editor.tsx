"use client";

import { useState, useEffect } from "react";
import {
  Play,
  Check,
  Copy,
  Upload,
  X,
  Plus,
  CircleCheck,
  CircleX,
  Loader2,
  Brain,
} from "lucide-react";
import Editor from "@monaco-editor/react";
import PublishSolutionModal from "./publish-solution-modal";
import ComplexityAnalysisModal from "./complexity-analysis-modal";
import { useTheme } from "@/providers/theme-provider";

interface TestCase {
  input: string;
  output: string;
  expectedOutput?: string;
}

interface TestCaseResult {
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  error?: string;
}

interface CodeEditorProps {
  initialCode: {
    python?: string;
    java?: string;
    c?: string;
    cpp?: string;
  };
  testCases?: TestCase[];
  questionId?: string;
  onSolutionPublished?: () => void;
  onSubmitSuccess?: () => void;
}

const languageOptions = [
  { label: "Python", value: "python" },
  { label: "Java", value: "java" },
  { label: "C", value: "c" },
  { label: "C++", value: "cpp" },
];

const JUDGE_API_URL = "/api/judge";

type Language = "python" | "java" | "c" | "cpp";
type BottomTab = "testcase" | "result";
type OverallVerdict =
  | "idle"
  | "running"
  | "accepted"
  | "wrong_answer"
  | "error"
  | "partial";

interface SubmitResultData {
  verdict: OverallVerdict;
  passedCount: number;
  totalCount: number;
  runtime: number;
}

export default function CodeEditor({
  initialCode,
  testCases = [],
  questionId,
  onSolutionPublished,
  onSubmitSuccess,
}: CodeEditorProps) {
  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState("");
  const [userCode, setUserCode] = useState<Record<Language, string>>({
    python: "",
    java: "",
    c: "",
    cpp: "",
  });
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consoleHeight, setConsoleHeight] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showComplexityModal, setShowComplexityModal] = useState(false);
  const [wasSubmission, setWasSubmission] = useState(false);
  const [hasAcceptedSubmission, setHasAcceptedSubmission] = useState(false);

  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  // Submit overlay state
  const [showSubmitOverlay, setShowSubmitOverlay] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<"evaluating" | "done">(
    "evaluating",
  );
  const [submitResultData, setSubmitResultData] =
    useState<SubmitResultData | null>(null);
  const [submitBarWidth, setSubmitBarWidth] = useState(0);

  // Bottom panel state
  const [bottomTab, setBottomTab] = useState<BottomTab>("testcase");
  const [activeTestCaseIdx, setActiveTestCaseIdx] = useState(0);
  const [customTestCases, setCustomTestCases] = useState<TestCase[]>([]);

  // Test results state
  const [testResults, setTestResults] = useState<TestCaseResult[]>([]);
  const [activeResultIdx, setActiveResultIdx] = useState(0);
  const [overallVerdict, setOverallVerdict] = useState<OverallVerdict>("idle");
  const [runtime, setRuntime] = useState<number | null>(null);
  const [passedCount, setPassedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Merge original + custom test cases for display
  const allTestCases = [...testCases, ...customTestCases];

  // Initialize code with function templates
  useEffect(() => {
    const initialUserCode: Record<Language, string> = {
      python: initialCode.python || "",
      java: initialCode.java || "",
      c: initialCode.c || "",
      cpp: initialCode.cpp || "",
    };
    setUserCode(initialUserCode);
    setCode(
      initialUserCode.python ||
        initialUserCode.java ||
        initialUserCode.c ||
        initialUserCode.cpp ||
        "",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCode(userCode[language]);
  }, [language, userCode]);

  // Animate progress bar after submit result appears
  useEffect(() => {
    if (submitPhase === "done" && submitResultData) {
      const t = setTimeout(() => {
        setSubmitBarWidth(
          submitResultData.totalCount > 0
            ? Math.round(
                (submitResultData.passedCount / submitResultData.totalCount) *
                  100,
              )
            : 0,
        );
      }, 80);
      return () => clearTimeout(t);
    } else {
      setSubmitBarWidth(0);
    }
  }, [submitPhase, submitResultData]);

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || "";
    setCode(newCode);
    setUserCode((prev) => ({ ...prev, [language]: newCode }));
  };

  // ---------- Resize ----------
  const handleConsoleResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.classList.add("resize-active");
    const startY = e.clientY;
    const startHeight = consoleHeight;
    let raf: number | null = null;

    const onMove = (ev: MouseEvent) => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const delta = startY - ev.clientY;
        setConsoleHeight(Math.min(Math.max(120, startHeight + delta), 600));
      });
    };

    const onUp = () => {
      setIsResizing(false);
      document.body.classList.remove("resize-active");
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // ---------- Judge API call ----------
  const runJudge = async (
    mode: "run" | "submit",
  ): Promise<{
    results: TestCaseResult[];
    allPassed: boolean;
    passedCount: number;
    totalCount: number;
    error?: string;
  }> => {
    try {
      const response = await fetch(JUDGE_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          language,
          userCode: code,
          mode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          results: [],
          allPassed: false,
          passedCount: 0,
          totalCount: 0,
          error: data.message || data.error || "Judge error",
        };
      }

      // Map judge results to our format
      const results: TestCaseResult[] = (data.results || []).map(
        (r: Record<string, unknown>) => ({
          input: Array.isArray(r.input)
            ? r.input.join("\n")
            : String(r.input || ""),
          expectedOutput: r.expected || r.expectedOutput || "",
          actualOutput: r.error
            ? `Error: ${r.error}`
            : r.output || r.actualOutput || "(no output)",
          passed: r.passed,
          error: r.error,
        }),
      );

      return {
        results,
        allPassed: data.allPassed,
        passedCount: data.passedCount || results.filter((r) => r.passed).length,
        totalCount: data.totalCount || results.length,
      };
    } catch (err) {
      return {
        results: [],
        allPassed: false,
        passedCount: 0,
        totalCount: 0,
        error: err instanceof Error ? err.message : "Execution failed",
      };
    }
  };

  // ---------- RUN: Run against first 3 test cases ----------
  const handleRun = async () => {
    if (!questionId) {
      return;
    }

    setIsRunning(true);
    setBottomTab("result");
    setOverallVerdict("running");
    setTestResults([]);
    setActiveResultIdx(0);
    setRuntime(null);
    setWasSubmission(false);

    const startTime = Date.now();

    const judgeResult = await runJudge("run");
    const elapsed = Date.now() - startTime;
    setRuntime(elapsed);

    if (judgeResult.error && judgeResult.results.length === 0) {
      // Complete failure - show error
      const errorResult: TestCaseResult = {
        input: "(all test cases)",
        expectedOutput: "",
        actualOutput: `Error: ${judgeResult.error}`,
        passed: false,
        error: judgeResult.error,
      };
      setTestResults([errorResult]);
      setOverallVerdict("error");
      setPassedCount(0);
      setTotalCount(0);
      setIsRunning(false);
      return;
    }

    setTestResults(judgeResult.results);
    setPassedCount(judgeResult.passedCount);
    setTotalCount(judgeResult.totalCount);

    if (judgeResult.allPassed) {
      setOverallVerdict("accepted");
    } else if (judgeResult.results.some((r) => r.error)) {
      setOverallVerdict("error");
    } else {
      setOverallVerdict("wrong_answer");
    }

    setIsRunning(false);
  };

  // ---------- SUBMIT: Run against ALL test cases ----------
  const handleSubmit = async () => {
    if (!questionId) {
      handleRun();
      return;
    }

    setIsSubmitting(true);
    setShowSubmitOverlay(true);
    setSubmitPhase("evaluating");
    setSubmitResultData(null);
    setWasSubmission(true);

    const startTime = Date.now();
    const judgeResult = await runJudge("submit");
    const elapsed = Date.now() - startTime;

    // Determine verdict
    let verdict: OverallVerdict;
    if (judgeResult.error && judgeResult.results.length === 0) {
      verdict = "error";
    } else if (judgeResult.allPassed) {
      verdict = "accepted";
    } else if (judgeResult.results.some((r) => r.error)) {
      verdict = "error";
    } else {
      verdict = "wrong_answer";
    }

    // Show result in overlay
    setSubmitResultData({
      verdict,
      passedCount: judgeResult.passedCount,
      totalCount: judgeResult.totalCount,
      runtime: elapsed,
    });
    setSubmitPhase("done");
    setIsSubmitting(false);
    if (verdict === "accepted") setHasAcceptedSubmission(true);

    // Save all submissions to backend (accepted AND failed)
    try {
      const token = localStorage.getItem("accessToken");
      await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          questionId,
          code,
          language,
          verdict,
          passedCount: judgeResult.passedCount,
          totalCount: judgeResult.totalCount,
          runtime: elapsed,
        }),
      });
      if (onSubmitSuccess) onSubmitSuccess();
    } catch {
      // Silent — verdict already shown in overlay
    }
  };

  // ---------- Custom test case helpers ----------
  const addCustomTestCase = () => {
    setCustomTestCases((prev) => [...prev, { input: "", output: "" }]);
    setActiveTestCaseIdx(allTestCases.length); // Focus the new one
  };

  const removeCustomTestCase = (customIdx: number) => {
    setCustomTestCases((prev) => prev.filter((_, i) => i !== customIdx));
    setActiveTestCaseIdx(0);
  };

  const updateCustomTestCase = (
    customIdx: number,
    field: "input" | "output",
    value: string,
  ) => {
    setCustomTestCases((prev) =>
      prev.map((tc, i) => (i === customIdx ? { ...tc, [field]: value } : tc)),
    );
  };

  // ---------- Verdict display helpers ----------
  const verdictConfig = {
    idle: { label: "Ready", color: "text-gray-500", bg: "" },
    running: { label: "Running...", color: "text-yellow-500", bg: "" },
    accepted: {
      label: "Accepted",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    wrong_answer: {
      label: "Wrong Answer",
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
    error: {
      label: "Runtime Error",
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
    partial: {
      label: "Partially Accepted",
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
    },
  };

  const isProcessing = isRunning || isSubmitting;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-950">
      {/* ═══════ Top Controls ═══════ */}
      <div className="flex items-center justify-between px-4 h-12 shrink-0 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 sticky top-0 z-10">
        <div>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="px-2 py-1 bg-gray-100 dark:bg-white/8 text-gray-700 dark:text-white rounded text-xs outline-none cursor-pointer"
          >
            {languageOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigator.clipboard.writeText(code)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded text-gray-500 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors"
            title="Copy code"
          >
            <Copy className="w-4 h-4" />
          </button>

          {/* RUN */}
          <button
            onClick={handleRun}
            disabled={isProcessing}
            className="px-4 py-1.5 bg-black dark:bg-white/10 text-white dark:text-white text-xs rounded flex items-center gap-2 hover:bg-gray-800 dark:hover:bg-white/20 border border-black dark:border-white/15 disabled:opacity-50 transition-colors"
          >
            {isRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            RUN
          </button>

          {/* SUBMIT */}
          <button
            onClick={handleSubmit}
            disabled={isProcessing}
            className="px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black text-xs rounded flex items-center gap-2 hover:bg-gray-800 dark:hover:bg-gray-100 border border-black dark:border-white disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            SUBMIT
          </button>

          {/* PUBLISH — only enabled after a correct submission */}
          {questionId && (
            <button
              onClick={() => hasAcceptedSubmission && setShowPublishModal(true)}
              disabled={!hasAcceptedSubmission}
              title={
                hasAcceptedSubmission
                  ? "Publish your solution"
                  : "Submit a correct solution first to unlock publishing"
              }
              className={`px-4 py-1.5 text-xs rounded flex items-center gap-2 transition-colors ${
                hasAcceptedSubmission
                  ? "bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15 hover:text-black dark:hover:text-white cursor-pointer"
                  : "bg-gray-50 dark:bg-white/4 text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-60"
              }`}
            >
              <Upload className="w-4 h-4" />
              PUBLISH
            </button>
          )}
        </div>
      </div>

      {/* ═══════ Monaco Editor ═══════ */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-black">
        <Editor
          height="100%"
          language={language === "cpp" ? "cpp" : language}
          theme={isDarkMode ? "pitch-black" : "vs-light"}
          beforeMount={(monaco) => {
            monaco.editor.defineTheme("pitch-black", {
              base: "vs-dark",
              inherit: true,
              rules: [],
              colors: {
                "editor.background": "#000000",
                "editor.foreground": "#cbd5e1",
                "editorLineNumber.foreground": "#94a3b8",
                "editorLineNumber.activeForeground": "#60a5fa",
                "editorCursor.foreground": "#60a5fa",
                "editor.selectionBackground": "rgba(96, 165, 250, 0.25)",
                "editor.inactiveSelectionBackground":
                  "rgba(148, 163, 184, 0.2)",
                "editor.lineHighlightBackground": "#0b1220",
                "editorIndentGuide.background": "rgba(148, 163, 184, 0.2)",
                "editorIndentGuide.activeBackground": "rgba(96, 165, 250, 0.4)",
                "editorWhitespace.foreground": "rgba(148, 163, 184, 0.4)",
                "editorBracketMatch.background": "rgba(96, 165, 250, 0.2)",
                "editorBracketMatch.border": "rgba(59, 130, 246, 0.4)",
              },
            });
          }}
          value={code}
          onChange={handleCodeChange}
          options={{
            fontSize: 14,
            fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
            minimap: { enabled: false },
            automaticLayout: true,
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            autoIndent: "advanced",
            formatOnPaste: true,
            formatOnType: true,
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            wordWrap: "on",
            scrollBeyondLastLine: false,
            lineNumbers: "on",
            renderLineHighlight: "line",
            cursorBlinking: "smooth",
            smoothScrolling: true,
            padding: { top: 16, bottom: 16 },
          }}
        />
      </div>

      {/* ═══════ Resize Handle ═══════ */}
      <div
        onMouseDown={handleConsoleResize}
        className={`h-1 cursor-row-resize shrink-0 ${
          isResizing
            ? "bg-black dark:bg-white"
            : "bg-transparent hover:bg-gray-200 dark:hover:bg-white/20"
        }`}
        style={{ minHeight: "1px" }}
      />

      {/* ═══════ Bottom Panel ═══════ */}
      <div
        style={{ height: `${consoleHeight}px` }}
        className="bg-white dark:bg-black flex flex-col border-t border-gray-200 dark:border-white/10"
      >
        {/* Bottom Tabs */}
        <div className="flex items-center border-b border-gray-200 dark:border-white/8 bg-gray-50 dark:bg-[#0d0d0d] px-2">
          <button
            onClick={() => setBottomTab("testcase")}
            className={`px-4 py-2 font-mono text-xs tracking-wider transition-colors border-b-2 ${
              bottomTab === "testcase"
                ? "text-black dark:text-white border-black dark:border-white font-bold"
                : "text-gray-500 border-transparent hover:text-black dark:hover:text-white"
            }`}
          >
            Testcase
          </button>
          <button
            onClick={() => setBottomTab("result")}
            className={`px-4 py-2 font-mono text-xs tracking-wider transition-colors border-b-2 flex items-center gap-2 ${
              bottomTab === "result"
                ? "text-black dark:text-white border-black dark:border-white font-bold"
                : "text-gray-500 border-transparent hover:text-black dark:hover:text-white"
            }`}
          >
            Test Result
            {overallVerdict !== "idle" && overallVerdict !== "running" && (
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  overallVerdict === "accepted" ? "bg-green-500" : "bg-red-500"
                }`}
              />
            )}
          </button>

          {/* Verdict summary in header */}
          {overallVerdict !== "idle" && bottomTab === "result" && (
            <div className="ml-auto pr-2 flex items-center gap-2">
              {overallVerdict === "running" && (
                <Loader2 className="w-3 h-3 animate-spin text-gray-500" />
              )}
              <span
                className={`font-mono text-xs font-bold ${verdictConfig[overallVerdict].color}`}
              >
                {verdictConfig[overallVerdict].label}
              </span>
              {runtime !== null && overallVerdict !== "running" && (
                <span className="font-mono text-xs text-gray-500">
                  {runtime}ms
                </span>
              )}
            </div>
          )}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto dark-scrollbar">
          {/* ═══ TESTCASE TAB ═══ */}
          {bottomTab === "testcase" && (
            <div className="p-4">
              {allTestCases.length === 0 ? (
                <div className="text-center py-6 text-gray-400 font-mono text-xs">
                  <p>No test cases available for this question.</p>
                  <button
                    onClick={addCustomTestCase}
                    className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add Custom Test Case
                  </button>
                </div>
              ) : (
                <>
                  {/* Test case tabs */}
                  <div className="flex items-center gap-1 mb-4 flex-wrap">
                    {allTestCases.map((_, idx) => {
                      const isCustom = idx >= testCases.length;
                      return (
                        <div key={idx} className="flex items-center">
                          <button
                            onClick={() => setActiveTestCaseIdx(idx)}
                            className={`px-3 py-1.5 font-mono text-xs rounded-t transition-colors ${
                              activeTestCaseIdx === idx
                                ? "bg-black text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {isCustom
                              ? `Custom ${idx - testCases.length + 1}`
                              : `Case ${idx + 1}`}
                          </button>
                          {isCustom && (
                            <button
                              onClick={() =>
                                removeCustomTestCase(idx - testCases.length)
                              }
                              className="ml-0.5 p-1 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    <button
                      onClick={addCustomTestCase}
                      className="p-1.5 text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                      title="Add custom test case"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Active test case content */}
                  {allTestCases[activeTestCaseIdx] && (
                    <div className="space-y-3">
                      {/* Input */}
                      <div>
                        <label className="font-mono text-xs text-gray-500 tracking-wider block mb-1">
                          INPUT
                        </label>
                        {activeTestCaseIdx >= testCases.length ? (
                          <textarea
                            value={
                              customTestCases[
                                activeTestCaseIdx - testCases.length
                              ]?.input || ""
                            }
                            onChange={(e) =>
                              updateCustomTestCase(
                                activeTestCaseIdx - testCases.length,
                                "input",
                                e.target.value,
                              )
                            }
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded font-mono text-sm text-gray-800 dark:text-white resize-none focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/30 focus:border-transparent"
                            rows={3}
                            placeholder="Enter test input..."
                          />
                        ) : (
                          <pre className="px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded font-mono text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                            {allTestCases[activeTestCaseIdx].input || "(empty)"}
                          </pre>
                        )}
                      </div>

                      {/* Expected Output */}
                      <div>
                        <label className="font-mono text-xs text-gray-500 tracking-wider block mb-1">
                          EXPECTED OUTPUT
                        </label>
                        {activeTestCaseIdx >= testCases.length ? (
                          <textarea
                            value={
                              customTestCases[
                                activeTestCaseIdx - testCases.length
                              ]?.output || ""
                            }
                            onChange={(e) =>
                              updateCustomTestCase(
                                activeTestCaseIdx - testCases.length,
                                "output",
                                e.target.value,
                              )
                            }
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded font-mono text-sm text-gray-800 dark:text-white resize-none focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/30 focus:border-transparent"
                            rows={2}
                            placeholder="Enter expected output..."
                          />
                        ) : (
                          <pre className="px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded font-mono text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                            {allTestCases[activeTestCaseIdx].output ||
                              "(empty)"}
                          </pre>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ═══ TEST RESULT TAB ═══ */}
          {bottomTab === "result" && (
            <div className="p-4">
              {overallVerdict === "idle" && testResults.length === 0 && (
                <div className="text-center py-8 text-gray-400 font-mono text-xs">
                  <p>Click RUN to test against sample cases</p>
                  <p className="mt-1">
                    or SUBMIT to test against all test cases
                  </p>
                </div>
              )}

              {overallVerdict === "running" && testResults.length === 0 && (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-500 mx-auto mb-3" />
                  <p className="font-mono text-xs text-gray-500">
                    Running your code against test cases...
                  </p>
                </div>
              )}

              {testResults.length > 0 && (
                <>
                  {/* Overall Verdict Banner */}
                  {overallVerdict !== "running" && (
                    <div
                      className={`mb-4 p-4 border ${
                        overallVerdict === "accepted"
                          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                          : overallVerdict === "wrong_answer" ||
                              overallVerdict === "error"
                            ? "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10"
                            : "border-yellow-200 bg-yellow-50 dark:border-yellow-500/30 dark:bg-yellow-500/10"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {overallVerdict === "accepted" ? (
                            <CircleCheck className="w-6 h-6 text-emerald-500" />
                          ) : (
                            <CircleX className="w-6 h-6 text-red-500" />
                          )}
                          <div>
                            <h3
                              className={`text-lg font-bold ${verdictConfig[overallVerdict].color}`}
                            >
                              {verdictConfig[overallVerdict].label}
                            </h3>
                            {totalCount > 0 && (
                              <p className="text-xs font-mono text-gray-400 mt-0.5">
                                {passedCount}/{totalCount} test cases passed
                              </p>
                            )}
                          </div>
                        </div>
                        {runtime !== null && (
                          <div className="text-right">
                            <p className="font-mono text-xs text-gray-500">
                              Runtime
                            </p>
                            <p className="font-mono text-sm font-bold text-gray-800 dark:text-gray-200">
                              {runtime}ms
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Analyze Complexity — only after a real submission that passed */}
                      {overallVerdict === "accepted" &&
                        questionId &&
                        wasSubmission && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <button
                              onClick={() => setShowComplexityModal(true)}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-xs font-mono font-bold hover:bg-gray-800 transition-colors shadow-sm"
                            >
                              <Brain className="w-4 h-4 text-purple-400" />
                              <span>Analyze Time Complexity</span>
                            </button>
                          </div>
                        )}
                    </div>
                  )}

                  {/* Result case tabs */}
                  <div className="flex items-center gap-1 mb-4 flex-wrap">
                    {testResults.map((result, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveResultIdx(idx)}
                        className={`px-3 py-1.5 font-mono text-xs rounded transition-colors flex items-center gap-1.5 ${
                          activeResultIdx === idx
                            ? "bg-black dark:bg-white text-white dark:text-black"
                            : "bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/15 hover:text-black dark:hover:text-white"
                        }`}
                      >
                        {result.passed ? (
                          <CircleCheck
                            className={`w-3 h-3 ${activeResultIdx === idx ? "text-emerald-300" : "text-emerald-500"}`}
                          />
                        ) : result.actualOutput === "(not executed)" ? (
                          <span className="w-3 h-3 inline-block rounded-full bg-gray-300" />
                        ) : (
                          <CircleX
                            className={`w-3 h-3 ${activeResultIdx === idx ? "text-red-300" : "text-red-600"}`}
                          />
                        )}
                        Case {idx + 1}
                      </button>
                    ))}
                  </div>

                  {/* Active result detail */}
                  {testResults[activeResultIdx] && (
                    <div className="space-y-3">
                      {/* Input */}
                      <div>
                        <label className="font-mono text-xs text-gray-500 tracking-wider block mb-1">
                          INPUT
                        </label>
                        <pre className="px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded font-mono text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                          {testResults[activeResultIdx].input || "(empty)"}
                        </pre>
                      </div>

                      {/* Expected vs Actual - side by side on wider screens */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="font-mono text-xs text-gray-500 tracking-wider block mb-1">
                            EXPECTED OUTPUT
                          </label>
                          <pre className="px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded font-mono text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                            {testResults[activeResultIdx].expectedOutput ||
                              "(empty)"}
                          </pre>
                        </div>
                        <div>
                          <label className="font-mono text-xs text-gray-500 tracking-wider block mb-1">
                            YOUR OUTPUT
                          </label>
                          <pre
                            className={`px-3 py-2 border rounded font-mono text-sm whitespace-pre-wrap ${
                              testResults[activeResultIdx].passed
                                ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                                : testResults[activeResultIdx].actualOutput ===
                                    "(not executed)"
                                  ? "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400"
                                  : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300"
                            }`}
                          >
                            {testResults[activeResultIdx].actualOutput ||
                              "(empty)"}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══════ Submit Overlay ═══════ */}
      {showSubmitOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 w-full max-w-md mx-4 overflow-hidden">
            {submitPhase === "evaluating" ? (
              /* ── Evaluating state ── */
              <div className="p-14 flex flex-col items-center gap-5">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-4 border-gray-100 dark:border-white/10" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-black dark:border-t-white border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-gray-900 dark:text-white font-mono">
                    Evaluating your solution
                  </p>
                  <p className="text-xs text-gray-400 mt-1 font-mono">
                    Running against all test cases...
                  </p>
                </div>
              </div>
            ) : submitResultData ? (
              /* ── Result state ── */
              <>
                {/* Top accent bar */}
                <div
                  className={`h-1.5 w-full ${
                    submitResultData.verdict === "accepted"
                      ? "bg-emerald-500"
                      : "bg-red-500"
                  }`}
                />

                <div className="p-8">
                  {/* Verdict header */}
                  <div className="flex items-center gap-4 mb-6">
                    {submitResultData.verdict === "accepted" ? (
                      <div className="w-14 h-14 flex items-center justify-center shrink-0">
                        <CircleCheck className="w-10 h-10 text-emerald-500" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 flex items-center justify-center shrink-0">
                        <CircleX className="w-10 h-10 text-red-500" />
                      </div>
                    )}
                    <div>
                      <h2
                        className={`text-2xl font-bold font-mono ${
                          submitResultData.verdict === "accepted"
                            ? "text-emerald-500"
                            : "text-red-500"
                        }`}
                      >
                        {verdictConfig[submitResultData.verdict].label}
                      </h2>
                      {submitResultData.totalCount > 0 && (
                        <p className="text-sm text-gray-500 font-mono mt-0.5">
                          {submitResultData.passedCount} /{" "}
                          {submitResultData.totalCount} test cases passed
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Animated progress bar */}
                  {submitResultData.totalCount > 0 && (
                    <div className="mb-6">
                      <div className="h-2.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-[width] duration-700 ease-out ${
                            submitResultData.verdict === "accepted"
                              ? "bg-emerald-500"
                              : "bg-red-400"
                          }`}
                          style={{ width: `${submitBarWidth}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1.5">
                        <span className="font-mono text-xs text-gray-400">
                          0
                        </span>
                        <span className="font-mono text-xs text-gray-400">
                          {submitResultData.totalCount} total
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 mb-6 p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/8">
                    <div>
                      <p className="font-mono text-xs text-gray-400 tracking-wider">
                        RUNTIME
                      </p>
                      <p className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                        {submitResultData.runtime}ms
                      </p>
                    </div>
                    <div className="w-px h-8 bg-gray-200 dark:bg-white/10" />
                    <div>
                      <p className="font-mono text-xs text-gray-400 tracking-wider">
                        LANGUAGE
                      </p>
                      <p className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                        {language.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    {submitResultData.verdict === "accepted" && questionId && (
                      <button
                        onClick={() => {
                          setShowSubmitOverlay(false);
                          setShowComplexityModal(true);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-xs font-mono font-bold hover:bg-gray-800 transition-colors"
                      >
                        <Brain className="w-4 h-4 text-purple-400" />
                        Analyze Complexity
                      </button>
                    )}
                    <button
                      onClick={() => setShowSubmitOverlay(false)}
                      className="ml-auto px-4 py-2 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded text-xs font-mono font-bold hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Publish Solution Modal */}
      {showPublishModal && questionId && (
        <PublishSolutionModal
          questionId={questionId}
          code={code}
          language={language}
          onClose={() => setShowPublishModal(false)}
          onSuccess={() => {
            if (onSolutionPublished) {
              onSolutionPublished();
            }
          }}
        />
      )}

      {/* Complexity Analysis Modal */}
      {showComplexityModal && questionId && (
        <ComplexityAnalysisModal
          code={code}
          language={language}
          questionId={questionId}
          onClose={() => setShowComplexityModal(false)}
        />
      )}
    </div>
  );
}
