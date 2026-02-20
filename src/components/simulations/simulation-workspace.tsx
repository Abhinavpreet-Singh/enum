"use client";

import { useState, useEffect } from "react";
import {
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import Editor from "@monaco-editor/react";
import Link from "next/link";
import type { Simulation, SimulationFile } from "@/data/simulations";
import LivePreview from "./live-preview";

interface SimulationWorkspaceProps {
  simulation: Simulation;
}

type TabType = "preview" | "console" | "solution";

export default function SimulationWorkspace({
  simulation,
}: SimulationWorkspaceProps) {
  const [activeFile, setActiveFile] = useState<SimulationFile>(
    simulation.initialFiles[0],
  );
  const [files, setFiles] = useState<Record<string, string>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("preview");
  const [isResolved, setIsResolved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSolution, setShowSolution] = useState(false);

  // Resizable panels
  const [leftPanelWidth, setLeftPanelWidth] = useState(300);
  const [rightPanelWidth, setRightPanelWidth] = useState(400);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);

  // Initialize files
  useEffect(() => {
    const initialFiles: Record<string, string> = {};
    simulation.initialFiles.forEach((file) => {
      initialFiles[file.name] = file.content;
    });
    setFiles(initialFiles);
  }, [simulation]);

  // Left panel resize handler
  const handleLeftResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingLeft(true);
    const startX = e.clientX;
    const startWidth = leftPanelWidth;

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      setLeftPanelWidth(Math.min(Math.max(250, startWidth + delta), 500));
    };

    const onUp = () => {
      setIsResizingLeft(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // Right panel resize handler
  const handleRightResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingRight(true);
    const startX = e.clientX;
    const startWidth = rightPanelWidth;

    const onMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX;
      setRightPanelWidth(Math.min(Math.max(300, startWidth + delta), 600));
    };

    const onUp = () => {
      setIsResizingRight(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // Handle code change
  const handleCodeChange = (value: string | undefined) => {
    if (activeFile) {
      setFiles((prev) => ({
        ...prev,
        [activeFile.name]: value || "",
      }));
    }
    // Auto-update preview for frontend simulations on code change
    if (simulation.id === "frontend-homepage-crash") {
      setActiveTab("preview");
    }
  };

  // Run code
  const handleRun = async () => {
    setIsRunning(true);
    setError(null);
    setConsoleOutput(["Running code..."]);
    setActiveTab("console");

    try {
      // Prepare code to run - combine all files if needed
      const mainFile = files[activeFile.name] || "";

      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: "javascript",
          code: mainFile,
          input: "",
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setConsoleOutput((prev) => [...prev, `Error: ${data.error}`]);
      } else {
        const output =
          data.output || data.stdout || "Code executed successfully";
        setConsoleOutput((prev) => [...prev, output]);

        // Check if solution is correct
        checkSolution();
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Execution failed";
      setError(errorMsg);
      setConsoleOutput((prev) => [...prev, `Error: ${errorMsg}`]);
    } finally {
      setIsRunning(false);
    }
  };

  // Check if the current code matches the solution
  const checkSolution = () => {
    let allCorrect = true;

    for (const [fileName, solutionCode] of Object.entries(
      simulation.solution,
    )) {
      const userCode = files[fileName]?.trim().replace(/\s+/g, " ");
      const solution = solutionCode.trim().replace(/\s+/g, " ");

      // Normalize whitespace and compare
      if (userCode !== solution) {
        allCorrect = false;
        break;
      }
    }

    setIsResolved(allCorrect);
  };

  // View solution - load solution code into editor
  const handleViewSolution = () => {
    const solutionFiles: Record<string, string> = {};
    simulation.initialFiles.forEach((file) => {
      if (simulation.solution[file.name]) {
        solutionFiles[file.name] = simulation.solution[file.name];
      } else {
        solutionFiles[file.name] = file.content;
      }
    });
    setFiles(solutionFiles);
    setShowSolution(true);
    setActiveTab("solution");
  };

  // Reset to initial code
  const handleReset = () => {
    const initialFiles: Record<string, string> = {};
    simulation.initialFiles.forEach((file) => {
      initialFiles[file.name] = file.content;
    });
    setFiles(initialFiles);
    setConsoleOutput([]);
    setError(null);
    setIsResolved(false);
  };

  // Render preview based on simulation type
  const renderPreview = () => {
    // Frontend Homepage Crash - Hydration Error
    if (simulation.id === "frontend-homepage-crash") {
      const navCode = files["Nav.tsx"] || "";

      // Check if code has the bug (window.innerWidth without useEffect)
      const hasBug =
        navCode.includes("window.innerWidth") && !navCode.includes("useEffect");

      if (hasBug) {
        // Show hydration error - white screen
        return (
          <div className="h-full flex flex-col bg-white">
            <div className="p-4 bg-red-50 border-b border-red-200">
              <p className="text-xs text-red-600 font-mono">
                ⚠️ Unhandled Runtime Error
              </p>
            </div>
            <div className="flex-1 flex items-center justify-center bg-white">
              <div className="text-center">
                <div className="text-6xl mb-4">💥</div>
                <p className="text-lg font-bold text-gray-900 mb-2">
                  Hydration Error
                </p>
                <p className="text-sm text-gray-600 max-w-md">
                  Text content does not match server-rendered HTML.
                </p>
                <p className="text-xs text-gray-500 mt-2 font-mono">
                  ReferenceError: window is not defined
                </p>
              </div>
            </div>
          </div>
        );
      }

      // Show working website
      return (
        <div className="h-full flex flex-col bg-white">
          {/* Mock Navigation */}
          <nav className="border-b border-gray-200 p-4">
            <ul className="flex gap-6">
              <li className="text-sm font-medium text-gray-900 hover:text-gray-600 cursor-pointer">
                Home
              </li>
              <li className="text-sm font-medium text-gray-900 hover:text-gray-600 cursor-pointer">
                About
              </li>
            </ul>
          </nav>

          {/* Main content */}
          <main className="flex-1 p-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome</h1>
            <p className="text-gray-600">
              The homepage is now working correctly! The navigation renders
              without hydration errors.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-semibold">No errors detected</span>
            </div>
          </main>
        </div>
      );
    }

    // Memory Leak - Event Listeners
    if (simulation.id === "memory-leak-event-listeners") {
      const dashboardCode = files["Dashboard.tsx"] || "";
      const hasBug = !dashboardCode.includes("return () =>");

      if (hasBug) {
        return (
          <div className="h-full flex flex-col bg-white">
            <div className="p-3 bg-orange-50 border-b border-orange-200">
              <p className="text-xs text-orange-600 font-mono">
                ⚠️ Memory Usage Warning
              </p>
            </div>
            <div className="flex-1 p-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Dashboard
              </h1>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Mouse Position</p>
                  <p className="text-sm font-mono">0, 0</p>
                </div>
                <div className="p-4 bg-gray-50 rounded border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Window Size</p>
                  <p className="text-sm font-mono">0 x 0</p>
                </div>
              </div>

              {/* Memory leak indicator */}
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-700 mb-1">
                      Memory Leak Detected
                    </p>
                    <p className="text-xs text-red-600 leading-relaxed">
                      Event listeners are not being cleaned up. Memory usage
                      increases on every re-render.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 bg-red-200 rounded-full h-2">
                        <div
                          className="bg-red-600 h-2 rounded-full animate-pulse"
                          style={{ width: "85%" }}
                        />
                      </div>
                      <span className="text-xs font-mono text-red-700">
                        85% memory used
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="h-full flex flex-col bg-white">
          <div className="p-3 bg-green-50 border-b border-green-200">
            <p className="text-xs text-green-600 font-mono">✓ Memory stable</p>
          </div>
          <div className="flex-1 p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h1>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-gray-50 rounded border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Mouse Position</p>
                <p className="text-sm font-mono">0, 0</p>
              </div>
              <div className="p-4 bg-gray-50 rounded border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Window Size</p>
                <p className="text-sm font-mono">1920 x 1080</p>
              </div>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-semibold">
                Event listeners properly cleaned up
              </span>
            </div>
          </div>
        </div>
      );
    }

    // Infinite Loop - useEffect
    if (simulation.id === "infinite-loop-useeffect") {
      const profileCode = files["UserProfile.tsx"] || "";
      const hasBug = profileCode.includes(", [user]");

      if (hasBug) {
        return (
          <div className="h-full flex flex-col bg-white">
            <div className="p-3 bg-red-50 border-b border-red-200 animate-pulse">
              <p className="text-xs text-red-600 font-mono">
                ⚠️ Page Unresponsive - Infinite Loop
              </p>
            </div>
            <div className="flex-1 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <Loader2 className="w-16 h-16 text-gray-400 animate-spin mx-auto mb-4" />
                <p className="text-lg font-bold text-gray-900 mb-2">
                  Browser Not Responding
                </p>
                <p className="text-sm text-gray-600 max-w-md mb-4">
                  The page is stuck in an infinite render loop.
                </p>
                <div className="text-xs font-mono text-red-600 bg-red-50 px-3 py-2 rounded inline-block">
                  Too many re-renders. React limits the number of renders to
                  prevent infinite loop.
                </div>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="h-full flex flex-col bg-white">
          <div className="flex-1 p-8">
            <div className="max-w-md">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                John Doe
              </h1>
              <p className="text-gray-600 mb-6">john.doe@example.com</p>

              <div className="p-4 bg-gray-50 rounded border border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Account Status</p>
                <p className="text-sm font-semibold text-green-600">Active</p>
              </div>

              <div className="mt-6 inline-flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-semibold">
                  Component renders correctly
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Default preview for backend/other simulations
    if (error) {
      return (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">⚠️</div>
          <p className="text-red-600 font-mono text-sm mb-2">
            Application Error
          </p>
          <p className="text-gray-600 text-xs">{error}</p>
        </div>
      );
    }

    if (isResolved) {
      return (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-green-600 font-semibold text-lg mb-2">
            Application Running Successfully!
          </p>
          <p className="text-gray-600 text-sm">
            The bug has been fixed and the app is working correctly.
          </p>
        </div>
      );
    }

    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🔄</div>
        <p className="text-gray-600 text-sm">AWAITING FIX...</p>
        <p className="text-gray-400 text-xs mt-2">
          Run your code to see the preview
        </p>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <Link
          href="/dashboard/simulations"
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-black transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Simulations
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            {simulation.category} · {simulation.estimatedTime} min
          </span>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Task Description */}
        <div
          className="bg-white border-r border-gray-200 flex flex-col"
          style={{ width: `${leftPanelWidth}px` }}
        >
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isResolved ? "bg-green-500" : "bg-red-500"
                } animate-pulse`}
              />
              <h2 className="text-sm font-bold text-gray-900">
                {simulation.title}
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`px-2 py-0.5 rounded border ${
                  simulation.difficulty === "easy"
                    ? "bg-white border-gray-300 text-gray-700"
                    : simulation.difficulty === "medium"
                      ? "bg-gray-100 border-gray-400 text-gray-800"
                      : "bg-gray-900 border-black text-white"
                }`}
              >
                {simulation.difficulty}
              </span>
              <span className="text-gray-500">
                {simulation.estimatedTime} min
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Incident */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Incident
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {simulation.description}
              </p>
            </div>

            {/* Error Message */}
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded">
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-red-700 mb-1">ERROR:</p>
                  <p className="text-xs text-red-600 leading-relaxed">
                    {simulation.incident}
                  </p>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                Steps
              </h3>
              <ol className="space-y-2">
                {simulation.steps.map((step, idx) => (
                  <li key={idx} className="flex gap-2 text-sm text-gray-700">
                    <span className="text-gray-400">{idx + 1}.</span>
                    <span>{step.description}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Hints */}
            {simulation.hints && simulation.hints.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Hints
                </h3>
                <div className="space-y-2">
                  {simulation.hints.map((hint, idx) => (
                    <details key={idx} className="group">
                      <summary className="cursor-pointer text-xs text-gray-700 hover:text-black flex items-center gap-1 font-medium">
                        <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
                        Hint {idx + 1}
                      </summary>
                      <p className="mt-2 ml-4 text-xs text-gray-600 leading-relaxed">
                        {hint}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Left Resize Handle */}
        <div
          className={`w-1 bg-gray-200 hover:bg-gray-400 cursor-col-resize transition-colors ${
            isResizingLeft ? "bg-gray-500" : ""
          }`}
          onMouseDown={handleLeftResize}
        />

        {/* Middle Panel - Code Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* File Tabs */}
          <div className="bg-white border-b border-gray-200 flex items-center gap-2 px-4 py-2">
            {simulation.initialFiles.map((file) => (
              <button
                key={file.name}
                onClick={() => setActiveFile(file)}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  activeFile?.name === file.name
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {file.name}
              </button>
            ))}
          </div>

          {/* Editor */}
          <div className="flex-1 bg-white">
            <Editor
              height="100%"
              language={activeFile?.language || "javascript"}
              value={files[activeFile?.name] || ""}
              onChange={handleCodeChange}
              theme="vs-light"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
              }}
            />
          </div>

          {/* Action Bar */}
          <div className="bg-white border-t border-gray-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleRun}
                disabled={isRunning}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isRunning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Run
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded hover:border-gray-400 hover:bg-gray-50 transition-colors font-medium"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={handleViewSolution}
                className="flex items-center gap-2 px-4 py-2 border-2 border-black text-black rounded hover:bg-black hover:text-white transition-colors font-medium"
              >
                <CheckCircle2 className="w-4 h-4" />
                View Solution
              </button>
            </div>

            {isResolved && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold">
                  Issue Resolved! +{simulation.xpReward} XP
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Resize Handle */}
        <div
          className={`w-1 bg-gray-200 hover:bg-gray-400 cursor-col-resize transition-colors ${
            isResizingRight ? "bg-gray-500" : ""
          }`}
          onMouseDown={handleRightResize}
        />

        {/* Right Panel - Preview/Console */}
        <div
          className="bg-white border-l border-gray-200 flex flex-col"
          style={{ width: `${rightPanelWidth}px` }}
        >
          {/* Tabs */}
          <div className="border-b border-gray-200 flex">
            <button
              onClick={() => setActiveTab("preview")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "preview"
                  ? "bg-white text-black border-b-2 border-black"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => setActiveTab("console")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "console"
                  ? "bg-white text-black border-b-2 border-black"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              Console
            </button>
            <button
              onClick={() => setActiveTab("solution")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "solution"
                  ? "bg-white text-black border-b-2 border-black"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              Solution
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "preview" && (
              <div className="p-4">
                <div className="mb-3 flex items-center gap-2 text-sm">
                  <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 px-3 py-1 bg-gray-100 rounded text-gray-600 text-xs">
                    localhost:3000
                  </div>
                </div>
                <div className="border border-gray-200 rounded min-h-100 bg-white overflow-hidden">
                  {[
                    "frontend-homepage-crash",
                    "memory-leak-event-listeners",
                    "infinite-loop-useeffect",
                  ].includes(simulation.id) ? (
                    <LivePreview files={files} simulationId={simulation.id} />
                  ) : (
                    <div className="p-4">{renderPreview()}</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "console" && (
              <div className="p-4 font-mono text-xs">
                {consoleOutput.length === 0 ? (
                  <div className="text-gray-400 text-center py-8">
                    Console output will appear here...
                  </div>
                ) : (
                  <div className="space-y-1">
                    {consoleOutput.map((line, idx) => (
                      <div
                        key={idx}
                        className={`${
                          line.startsWith("Error")
                            ? "text-red-600"
                            : line.startsWith("Running")
                              ? "text-gray-600"
                              : "text-gray-700"
                        }`}
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══ SOLUTION TAB ═══ */}
            {activeTab === "solution" && (
              <div className="p-4">
                <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded">
                  <h3 className="text-sm font-bold text-gray-900 mb-2">
                    💡 Solution Explanation
                  </h3>
                  <p className="text-xs text-gray-700 leading-relaxed mb-3">
                    {simulation.description}
                  </p>
                  <div className="text-xs text-gray-600">
                    <p className="font-semibold mb-1">The fix:</p>
                    {simulation.hints && simulation.hints.length > 0 && (
                      <p className="leading-relaxed">
                        {simulation.hints[simulation.hints.length - 1]}
                      </p>
                    )}
                  </div>
                </div>

                {/* Solution Code */}
                <div className="space-y-4">
                  {Object.entries(simulation.solution).map(
                    ([fileName, code]) => (
                      <div key={fileName}>
                        <div className="flex items-center justify-between mb-2">
                          <label className="font-mono text-xs font-bold text-gray-700">
                            {fileName}
                          </label>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(code);
                            }}
                            className="text-xs px-2 py-1 bg-black text-white rounded hover:bg-gray-800 transition-colors"
                          >
                            Copy
                          </button>
                        </div>
                        <pre className="px-4 py-3 bg-gray-900 text-gray-100 rounded font-mono text-xs overflow-x-auto border border-gray-700">
                          {code}
                        </pre>
                      </div>
                    ),
                  )}
                </div>

                {!showSolution && (
                  <div className="mt-4 p-3 bg-gray-50 border border-gray-300 rounded">
                    <p className="text-xs text-gray-700">
                      💡 Tip: Click &quot;View Solution&quot; button to load the
                      solution code into the editor
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
