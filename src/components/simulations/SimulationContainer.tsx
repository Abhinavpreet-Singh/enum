"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Play,
  RotateCcw,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  XCircle,
  PanelBottomClose,
  PanelBottomOpen,
  Save,
} from "lucide-react";
import Link from "next/link";
import type { Simulation, SimulationFile } from "@/data/simulations";
import type {
  FileNode,
  FileMap,
  SimulationRunResponse,
  SimulationEngineResponse,
  SimulationStatus,
} from "@/types/simulation";
import { fetchSimulationFiles } from "@/services/cloudinary";
import FileExplorer from "./FileExplorer";
import CodeEditor from "./CodeEditor";
import ConsolePanel from "./ConsolePanel";

interface SimulationContainerProps {
  simulation: Simulation;
}

/** Build a FileNode tree from a flat list of SimulationFiles */
function buildFileTree(files: SimulationFile[]): FileNode[] {
  const root: FileNode[] = [];
  const folderMap = new Map<string, FileNode>();

  const getOrCreateFolder = (segments: string[]): FileNode[] => {
    if (segments.length === 0) return root;

    const path = segments.join("/");
    const existing = folderMap.get(path);
    if (existing) return existing.children!;

    const parentChildren = getOrCreateFolder(segments.slice(0, -1));
    const folder: FileNode = {
      name: segments[segments.length - 1],
      path,
      type: "folder",
      children: [],
    };
    parentChildren.push(folder);
    folderMap.set(path, folder);
    return folder.children!;
  };

  for (const file of files) {
    const parts = file.path.split("/");
    const fileName = parts[parts.length - 1];
    const folderParts = parts.slice(0, -1);
    const parentChildren = getOrCreateFolder(folderParts);

    parentChildren.push({
      name: fileName,
      path: file.path,
      type: "file",
      language: file.language,
    });
  }

  // Sort: folders first, then alphabetical
  const sortNodes = (nodes: FileNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const n of nodes) {
      if (n.children) sortNodes(n.children);
    }
  };
  sortNodes(root);

  return root;
}

export default function SimulationContainer({
  simulation,
}: SimulationContainerProps) {
  // Files state
  const [files, setFiles] = useState<FileMap>({});
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Execution state
  const [status, setStatus] = useState<SimulationStatus>("idle");
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [isResolved, setIsResolved] = useState(false);

  // Layout state
  const [explorerWidth, setExplorerWidth] = useState(220);
  const [consoleHeight, setConsoleHeight] = useState(180);
  const [consoleVisible, setConsoleVisible] = useState(true);
  const [isResizingExplorer, setIsResizingExplorer] = useState(false);
  const [isResizingConsole, setIsResizingConsole] = useState(false);

  // Task panel
  const [taskPanelWidth, setTaskPanelWidth] = useState(280);
  const [isResizingTask, setIsResizingTask] = useState(false);

  // File tree
  const [fileTree, setFileTree] = useState<FileNode[]>([]);

  // Progress state
  const [progressLoaded, setProgressLoaded] = useState(false);

  // ── Check if simulation has Cloudinary-hosted files ───────────────────
  const hasCloudinaryFiles = simulation.initialFiles.some(
    (f) => f.cloudinaryUrl && f.cloudinaryUrl.length > 0,
  );

  // ── Derive initial file map from inline content (fallback) ───────────
  const buildInlineFileMap = useCallback((): FileMap => {
    const map: FileMap = {};
    simulation.initialFiles.forEach((f) => {
      map[f.path] = f.content;
    });
    return map;
  }, [simulation]);

  // ── Initialize file tree ─────────────────────────────────────────────
  useEffect(() => {
    setFileTree(buildFileTree(simulation.initialFiles));
  }, [simulation.initialFiles]);

  // ── Load files: from Cloudinary or inline ────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const loadFiles = async () => {
      // If Cloudinary URLs are present, fetch content from them
      if (hasCloudinaryFiles) {
        setLoadingFiles(true);
        try {
          const cloudinaryRefs = simulation.initialFiles
            .filter((f) => f.cloudinaryUrl)
            .map((f) => ({
              filename: f.path,
              cloudinaryUrl: f.cloudinaryUrl!,
            }));

          const fetched = await fetchSimulationFiles(cloudinaryRefs);

          if (!cancelled) {
            // Merge: Cloudinary content takes precedence, fallback to inline
            const map: FileMap = {};
            simulation.initialFiles.forEach((f) => {
              map[f.path] = fetched[f.path] ?? f.content;
            });
            setFiles(map);
          }
        } catch (err) {
          console.error("Error fetching Cloudinary files:", err);
          // Fallback to inline content
          if (!cancelled) setFiles(buildInlineFileMap());
        } finally {
          if (!cancelled) setLoadingFiles(false);
        }
      } else {
        // Use inline content directly
        setFiles(buildInlineFileMap());
      }

      // Set initial active tab
      if (!cancelled && simulation.initialFiles.length > 0) {
        const firstPath = simulation.initialFiles[0].path;
        setActiveFilePath(firstPath);
        setOpenTabs([firstPath]);
      }
    };

    loadFiles();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulation.id]);

  // ── Load user progress on mount ──────────────────────────────────────
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) return;

        const res = await fetch(
          `/api/simulations/progress?simulationId=${simulation.id}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (res.ok) {
          const data = await res.json();
          const progress = data.data;
          if (progress?.solved) setIsResolved(true);
          // Restore modified files if user had previous edits
          if (progress?.modifiedFiles && typeof progress.modifiedFiles === "object") {
            setFiles((prev) => ({ ...prev, ...progress.modifiedFiles }));
          }
        }
      } catch (err) {
        console.error("Failed to load progress:", err);
      } finally {
        setProgressLoaded(true);
      }
    };

    loadProgress();
  }, [simulation.id]);

  // ── Save progress helper ─────────────────────────────────────────────
  const persistProgress = useCallback(
    async (solved: boolean) => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) return;

        await fetch("/api/simulations/progress", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            simulationId: simulation.id,
            solved,
            modifiedFiles: files,
          }),
        });
      } catch (err) {
        console.error("Failed to persist progress:", err);
      }
    },
    [simulation.id, files],
  );

  // File selection
  const handleFileSelect = useCallback(
    (path: string) => {
      setActiveFilePath(path);
      setOpenTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
    },
    [],
  );

  // Close tab
  const handleCloseTab = useCallback(
    (path: string) => {
      setOpenTabs((prev) => {
        const next = prev.filter((p) => p !== path);
        if (activeFilePath === path) {
          setActiveFilePath(next.length > 0 ? next[next.length - 1] : null);
        }
        return next;
      });
    },
    [activeFilePath],
  );

  // Code change
  const handleCodeChange = useCallback((filePath: string, value: string) => {
    setFiles((prev) => ({ ...prev, [filePath]: value }));
  }, []);

  // Determine entry file for execution
  const getEntryFile = (): string => {
    // Use simulation-specified entry file first
    if (simulation.entryFile) return simulation.entryFile;
    // Fallback: prefer index.js, server.js, main.js, or the first .js file
    const candidates = ["index.js", "server.js", "main.js", "app.js"];
    for (const c of candidates) {
      if (files[c]) return c;
    }
    return simulation.initialFiles[0]?.path ?? "";
  };

  // Run simulation via Backend Simulation Engine (Docker + curl tests)
  const handleRun = async () => {
    setStatus("running");
    setConsoleVisible(true);
    const entryFile = getEntryFile();
    setConsoleOutput(["$ Running simulation engine...", ""]);

    try {
      const token = localStorage.getItem("accessToken");

      // Convert FileMap to editedFiles array for the engine
      const editedFiles = Object.entries(files).map(([filename, content]) => ({
        filename,
        content,
      }));

      const response = await fetch("/api/simulations/engine/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          simulationId: simulation.id,
          editedFiles,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const engineData = data as SimulationEngineResponse & { success: boolean };
        const allPassed = engineData.passedTests === engineData.totalTests && engineData.totalTests > 0;

        // Display Docker logs
        const logLines = (engineData.logs || "")
          .split("\n")
          .filter((l: string) => l.length > 0);
        setConsoleOutput((prev) => [
          ...prev,
          ...logLines,
          "",
          `Score: ${engineData.score}% (${engineData.passedTests}/${engineData.totalTests} tests passed)`,
        ]);

        if (allPassed) {
          setStatus("success");
          setConsoleOutput((prev) => [
            ...prev,
            "",
            "✓ All tests passed!",
          ]);
          setIsResolved(true);
          await persistProgress(true);
        } else {
          setStatus("error");
          setConsoleOutput((prev) => [
            ...prev,
            "",
            `✗ ${engineData.totalTests - engineData.passedTests} test(s) failed.`,
          ]);
          await persistProgress(false);
        }
      } else {
        setStatus("error");
        setConsoleOutput((prev) => [
          ...prev,
          `Error: ${data.error || "Execution failed"}`,
        ]);
        await persistProgress(false);
      }
    } catch (err) {
      setStatus("error");
      const msg = err instanceof Error ? err.message : "Network error";
      setConsoleOutput((prev) => [...prev, `Error: ${msg}`]);
    }
  };

  // Reset all files back to original content
  const handleReset = async () => {
    if (hasCloudinaryFiles) {
      // Re-fetch from Cloudinary
      setLoadingFiles(true);
      try {
        const cloudinaryRefs = simulation.initialFiles
          .filter((f) => f.cloudinaryUrl)
          .map((f) => ({
            filename: f.path,
            cloudinaryUrl: f.cloudinaryUrl!,
          }));

        const fetched = await fetchSimulationFiles(cloudinaryRefs);
        const map: FileMap = {};
        simulation.initialFiles.forEach((f) => {
          map[f.path] = fetched[f.path] ?? f.content;
        });
        setFiles(map);
      } catch {
        setFiles(buildInlineFileMap());
      } finally {
        setLoadingFiles(false);
      }
    } else {
      setFiles(buildInlineFileMap());
    }
    setConsoleOutput([]);
    setStatus("idle");
    setIsResolved(false);
  };

  // Save current file state to progress (manual save)
  const handleSaveProgress = async () => {
    await persistProgress(isResolved);
    setConsoleOutput((prev) => [
      ...prev,
      "✓ Progress saved.",
    ]);
  };

  // Clear console
  const handleClearConsole = () => {
    setConsoleOutput([]);
    setStatus("idle");
  };

  // Explorer resize
  const handleExplorerResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingExplorer(true);
    const startX = e.clientX;
    const startWidth = explorerWidth;

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      setExplorerWidth(Math.min(Math.max(140, startWidth + delta), 400));
    };
    const onUp = () => {
      setIsResizingExplorer(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // Console resize (vertical)
  const handleConsoleResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingConsole(true);
    const startY = e.clientY;
    const startHeight = consoleHeight;

    const onMove = (ev: MouseEvent) => {
      const delta = startY - ev.clientY;
      setConsoleHeight(Math.min(Math.max(80, startHeight + delta), 500));
    };
    const onUp = () => {
      setIsResizingConsole(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // Task panel resize
  const handleTaskResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingTask(true);
    const startX = e.clientX;
    const startWidth = taskPanelWidth;

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      setTaskPanelWidth(Math.min(Math.max(200, startWidth + delta), 450));
    };
    const onUp = () => {
      setIsResizingTask(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // Get language for active file
  const activeFileLanguage = (): string => {
    if (!activeFilePath) return "javascript";
    const file = simulation.initialFiles.find(
      (f) => f.path === activeFilePath,
    );
    return file?.language ?? "javascript";
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-black">
      {/* Top Bar */}
      <div className="bg-white dark:bg-black border-b border-gray-200 dark:border-white/10 px-4 py-3 flex items-center justify-between shrink-0">
        <Link
          href="/dashboard/simulations"
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Simulations
        </Link>

        <div className="flex items-center gap-3">
          {isResolved && (
            <div className="flex items-center gap-1.5 text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-semibold">
                Solved! +{simulation.xpReward} XP
              </span>
            </div>
          )}
          <span className="text-sm text-gray-500">
            {simulation.category} · {simulation.estimatedTime} min
          </span>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Task Description Panel */}
        <div
          className="bg-white dark:bg-black border-r border-gray-200 dark:border-white/10 flex flex-col shrink-0 overflow-hidden"
          style={{ width: `${taskPanelWidth}px` }}
        >
          <div className="p-4 border-b border-gray-200 dark:border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isResolved ? "bg-green-500" : "bg-red-500"
                } animate-pulse`}
              />
              <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {simulation.title}
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`px-2 py-0.5 rounded border ${
                  simulation.difficulty === "easy"
                    ? "bg-white dark:bg-white/10 border-gray-300 dark:border-white/10 text-gray-700 dark:text-white"
                    : simulation.difficulty === "medium"
                      ? "bg-white dark:bg-white/10 border-gray-400 dark:border-white/10 text-gray-800 dark:text-white"
                      : "bg-black dark:bg-black border-black dark:border-white/10 text-white"
                }`}
              >
                {simulation.difficulty}
              </span>
              <span className="text-gray-500 dark:text-gray-300">
                {simulation.estimatedTime} min
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Incident */}
            <div className="mb-5">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Incident
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                {simulation.description}
              </p>
            </div>

            {/* Error */}
            <div className="mb-5 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded">
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <div>
                  <p className="text-xs font-bold text-red-700 dark:text-red-200 mb-1">ERROR:</p>
                  <p className="text-xs text-red-600 dark:text-red-200 leading-relaxed">
                    {simulation.incident}
                  </p>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="mb-5">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Steps
              </h3>
              <ol className="space-y-2">
                {simulation.steps.map((step, idx) => (
                  <li key={idx} className="flex gap-2 text-sm text-gray-700 dark:text-gray-200">
                    <span className="text-gray-400 dark:text-gray-500">{idx + 1}.</span>
                    <span>{step.description}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Hints */}
            {simulation.hints && simulation.hints.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Hints
                </h3>
                <div className="space-y-2">
                  {simulation.hints.map((hint, idx) => (
                    <details key={idx} className="group">
                      <summary className="cursor-pointer text-xs text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white flex items-center gap-1 font-medium">
                        <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
                        Hint {idx + 1}
                      </summary>
                      <p className="mt-2 ml-4 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                        {hint}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Task panel resize handle */}
        <div
          className={`w-1 hover:bg-white/30 cursor-col-resize transition-colors shrink-0 ${
            isResizingTask ? "bg-white/50" : "bg-white/10"
          }`}
          onMouseDown={handleTaskResize}
        />

        {/* File Explorer */}
        <div
          className="shrink-0 border-r border-gray-200 dark:border-white/10 overflow-hidden"
          style={{ width: `${explorerWidth}px` }}
        >
          <FileExplorer
            tree={fileTree}
            activeFilePath={activeFilePath}
            onFileSelect={handleFileSelect}
          />
        </div>

        {/* Explorer resize handle */}
        <div
          className={`w-1 hover:bg-white/30 cursor-col-resize transition-colors shrink-0 ${
            isResizingExplorer ? "bg-white/50" : "bg-white/10"
          }`}
          onMouseDown={handleExplorerResize}
        />

        {/* Editor + Console area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Open file tabs */}
          <div className="bg-white dark:bg-black border-b border-gray-200 dark:border-white/10 flex items-center overflow-x-auto shrink-0">
            {openTabs.map((tabPath) => {
              const fileName = tabPath.split("/").pop() || tabPath;
              const isActive = tabPath === activeFilePath;

              return (
                <div
                  key={tabPath}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm border-r border-gray-200 dark:border-slate-700 cursor-pointer whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-white dark:bg-black text-black dark:text-white border-b-2 border-b-black dark:border-b-white"
                      : "bg-gray-50 dark:bg-black text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                  }`}
                >
                  <button
                    onClick={() => setActiveFilePath(tabPath)}
                    className="truncate"
                  >
                    {fileName}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseTab(tabPath);
                    }}
                    className="ml-1 text-gray-400 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>

          {/* Editor */}
          <div className="flex-1 min-h-0 bg-white dark:bg-black relative">
            {/* Cloudinary loading overlay */}
            {loadingFiles && (
              <div className="absolute inset-0 bg-black/70 z-10 flex items-center justify-center">
                <div className="flex items-center gap-2 text-white">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="font-mono text-sm">Loading files from cloud…</span>
                </div>
              </div>
            )}

            {activeFilePath && files[activeFilePath] !== undefined ? (
              <CodeEditor
                filePath={activeFilePath}
                language={activeFileLanguage()}
                value={files[activeFilePath]}
                onChange={handleCodeChange}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Select a file from the explorer to start editing
              </div>
            )}
          </div>

          {/* Success Banner */}
          {isResolved && (
            <div className="bg-green-50 dark:bg-white/10 border-t border-green-200 dark:border-white/10 px-4 py-2.5 flex items-center gap-2 shrink-0">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-sm font-semibold text-green-700 dark:text-green-200">
                Simulation solved! +{simulation.xpReward} XP earned
              </span>
            </div>
          )}

          {/* Action Bar */}
          <div className="bg-white dark:bg-black border-t border-gray-200 dark:border-white/10 px-4 py-2.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={handleRun}
                disabled={status === "running" || loadingFiles}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded hover:bg-gray-800 dark:hover:bg-white/80 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium text-sm"
              >
                {status === "running" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Run Simulation
              </button>
              <button
                onClick={handleReset}
                disabled={loadingFiles}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded hover:bg-gray-800 dark:hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={handleSaveProgress}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded hover:bg-gray-800 dark:hover:bg-white/80 transition-colors font-medium text-sm"
                title="Save your progress"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>

            <button
              onClick={() => setConsoleVisible((v) => !v)}
              className="p-1.5 text-gray-500 dark:text-gray-300 hover:text-white transition-colors rounded"
              title={consoleVisible ? "Hide console" : "Show console"}
            >
              {consoleVisible ? (
                <PanelBottomClose className="w-4 h-4" />
              ) : (
                <PanelBottomOpen className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Console Panel */}
          {consoleVisible && (
            <>
              <div
                className={`h-1 hover:bg-white/30 cursor-row-resize transition-colors shrink-0 ${
                  isResizingConsole ? "bg-white/50" : "bg-white/10"
                }`}
                onMouseDown={handleConsoleResize}
              />
              <div
                className="shrink-0 overflow-hidden"
                style={{ height: `${consoleHeight}px` }}
              >
                <ConsolePanel
                  output={consoleOutput}
                  status={status}
                  onClear={handleClearConsole}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
