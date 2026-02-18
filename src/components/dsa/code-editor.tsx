"use client";

import { useState } from "react";
import { Moon, Play, Check, Copy, Settings } from "lucide-react";
import Editor from "@monaco-editor/react";

interface CodeEditorProps {
  initialCode: string;
}

const languageOptions = [
  { label: "Python", value: "python" },
  { label: "Java", value: "java" },
  { label: "C", value: "c" },
  { label: "C++", value: "cpp" },
];

const RUN_API_URL = "/api/run";

export default function CodeEditor({ initialCode }: CodeEditorProps) {
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState("python");
  const [isRunning, setIsRunning] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState("");
  const [testResults, setTestResults] = useState<
    "idle" | "running" | "passed" | "failed"
  >("idle");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [consoleHeight, setConsoleHeight] = useState(192); // pixels
  const [isResizing, setIsResizing] = useState(false);

  const handleConsoleResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.classList.add("resize-active");
    const startY = e.clientY;
    const startHeight = consoleHeight;
    let animationFrameId: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = requestAnimationFrame(() => {
        const deltaY = startY - e.clientY;
        const newHeight = Math.min(Math.max(100, startHeight + deltaY), 600);
        setConsoleHeight(newHeight);
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.classList.remove("resize-active");
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
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

      const data = await response.json();
      const output =
        data?.output ??
        data?.stdout ??
        data?.result ??
        JSON.stringify(data, null, 2);

      setTestResults("passed");
      setConsoleOutput(output || "(no output)");
    } catch (error) {
      setTestResults("failed");
      setConsoleOutput(
        error instanceof Error ? error.message : "Execution failed",
      );
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Top Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white sticky top-0 z-10">
        <div>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-2 py-1 bg-gray-50 text-gray-700 rounded text-xs"
          >
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 hover:bg-gray-100 rounded"
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            <Moon className="w-4 h-4" />
          </button>

          <button className="p-2 hover:bg-gray-100 rounded" title="Settings">
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={() => navigator.clipboard.writeText(code)}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            onClick={handleRun}
            disabled={isRunning}
            className="px-4 py-1.5 bg-black text-white text-xs rounded flex items-center gap-2 hover:bg-gray-800 disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            RUN
          </button>

          <button
            onClick={handleRun}
            disabled={isRunning}
            className="px-4 py-1.5 bg-gray-50 text-black text-xs rounded flex items-center gap-2 hover:bg-gray-100"
          >
            <Check className="w-4 h-4" />
            SUBMIT
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={language === "cpp" ? "cpp" : language}
          theme={isDarkMode ? "vs-dark" : "vs-light"}
          value={code}
          onChange={(value) => setCode(value || "")}
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

      {/* Horizontal Resize Handle */}
      <div
        onMouseDown={handleConsoleResize}
        className={`h-1 cursor-row-resize shrink-0 ${
          isResizing ? "bg-black" : "bg-transparent hover:bg-gray-300"
        }`}
        style={{ minHeight: "1px" }}
      />

      {/* Console/Terminal Output */}
      <div
        style={{ height: `${consoleHeight}px` }}
        className="bg-gray-50 flex flex-col"
      >
        {/* Console Header */}
        <div className="px-4 py-2 border-b bg-white flex items-center justify-between">
          <span className="font-mono text-xs tracking-wider text-black font-bold">
            CONSOLE
          </span>
          <span
            className={`text-xs font-mono ${
              testResults === "passed"
                ? "text-green-600"
                : testResults === "failed"
                  ? "text-red-600"
                  : "text-gray-500"
            }`}
          >
            {testResults === "idle"
              ? "Ready"
              : testResults === "running"
                ? "Running..."
                : testResults === "passed"
                  ? "✓ Success"
                  : "✗ Failed"}
          </span>
        </div>

        {/* Console Content */}
        <div className="flex-1 overflow-auto p-4 font-mono text-xs dark-scrollbar">
          {testResults === "idle" && !consoleOutput && (
            <div className="text-gray-400 text-center py-8">
              <p>Click RUN to execute your code</p>
            </div>
          )}
          {testResults === "running" && (
            <div className="text-gray-600">
              <p>Running your code...</p>
            </div>
          )}
          {consoleOutput && (
            <pre className="whitespace-pre-wrap text-gray-800">
              {consoleOutput}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
