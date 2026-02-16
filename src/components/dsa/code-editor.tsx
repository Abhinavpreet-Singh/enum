"use client";

import { useMemo, useRef, useState } from "react";
import { Moon, Play, Check, Copy, Settings } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { prism } from "react-syntax-highlighter/dist/esm/styles/prism";

interface CodeEditorProps {
  initialCode: string;
}

const languageOptions = [
  { label: "Python", value: "python" },
  { label: "Java", value: "java" },
  { label: "C", value: "c" },
  { label: "C++", value: "cpp" },
];

const RUN_API_URL = "http://enum-compiler.duckdns.org/run";

export default function CodeEditor({ initialCode }: CodeEditorProps) {
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState(languageOptions[0].value);
  const [isRunning, setIsRunning] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState("");
  const [testResults, setTestResults] = useState<
    "idle" | "running" | "passed" | "failed"
  >("idle");

  const lineCount = useMemo(() => code.split("\n").length, [code]);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const syncScroll = (event: React.UIEvent<HTMLTextAreaElement>) => {
    const target = event.currentTarget;
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = target.scrollTop;
    }
    if (highlightRef.current) {
      highlightRef.current.scrollTop = target.scrollTop;
      highlightRef.current.scrollLeft = target.scrollLeft;
    }
  };

  const handleRun = async () => {
    setIsRunning(true);
    setTestResults("running");
    setConsoleOutput("Running...\n");

    try {
      const response = await fetch(RUN_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language,
          code,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setTestResults("failed");
        setConsoleOutput(
          data?.error || data?.message || "Execution failed. Try again.",
        );
        return;
      }

      const output =
        data?.output ??
        data?.stdout ??
        data?.result ??
        data?.data ??
        JSON.stringify(data, null, 2);
      setTestResults("passed");
      setConsoleOutput(output || "(no output)");
    } catch (error) {
      setTestResults("failed");
      setConsoleOutput(
        error instanceof Error ? error.message : "Unknown error",
      );
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = () => {
    handleRun();
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Top Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className="px-2 py-1 bg-gray-100 text-gray-700 rounded font-mono text-xs tracking-wide border border-gray-200 focus:outline-none"
          >
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors">
            <Settings className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors">
            <Moon className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(code);
            }}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-gray-200" />
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="px-4 py-1.5 bg-gray-100 text-black font-mono text-xs tracking-wider hover:bg-gray-200 transition-colors rounded border border-gray-300 flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            RUN CODE
          </button>
          <button
            onClick={handleSubmit}
            disabled={isRunning}
            className="px-4 py-1.5 bg-black text-white font-mono text-xs tracking-wider hover:bg-gray-900 transition-colors rounded flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            SUBMIT
          </button>
        </div>
      </div>

      {/* Editor & Output Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Code Editor */}
        <div className="flex-1 flex overflow-hidden border-b border-gray-200 min-h-96">
          {/* Line Numbers */}
          <div
            ref={lineNumbersRef}
            className="bg-gray-50 border-r border-gray-200 px-3 py-4 font-mono text-xs text-gray-500 select-none overflow-y-auto"
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i} className="h-5 leading-5">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Text Area + Highlight */}
          <div className="relative flex-1">
            <div
              ref={highlightRef}
              className="absolute inset-0 overflow-auto pointer-events-none"
            >
              <SyntaxHighlighter
                language={language}
                style={prism}
                wrapLongLines
                customStyle={{
                  margin: 0,
                  background: "transparent",
                  fontSize: "0.875rem",
                  lineHeight: "1.25rem",
                  padding: "1rem",
                }}
                codeTagProps={{
                  style: {
                    fontFamily: "var(--font-mono)",
                  },
                }}
              >
                {code || " "}
              </SyntaxHighlighter>
            </div>
            <textarea
              value={code}
              onChange={(event) => setCode(event.target.value)}
              onScroll={syncScroll}
              className="absolute inset-0 px-4 py-4 font-mono text-sm leading-5 resize-none focus:outline-none bg-transparent text-transparent caret-black"
              spellCheck="false"
            />
          </div>
        </div>

        {/* Console/Output */}
        <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden max-h-48">
          {/* Console Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between">
            <span className="font-mono text-xs tracking-wider text-black font-bold">
              TEST RESULT
            </span>
            <span
              className={`text-xs font-mono tracking-wide ${
                testResults === "passed"
                  ? "text-green-600"
                  : testResults === "failed"
                    ? "text-red-600"
                    : "text-gray-500"
              }`}
            >
              {testResults === "idle"
                ? "Not Run"
                : testResults === "running"
                  ? "Running..."
                  : testResults === "passed"
                    ? "Passed"
                    : "Failed"}
            </span>
          </div>

          {/* Console Output */}
          <div className="flex-1 overflow-auto p-4 space-y-2 text-sm font-mono">
            {testResults === "idle" && !consoleOutput && (
              <div className="text-gray-400 text-center py-8">
                <p className="text-xs">Click Run Code to execute</p>
              </div>
            )}
            {testResults === "running" && (
              <div className="text-gray-600">
                <p className="text-xs">Running test cases...</p>
              </div>
            )}
            {testResults !== "running" && consoleOutput && (
              <pre className="whitespace-pre-wrap text-xs text-gray-700">
                {consoleOutput}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
