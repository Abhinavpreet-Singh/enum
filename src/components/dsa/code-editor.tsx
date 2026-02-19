"use client";

import { useState, useEffect } from "react";
import {
  Moon,
  Play,
  Check,
  Copy,
  Settings,
  Upload,
  X,
  Plus,
  CircleCheck,
  CircleX,
  Loader2,
} from "lucide-react";
import Editor from "@monaco-editor/react";
import PublishSolutionModal from "./publish-solution-modal";

interface TestCase {
  input: string;
  output: string;
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
}

const languageOptions = [
  { label: "Python", value: "python" },
  { label: "Java", value: "java" },
  { label: "C", value: "c" },
  { label: "C++", value: "cpp" },
];

const RUN_API_URL = "/api/run";

type Language = "python" | "java" | "c" | "cpp";
type BottomTab = "testcase" | "result";
type OverallVerdict =
  | "idle"
  | "running"
  | "accepted"
  | "wrong_answer"
  | "error"
  | "partial";

export default function CodeEditor({
  initialCode,
  testCases = [],
  questionId,
  onSolutionPublished,
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
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [consoleHeight, setConsoleHeight] = useState(240);
  const [isResizing, setIsResizing] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);

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

  // Initialize code
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
        ""
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCode(userCode[language]);
  }, [language, userCode]);

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

  // ---------- Normalize output for comparison ----------
  const normalizeOutput = (str: string): string => {
    let s = str.trim();
    // Strip surrounding double quotes
    if (s.startsWith('"') && s.endsWith('"')) {
      s = s.slice(1, -1);
    }
    // Strip surrounding single quotes
    if (s.startsWith("'") && s.endsWith("'")) {
      s = s.slice(1, -1);
    }
    return s;
  };

  // ---------- Execute single test case ----------
  const executeCode = async (
    input: string
  ): Promise<{ output: string; error?: string }> => {
    try {
      const response = await fetch(RUN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code, input }),
      });
      const data = await response.json();

      if (data.error && !data.output && !data.stdout) {
        return {
          output: "",
          error: data.message || data.error || "Runtime error",
        };
      }

      const output =
        data?.output ?? data?.stdout ?? data?.result ?? "";
      return { output: String(output).trim() };
    } catch (err) {
      return {
        output: "",
        error: err instanceof Error ? err.message : "Execution failed",
      };
    }
  };

  // ---------- RUN: Run against visible test cases (first 3 + custom) ----------
  const handleRun = async () => {
    if (allTestCases.length === 0) {
      // No test cases, just run the code with no input
      setIsRunning(true);
      setBottomTab("result");
      setOverallVerdict("running");
      setTestResults([]);

      const result = await executeCode("");
      const testResult: TestCaseResult = {
        input: "(no input)",
        expectedOutput: "(no expected output)",
        actualOutput: result.output || result.error || "(no output)",
        passed: false,
        error: result.error,
      };
      setTestResults([testResult]);
      setActiveResultIdx(0);
      setOverallVerdict(result.error ? "error" : "accepted");
      setPassedCount(0);
      setTotalCount(0);
      setIsRunning(false);
      return;
    }

    // Run against visible test cases (up to first 3 from original + all custom)
    const casesToRun = [
      ...testCases.slice(0, 3),
      ...customTestCases,
    ];

    setIsRunning(true);
    setBottomTab("result");
    setOverallVerdict("running");
    setTestResults([]);
    setActiveResultIdx(0);
    setRuntime(null);

    const startTime = Date.now();
    const results: TestCaseResult[] = [];

    for (let i = 0; i < casesToRun.length; i++) {
      const tc = casesToRun[i];
      const result = await executeCode(tc.input);
      const expectedNorm = normalizeOutput(tc.output);
      const actualNorm = normalizeOutput(result.output || "");
      const passed = !result.error && actualNorm === expectedNorm;

      results.push({
        input: tc.input,
        expectedOutput: tc.output,
        actualOutput: result.error
          ? `Error: ${result.error}`
          : result.output || "(no output)",
        passed,
        error: result.error,
      });

      // Update results progressively
      setTestResults([...results]);
    }

    const elapsed = Date.now() - startTime;
    setRuntime(elapsed);

    const passed = results.filter((r) => r.passed).length;
    setPassedCount(passed);
    setTotalCount(results.length);

    if (results.every((r) => r.passed)) {
      setOverallVerdict("accepted");
    } else if (results.some((r) => r.error)) {
      setOverallVerdict("error");
    } else {
      setOverallVerdict("wrong_answer");
    }

    setIsRunning(false);
  };

  // ---------- SUBMIT: Run against ALL test cases ----------
  const handleSubmit = async () => {
    if (testCases.length === 0) {
      handleRun();
      return;
    }

    setIsSubmitting(true);
    setBottomTab("result");
    setOverallVerdict("running");
    setTestResults([]);
    setActiveResultIdx(0);
    setRuntime(null);

    const startTime = Date.now();
    const results: TestCaseResult[] = [];

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const result = await executeCode(tc.input);
      const expectedNorm = normalizeOutput(tc.output);
      const actualNorm = normalizeOutput(result.output || "");
      const passed = !result.error && actualNorm === expectedNorm;

      results.push({
        input: tc.input,
        expectedOutput: tc.output,
        actualOutput: result.error
          ? `Error: ${result.error}`
          : result.output || "(no output)",
        passed,
        error: result.error,
      });

      setTestResults([...results]);

      // Early exit on first failure for faster feedback
      if (!passed) {
        // Still run the rest but mark remaining as not-run
        for (let j = i + 1; j < testCases.length; j++) {
          results.push({
            input: testCases[j].input,
            expectedOutput: testCases[j].output,
            actualOutput: "(not executed)",
            passed: false,
          });
        }
        setTestResults([...results]);
        break;
      }
    }

    const elapsed = Date.now() - startTime;
    setRuntime(elapsed);

    const passed = results.filter((r) => r.passed).length;
    setPassedCount(passed);
    setTotalCount(testCases.length);

    if (results.every((r) => r.passed)) {
      setOverallVerdict("accepted");
    } else if (results.some((r) => r.error)) {
      setOverallVerdict("error");
    } else {
      setOverallVerdict("wrong_answer");
    }

    setIsSubmitting(false);
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
    value: string
  ) => {
    setCustomTestCases((prev) =>
      prev.map((tc, i) => (i === customIdx ? { ...tc, [field]: value } : tc))
    );
  };

  // ---------- Verdict display helpers ----------
  const verdictConfig = {
    idle: { label: "Ready", color: "text-gray-500", bg: "" },
    running: { label: "Running...", color: "text-yellow-600", bg: "" },
    accepted: {
      label: "Accepted",
      color: "text-green-600",
      bg: "bg-green-50",
    },
    wrong_answer: {
      label: "Wrong Answer",
      color: "text-red-600",
      bg: "bg-red-50",
    },
    error: {
      label: "Runtime Error",
      color: "text-red-600",
      bg: "bg-red-50",
    },
    partial: {
      label: "Partially Accepted",
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
  };

  const isProcessing = isRunning || isSubmitting;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* ═══════ Top Controls ═══════ */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white sticky top-0 z-10">
        <div>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="px-2 py-1 bg-gray-50 text-gray-700 rounded text-xs"
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
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 hover:bg-gray-100 rounded"
            title={isDarkMode ? "Light mode" : "Dark mode"}
          >
            <Moon className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded" title="Settings">
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(code)}
            className="p-2 hover:bg-gray-100 rounded"
            title="Copy code"
          >
            <Copy className="w-4 h-4" />
          </button>

          {/* RUN */}
          <button
            onClick={handleRun}
            disabled={isProcessing}
            className="px-4 py-1.5 bg-black text-white text-xs rounded flex items-center gap-2 hover:bg-gray-800 disabled:opacity-50 transition-colors"
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
            className="px-4 py-1.5 bg-green-600 text-white text-xs rounded flex items-center gap-2 hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            SUBMIT
          </button>

          {/* PUBLISH */}
          {questionId && (
            <button
              onClick={() => setShowPublishModal(true)}
              className="px-4 py-1.5 bg-gray-100 text-black text-xs rounded flex items-center gap-2 hover:bg-gray-200 transition-colors"
            >
              <Upload className="w-4 h-4" />
              PUBLISH
            </button>
          )}
        </div>
      </div>

      {/* ═══════ Monaco Editor ═══════ */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={language === "cpp" ? "cpp" : language}
          theme={isDarkMode ? "vs-dark" : "vs-light"}
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
          isResizing ? "bg-black" : "bg-transparent hover:bg-gray-300"
        }`}
        style={{ minHeight: "1px" }}
      />

      {/* ═══════ Bottom Panel ═══════ */}
      <div
        style={{ height: `${consoleHeight}px` }}
        className="bg-white flex flex-col border-t"
      >
        {/* Bottom Tabs */}
        <div className="flex items-center border-b bg-gray-50 px-2">
          <button
            onClick={() => setBottomTab("testcase")}
            className={`px-4 py-2 font-mono text-xs tracking-wider transition-colors border-b-2 ${
              bottomTab === "testcase"
                ? "text-black border-black font-bold"
                : "text-gray-500 border-transparent hover:text-black"
            }`}
          >
            Testcase
          </button>
          <button
            onClick={() => setBottomTab("result")}
            className={`px-4 py-2 font-mono text-xs tracking-wider transition-colors border-b-2 flex items-center gap-2 ${
              bottomTab === "result"
                ? "text-black border-black font-bold"
                : "text-gray-500 border-transparent hover:text-black"
            }`}
          >
            Test Result
            {overallVerdict !== "idle" && overallVerdict !== "running" && (
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  overallVerdict === "accepted"
                    ? "bg-green-500"
                    : "bg-red-500"
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
                      className="p-1.5 text-gray-400 hover:text-black transition-colors"
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
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                            rows={3}
                            placeholder="Enter test input..."
                          />
                        ) : (
                          <pre className="px-3 py-2 bg-gray-50 border border-gray-200 rounded font-mono text-sm text-gray-800 whitespace-pre-wrap">
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
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                            rows={2}
                            placeholder="Enter expected output..."
                          />
                        ) : (
                          <pre className="px-3 py-2 bg-gray-50 border border-gray-200 rounded font-mono text-sm text-gray-800 whitespace-pre-wrap">
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
                      className={`mb-4 p-4 rounded-lg border ${verdictConfig[overallVerdict].bg} ${
                        overallVerdict === "accepted"
                          ? "border-green-200"
                          : overallVerdict === "wrong_answer" ||
                              overallVerdict === "error"
                            ? "border-red-200"
                            : "border-yellow-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {overallVerdict === "accepted" ? (
                            <CircleCheck className="w-6 h-6 text-green-600" />
                          ) : (
                            <CircleX className="w-6 h-6 text-red-600" />
                          )}
                          <div>
                            <h3
                              className={`text-lg font-bold ${verdictConfig[overallVerdict].color}`}
                            >
                              {verdictConfig[overallVerdict].label}
                            </h3>
                            {totalCount > 0 && (
                              <p className="text-xs font-mono text-gray-600 mt-0.5">
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
                            <p className="font-mono text-sm font-bold text-gray-800">
                              {runtime}ms
                            </p>
                          </div>
                        )}
                      </div>
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
                            ? "bg-black text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {result.passed ? (
                          <CircleCheck
                            className={`w-3 h-3 ${activeResultIdx === idx ? "text-green-300" : "text-green-600"}`}
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
                        <pre className="px-3 py-2 bg-gray-50 border border-gray-200 rounded font-mono text-sm text-gray-800 whitespace-pre-wrap">
                          {testResults[activeResultIdx].input || "(empty)"}
                        </pre>
                      </div>

                      {/* Expected vs Actual - side by side on wider screens */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="font-mono text-xs text-gray-500 tracking-wider block mb-1">
                            EXPECTED OUTPUT
                          </label>
                          <pre className="px-3 py-2 bg-gray-50 border border-gray-200 rounded font-mono text-sm text-gray-800 whitespace-pre-wrap">
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
                                ? "bg-green-50 border-green-200 text-green-800"
                                : testResults[activeResultIdx].actualOutput ===
                                    "(not executed)"
                                  ? "bg-gray-50 border-gray-200 text-gray-500"
                                  : "bg-red-50 border-red-200 text-red-800"
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
    </div>
  );
}
