"use client";

/**
 * BrowserSandboxWorkspace — Phase 1
 *
 * Three-panel layout:
 *   [Problem sidebar] | [Monaco editor] | [Live iframe preview]
 *
 * For template="static"  → inline CSS/JS into HTML, render in <iframe srcDoc>
 * For template="react-ts" → render via Sandpack
 *
 * No backend / Docker — everything runs in the browser.
 */

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { SandpackProvider, SandpackPreview } from "@codesandbox/sandpack-react";
import { useTheme } from "@/providers/theme-provider";
import Link from "next/link";
import type { BrowserSimulation } from "@/data/browser-simulations";
import {
  ArrowLeft,
  RotateCcw,
  Eye,
  EyeOff,
  Code2,
  Monitor,
  Lightbulb,
  CheckCircle2,
  Clock,
  TrendingUp,
  PanelLeftOpen,
  PanelLeftClose,
  RefreshCw,
} from "lucide-react";

/* Monaco is SSR-incompatible — load client-side only */
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

/* ─── helpers ─────────────────────────────────────────── */

const EXT_LANG: Record<string, string> = {
  html: "html",
  css: "css",
  js: "javascript",
  ts: "typescript",
  tsx: "typescriptreact",
  jsx: "javascriptreact",
};

function getLang(filename: string): string {
  const ext = filename.split(".").pop() ?? "";
  return EXT_LANG[ext] ?? "plaintext";
}

/**
 * Build an iframe srcDoc by inlining CSS and JS into the HTML.
 * Strips <link> and <script> tags that reference local files so relative
 * paths don't cause 404s inside the sandboxed iframe.
 */
function buildSrcDoc(files: Record<string, string>): string {
  let html = files["index.html"] ?? "<!DOCTYPE html><html><body></body></html>";
  const css = files["style.css"] ?? "";
  const js = files["script.js"] ?? "";

  // Remove <link rel="stylesheet" href="style.css" />
  html = html.replace(
    /<link[^>]+href=["'][./]*style\.css["'][^>]*(\/)?>/gi,
    "",
  );
  // Remove <script src="script.js"></script>
  html = html.replace(
    /<script[^>]+src=["'][./]*script\.js["'][^>]*><\/script>/gi,
    "",
  );

  if (css) {
    const tag = `<style>\n${css}\n</style>`;
    html = html.includes("</head>")
      ? html.replace("</head>", `${tag}\n</head>`)
      : tag + html;
  }

  if (js) {
    const tag = `<script>\n${js}\n</script>`;
    html = html.includes("</body>")
      ? html.replace("</body>", `${tag}\n</body>`)
      : html + tag;
  }

  return html;
}

/* ─── component ───────────────────────────────────────── */

interface Props {
  simulation: BrowserSimulation;
}

export default function BrowserSandboxWorkspace({ simulation }: Props) {
  const { theme } = useTheme();

  /* file state — keyed by filename */
  const [files, setFiles] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    simulation.initialFiles.forEach((f) => (m[f.name] = f.content));
    return m;
  });

  const [activeFile, setActiveFile] = useState(
    simulation.initialFiles[0]?.name ?? "index.html",
  );
  const [showSidebar, setShowSidebar] = useState(true);
  const [showHints, setShowHints] = useState(false);
  const [solutionBanner, setSolutionBanner] = useState(false);
  const [solutionApplied, setSolutionApplied] = useState(false);
  /* key to force-refresh the iframe when user clicks the refresh button */
  const [previewKey, setPreviewKey] = useState(0);

  /* ── derived: srcDoc ─────────────────────────────────── */
  const srcDoc = useMemo(
    () => (simulation.template === "static" ? buildSrcDoc(files) : ""),
    [files, simulation.template],
  );

  /* ── handlers ────────────────────────────────────────── */
  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined) {
        setFiles((prev) => ({ ...prev, [activeFile]: value }));
      }
    },
    [activeFile],
  );

  const resetFiles = useCallback(() => {
    const m: Record<string, string> = {};
    simulation.initialFiles.forEach((f) => (m[f.name] = f.content));
    setFiles(m);
    setSolutionApplied(false);
    setSolutionBanner(false);
  }, [simulation]);

  const applySolution = useCallback(() => {
    setFiles((prev) => ({ ...prev, ...simulation.solution }));
    setSolutionApplied(true);
    setSolutionBanner(false);
  }, [simulation.solution]);

  /* ── difficulty colours ──────────────────────────────── */
  const diffClass =
    simulation.difficulty === "easy"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      : simulation.difficulty === "medium"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";

  /* ── sandpack files (for react-ts template) ─────────── */
  const sandpackFiles = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(files).map(([name, content]) => [`/${name}`, content]),
      ),
    [files],
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black overflow-hidden">
      {/* ─── Header bar ──────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-white/8 shrink-0 gap-3 flex-wrap">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard/simulations"
            className="flex items-center gap-1.5 text-gray-400 hover:text-black dark:hover:text-white transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-mono text-xs hidden sm:inline">Back</span>
          </Link>

          <div className="w-px h-4 bg-gray-200 dark:bg-white/8 shrink-0" />

          {/* sidebar toggle */}
          <button
            onClick={() => setShowSidebar((v) => !v)}
            title={showSidebar ? "Hide problem panel" : "Show problem panel"}
            className="text-gray-400 hover:text-black dark:hover:text-white transition-colors shrink-0"
          >
            {showSidebar ? (
              <PanelLeftClose className="w-4 h-4" />
            ) : (
              <PanelLeftOpen className="w-4 h-4" />
            )}
          </button>

          <div className="w-px h-4 bg-gray-200 dark:bg-white/8 shrink-0" />

          <h1 className="font-bold text-black dark:text-white text-sm truncate">
            {simulation.title}
          </h1>

          <span
            className={`font-mono text-[10px] tracking-widest px-2 py-0.5 shrink-0 ${diffClass}`}
          >
            {simulation.difficulty.toUpperCase()}
          </span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1 font-mono text-[10px] text-gray-400">
            <Clock className="w-3 h-3" />
            {simulation.estimatedTime}m
          </span>
          <span className="flex items-center gap-1 font-mono text-[10px] text-gray-400">
            <TrendingUp className="w-3 h-3" />+{simulation.xpReward} XP
          </span>

          <div className="w-px h-4 bg-gray-200 dark:bg-white/8" />

          <button
            onClick={resetFiles}
            className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs text-gray-500 hover:text-black dark:hover:text-white border border-gray-200 dark:border-white/8 hover:border-gray-400 dark:hover:border-white/30 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>

          {solutionApplied ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs bg-emerald-500 text-white">
              <CheckCircle2 className="w-3 h-3" />
              Solution Applied
            </div>
          ) : (
            <button
              onClick={() => setSolutionBanner((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            >
              <Eye className="w-3 h-3" />
              Solution
            </button>
          )}
        </div>
      </div>

      {/* ─── Solution banner ─────────────────────────────── */}
      {solutionBanner && (
        <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 shrink-0">
          <p className="font-mono text-xs text-amber-700 dark:text-amber-400">
            Applying the solution replaces your code. You can still edit after
            applying, and Reset restores the original broken state.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSolutionBanner(false)}
              className="font-mono text-xs text-amber-500 hover:text-amber-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={applySolution}
              className="px-3 py-1.5 font-mono text-xs bg-amber-500 text-white hover:bg-amber-600 transition-colors"
            >
              Apply Solution
            </button>
          </div>
        </div>
      )}

      {/* ─── Main 3-panel area ───────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Panel 1: Problem sidebar ───────────────────── */}
        {showSidebar && (
          <aside className="w-72 shrink-0 border-r border-gray-100 dark:border-white/8 overflow-y-auto flex flex-col bg-white dark:bg-[#0a0a0a]">
            <div className="p-4 space-y-5">
              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                <span className="font-mono text-[10px] px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 tracking-wide">
                  BROWSER SANDBOX
                </span>
                {simulation.tags.map((tag) => (
                  <span
                    key={tag}
                    className="font-mono text-[10px] px-2 py-0.5 border border-gray-100 dark:border-white/8 text-gray-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Incident */}
              <div>
                <p className="font-mono text-[10px] tracking-widest text-gray-400 uppercase mb-2">
                  Incident
                </p>
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40">
                  <p className="font-mono text-xs text-red-700 dark:text-red-400 leading-relaxed">
                    {simulation.incident}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="font-mono text-[10px] tracking-widest text-gray-400 uppercase mb-2">
                  Description
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  {simulation.description}
                </p>
              </div>

              {/* Steps */}
              <div>
                <p className="font-mono text-[10px] tracking-widest text-gray-400 uppercase mb-2">
                  Steps
                </p>
                <ol className="space-y-3">
                  {simulation.steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="font-mono text-[10px] text-gray-300 dark:text-white/20 shrink-0 pt-0.5 w-4">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        {step.description}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Hints */}
              {simulation.hints && simulation.hints.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowHints((v) => !v)}
                    className="flex items-center justify-between w-full mb-2 hover:text-black dark:hover:text-white transition-colors group"
                  >
                    <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-gray-400 uppercase group-hover:text-black dark:group-hover:text-white transition-colors">
                      <Lightbulb className="w-3 h-3" />
                      Hints ({simulation.hints.length})
                    </span>
                    {showHints ? (
                      <EyeOff className="w-3 h-3 text-gray-400" />
                    ) : (
                      <Eye className="w-3 h-3 text-gray-400" />
                    )}
                  </button>

                  {showHints && (
                    <ol className="space-y-2">
                      {simulation.hints.map((hint, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 p-2.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30"
                        >
                          <span className="font-mono text-[10px] text-amber-400 shrink-0 pt-0.5">
                            {idx + 1}.
                          </span>
                          <span className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                            {hint}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}

        {/* ── Panel 2: Monaco editor ─────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-100 dark:border-white/8 min-w-0">
          {/* File tabs */}
          <div className="flex items-center border-b border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-[#0d0d0d] shrink-0 overflow-x-auto">
            <Code2 className="w-3.5 h-3.5 text-gray-400 mx-3 shrink-0" />
            {simulation.initialFiles.map((f) => (
              <button
                key={f.name}
                onClick={() => setActiveFile(f.name)}
                className={`px-4 py-2.5 font-mono text-xs whitespace-nowrap transition-colors border-b-2 ${
                  activeFile === f.name
                    ? "text-black dark:text-white border-black dark:border-white bg-white dark:bg-black"
                    : "text-gray-400 border-transparent hover:text-black dark:hover:text-white"
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={getLang(activeFile)}
              value={files[activeFile] ?? ""}
              onChange={handleEditorChange}
              theme={theme === "dark" ? "vs-dark" : "light"}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineHeight: 22,
                fontFamily:
                  "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
                padding: { top: 16, bottom: 16 },
                scrollBeyondLastLine: false,
                renderLineHighlight: "gutter",
                overviewRulerLanes: 0,
                hideCursorInOverviewRuler: true,
                overviewRulerBorder: false,
                wordWrap: "on",
                tabSize: 2,
              }}
            />
          </div>
        </div>

        {/* ── Panel 3: Live preview ──────────────────────── */}
        <div className="w-[42%] shrink-0 flex flex-col overflow-hidden">
          {/* Preview toolbar */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-[#0d0d0d] shrink-0">
            <div className="flex items-center gap-2">
              <Monitor className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-mono text-[10px] tracking-widest text-gray-400 uppercase">
                Live Preview
              </span>
              {/* Fake browser dots */}
              <div className="flex items-center gap-1 ml-1">
                <div className="w-2 h-2 rounded-full bg-red-400/60" />
                <div className="w-2 h-2 rounded-full bg-amber-400/60" />
                <div className="w-2 h-2 rounded-full bg-emerald-400/60" />
              </div>
            </div>
            <button
              onClick={() => setPreviewKey((k) => k + 1)}
              title="Refresh preview"
              className="text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Preview area */}
          <div className="flex-1 overflow-hidden bg-white">
            {simulation.template === "static" ? (
              <iframe
                key={previewKey}
                srcDoc={srcDoc}
                className="w-full h-full border-none"
                sandbox="allow-scripts allow-same-origin"
                title="Live Browser Preview"
              />
            ) : (
              <SandpackProvider
                key={previewKey}
                template={simulation.template}
                files={sandpackFiles}
                theme={theme === "dark" ? "dark" : "light"}
                options={{ autorun: true, autoReload: true }}
              >
                <SandpackPreview
                  showOpenInCodeSandbox={false}
                  showRefreshButton={false}
                  style={{ height: "100%", border: "none" }}
                />
              </SandpackProvider>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
