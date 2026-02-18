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
  const [testResults, setTestResults] =
    useState<"idle" | "running" | "passed" | "failed">("idle");
  const [isDarkMode, setIsDarkMode] = useState(true);

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
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs border"
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

          <button
            className="p-2 hover:bg-gray-100 rounded"
            title="Settings"
          >
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
            className="px-4 py-1.5 bg-black text-white text-xs rounded flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            RUN
          </button>

          <button
            onClick={handleRun}
            disabled={isRunning}
            className="px-4 py-1.5 bg-gray-100 text-black text-xs rounded flex items-center gap-2 border"
          >
            <Check className="w-4 h-4" />
            SUBMIT
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={language === "cpp" ? "cpp" : language}
          theme={isDarkMode ? "vs-dark" : "vs-light"}
          value={code}
          onChange={(value) => setCode(value || "")}
          options={{
            fontSize: 14,
            fontFamily: "Fira Code, monospace",
            minimap: { enabled: true },
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
          }}
        />
      </div>

      {/* Output */}
      <div className="h-40 border-t bg-gray-50 p-4 overflow-auto font-mono text-xs">
        {testResults === "running" && <p>Running...</p>}
        {consoleOutput && <pre>{consoleOutput}</pre>}
      </div>
    </div>
  );
}
