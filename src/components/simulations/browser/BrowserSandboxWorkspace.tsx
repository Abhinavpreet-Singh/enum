"use client";

/**
 * BrowserSandboxWorkspace — Phase 1 (with Solution + Evaluate)
 *
 * Layout:
 *   [Problem sidebar] | [Monaco editor] | [Right panel: Preview / Solution / Evaluate]
 *
 * template="static"  → <iframe srcDoc> (CSS/JS inlined into HTML)
 * template="react-ts" → Sandpack
 *
 * Evaluate tab runs cssScorer.evaluateSubmission() entirely in the browser.
 */

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { SandpackProvider, SandpackPreview } from "@codesandbox/sandpack-react";
import { useTheme } from "@/providers/theme-provider";
import Link from "next/link";
import type { BrowserSimulation } from "@/data/browser-simulations";
import { evaluateSubmission, type ScoreResult } from "@/utils/cssScorer";
import { proxy } from "@/app/proxy";
import {
  ArrowLeft,
  RotateCcw,
  Code2,
  Monitor,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  PanelLeftOpen,
  PanelLeftClose,
  RefreshCw,
  FlaskConical,
  BookOpen,
  Eye,
  EyeOff,
  Send,
  Zap,
} from "lucide-react";

/* Monaco SSR-safe */
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

/* ─── helpers ───────────────────────────────────────────── */

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

function buildSrcDoc(files: Record<string, string>): string {
  let html = files["index.html"] ?? "<!DOCTYPE html><html><body></body></html>";
  const css = files["style.css"] ?? "";
  const js = files["script.js"] ?? "";

  html = html.replace(
    /<link[^>]+href=["'][./]*style\.css["'][^>]*(\/)?>/gi,
    "",
  );
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

/* ─── Score ring ────────────────────────────────────────── */

function ScoreRing({ score }: { score: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color =
    score >= 85
      ? "#10b981"
      : score >= 70
        ? "#f59e0b"
        : score >= 50
          ? "#f97316"
          : "#ef4444";

  return (
    <svg width={96} height={96} className="shrink-0">
      <circle
        cx={48}
        cy={48}
        r={r}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={8}
      />
      <circle
        cx={48}
        cy={48}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text
        x={48}
        y={48}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={16}
        fontWeight={700}
        fill={color}
      >
        {score}%
      </text>
    </svg>
  );
}

/* ─── Types ─────────────────────────────────────────────── */

type RightTab = "preview" | "solution" | "evaluate";

/* ─── TabBtn (declared outside to avoid re-creating on render) ── */

function TabBtn({
  id,
  icon: Icon,
  label,
  activeTab,
  onTabChange,
  scoreResult,
}: {
  id: RightTab;
  icon: React.ElementType;
  label: string;
  activeTab: RightTab;
  onTabChange: (t: RightTab) => void;
  scoreResult: ScoreResult | null;
}) {
  return (
    <button
      onClick={() => onTabChange(id)}
      className={`flex items-center gap-1.5 px-3 py-2.5 font-mono text-[11px] border-b-2 transition-colors whitespace-nowrap ${
        activeTab === id
          ? "text-black dark:text-white border-black dark:border-white"
          : "text-gray-400 border-transparent hover:text-black dark:hover:text-white"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
      {id === "evaluate" && scoreResult && (
        <span
          className={`ml-1 font-bold text-[10px] px-1.5 py-0.5 ${
            scoreResult.passed
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
          }`}
        >
          {scoreResult.overall}%
        </span>
      )}
    </button>
  );
}

/* ─── Main component ────────────────────────────────────── */

interface Props {
  simulation: BrowserSimulation;
}

export default function BrowserSandboxWorkspace({ simulation }: Props) {
  const { theme } = useTheme();

  /* ── file state ──────────────────────────────────────── */
  const [files, setFiles] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    simulation.initialFiles.forEach((f) => (m[f.name] = f.content));
    return m;
  });

  const [activeFile, setActiveFile] = useState(
    simulation.initialFiles[0]?.name ?? "index.html",
  );
  const [activeSolFile, setActiveSolFile] = useState(
    Object.keys(simulation.solution)[0] ??
      simulation.initialFiles[0]?.name ??
      "style.css",
  );

  /* ── UI state ────────────────────────────────────────── */
  const [showSidebar, setShowSidebar] = useState(true);
  const [showHints, setShowHints] = useState(false);
  const [rightTab, setRightTab] = useState<RightTab>("preview");
  const [previewKey, setPreviewKey] = useState(0);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [expandedSelector, setExpandedSelector] = useState<string | null>(null);
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);
  const [xpAlreadyAwarded, setXpAlreadyAwarded] = useState(false);

  /* ── derived ─────────────────────────────────────────── */
  const srcDoc = useMemo(
    () => (simulation.template === "static" ? buildSrcDoc(files) : ""),
    [files, simulation.template],
  );

  // Solution preview: user HTML/JS + solution CSS
  const solSrcDoc = useMemo(
    () =>
      simulation.template === "static"
        ? buildSrcDoc({ ...files, ...simulation.solution })
        : "",
    [files, simulation.solution, simulation.template],
  );

  const sandpackUserFiles = useMemo(
    () =>
      Object.fromEntries(Object.entries(files).map(([n, c]) => [`/${n}`, c])),
    [files],
  );
  const sandpackSolFiles = useMemo(
    () =>
      Object.fromEntries(
        Object.entries({ ...files, ...simulation.solution }).map(([n, c]) => [
          `/${n}`,
          c,
        ]),
      ),
    [files, simulation.solution],
  );

  /* ── handlers ────────────────────────────────────────── */
  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined)
        setFiles((prev) => ({ ...prev, [activeFile]: value }));
    },
    [activeFile],
  );

  const resetFiles = useCallback(() => {
    const m: Record<string, string> = {};
    simulation.initialFiles.forEach((f) => (m[f.name] = f.content));
    setFiles(m);
    setScoreResult(null);
    setXpAwarded(null);
    setXpAlreadyAwarded(false);
  }, [simulation]);

  const handleEvaluate = useCallback(async () => {
    const result = evaluateSubmission(files, simulation.solution);
    setScoreResult(result);
    setRightTab("evaluate");

    if (!result.passed) return;

    // Award XP — call backend; guard with localStorage to avoid double-award on retry
    const storageKey = `enum_browser_xp_awarded_${simulation.id}`;
    const alreadyLocal =
      typeof window !== "undefined" && localStorage.getItem(storageKey) === "1";

    if (alreadyLocal) {
      setXpAlreadyAwarded(true);
      return;
    }

    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("accessToken")
          : null;
      if (!token) return; // not logged in, skip silently

      const res = await fetch(`${proxy}/api/v1/users/award-browser-xp`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          simulationId: simulation.id,
          xpAmount: simulation.xpReward,
        }),
      });

      const json = await res.json();
      if (json?.data?.alreadyAwarded) {
        setXpAlreadyAwarded(true);
      } else if (json?.data?.xpAwarded) {
        setXpAwarded(json.data.xpAwarded);
        setXpAlreadyAwarded(false);
        localStorage.setItem(storageKey, "1");
      }
    } catch {
      // network error — don't block the UI
    }
  }, [files, simulation]);

  /* ── difficulty colour ───────────────────────────────── */
  const diffClass =
    simulation.difficulty === "easy"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      : simulation.difficulty === "medium"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black overflow-hidden">
      {/* ── Header bar ─────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-white/8 shrink-0 gap-3 flex-wrap">
        {/* left */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard/simulations"
            className="flex items-center gap-1.5 text-gray-400 hover:text-black dark:hover:text-white transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-mono text-xs hidden sm:inline">Back</span>
          </Link>
          <div className="w-px h-4 bg-gray-200 dark:bg-white/8 shrink-0" />
          <button
            onClick={() => setShowSidebar((v) => !v)}
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

        {/* right */}
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
          <button
            onClick={handleEvaluate}
            className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            <Send className="w-3 h-3" />
            Submit &amp; Evaluate
          </button>
        </div>
      </div>

      {/* ── 3-panel body ────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Panel 1: Problem sidebar ──────────────────── */}
        {showSidebar && (
          <aside className="w-72 shrink-0 border-r border-gray-100 dark:border-white/8 overflow-y-auto bg-white dark:bg-[#0a0a0a]">
            <div className="p-4 space-y-5">
              {/* badge + tags */}
              <div className="flex flex-wrap gap-1.5">
                <span className="font-mono text-[10px] px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
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

              {/* incident */}
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

              {/* description */}
              <div>
                <p className="font-mono text-[10px] tracking-widest text-gray-400 uppercase mb-2">
                  Description
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  {simulation.description}
                </p>
              </div>

              {/* steps */}
              <div>
                <p className="font-mono text-[10px] tracking-widest text-gray-400 uppercase mb-2">
                  Steps
                </p>
                <ol className="space-y-3">
                  {simulation.steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="font-mono text-[10px] text-gray-300 dark:text-white/20 w-4 shrink-0 pt-0.5">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        {step.description}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* hints */}
              {simulation.hints && simulation.hints.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowHints((v) => !v)}
                    className="flex items-center justify-between w-full mb-2 group"
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

        {/* ── Panel 2: Monaco editor ───────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-100 dark:border-white/8 min-w-0">
          {/* file tabs */}
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

          {/* editor */}
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
                  "'JetBrains Mono','Fira Code','Cascadia Code',Menlo,monospace",
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

        {/* ── Panel 3: tabbed right panel ──────────────── */}
        <div className="w-[42%] shrink-0 flex flex-col overflow-hidden">
          {/* tab bar */}
          <div className="flex items-center border-b border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-[#0d0d0d] shrink-0 overflow-x-auto">
            <TabBtn
              id="preview"
              icon={Monitor}
              label="Preview"
              activeTab={rightTab}
              onTabChange={setRightTab}
              scoreResult={scoreResult}
            />
            <TabBtn
              id="solution"
              icon={BookOpen}
              label="Solution"
              activeTab={rightTab}
              onTabChange={setRightTab}
              scoreResult={scoreResult}
            />
            <TabBtn
              id="evaluate"
              icon={FlaskConical}
              label="Evaluate"
              activeTab={rightTab}
              onTabChange={setRightTab}
              scoreResult={scoreResult}
            />
            {rightTab === "preview" && (
              <button
                onClick={() => setPreviewKey((k) => k + 1)}
                title="Refresh"
                className="ml-auto mr-3 text-gray-400 hover:text-black dark:hover:text-white transition-colors shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* ── Preview tab ───────────────────────────────── */}
          {rightTab === "preview" && (
            <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-white">
              {/* chrome dots */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-[#111] border-b border-gray-200 dark:border-white/8 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
                <span className="ml-2 font-mono text-[10px] text-gray-400">
                  your code · live
                </span>
              </div>
              {simulation.template === "static" ? (
                <iframe
                  key={previewKey}
                  srcDoc={srcDoc}
                  className="w-full border-none flex-1"
                  sandbox="allow-scripts allow-same-origin"
                  title="Your Live Preview"
                />
              ) : (
                <SandpackProvider
                  key={previewKey}
                  template={simulation.template}
                  files={sandpackUserFiles}
                  theme={theme === "dark" ? "dark" : "light"}
                  options={{ autorun: true, autoReload: true }}
                >
                  <SandpackPreview
                    showOpenInCodeSandbox={false}
                    showRefreshButton={false}
                    style={{ flex: 1, border: "none" }}
                  />
                </SandpackProvider>
              )}
            </div>
          )}

          {/* ── Solution tab ──────────────────────────────── */}
          {rightTab === "solution" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* solution file selector */}
              <div className="flex items-center border-b border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-[#0d0d0d] shrink-0 overflow-x-auto">
                <BookOpen className="w-3.5 h-3.5 text-gray-400 mx-3 shrink-0" />
                {Object.keys(simulation.solution).map((fname) => (
                  <button
                    key={fname}
                    onClick={() => setActiveSolFile(fname)}
                    className={`px-4 py-2.5 font-mono text-xs whitespace-nowrap transition-colors border-b-2 ${
                      activeSolFile === fname
                        ? "text-emerald-600 dark:text-emerald-400 border-emerald-500"
                        : "text-gray-400 border-transparent hover:text-black dark:hover:text-white"
                    }`}
                  >
                    {fname}
                  </button>
                ))}
                <span className="ml-auto mr-3 font-mono text-[10px] text-emerald-500 shrink-0">
                  READ-ONLY
                </span>
              </div>

              {/* read-only Monaco — top 55% */}
              <div
                className="overflow-hidden border-b border-gray-100 dark:border-white/8"
                style={{ height: "55%" }}
              >
                <Editor
                  height="100%"
                  language={getLang(activeSolFile)}
                  value={simulation.solution[activeSolFile] ?? ""}
                  theme={theme === "dark" ? "vs-dark" : "light"}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 12,
                    lineHeight: 20,
                    fontFamily: "'JetBrains Mono','Fira Code',Menlo,monospace",
                    padding: { top: 12, bottom: 12 },
                    scrollBeyondLastLine: false,
                    overviewRulerLanes: 0,
                    overviewRulerBorder: false,
                    wordWrap: "on",
                    tabSize: 2,
                    renderLineHighlight: "none",
                  }}
                />
              </div>

              {/* solution iframe preview — bottom 45% */}
              <div
                className="flex flex-col overflow-hidden bg-white"
                style={{ height: "45%" }}
              >
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-[#111] border-b border-gray-200 dark:border-white/8 shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
                  <span className="ml-2 font-mono text-[10px] text-emerald-500">
                    solution preview
                  </span>
                </div>
                {simulation.template === "static" ? (
                  <iframe
                    srcDoc={solSrcDoc}
                    className="w-full border-none flex-1"
                    sandbox="allow-scripts allow-same-origin"
                    title="Solution Preview"
                  />
                ) : (
                  <SandpackProvider
                    template={simulation.template}
                    files={sandpackSolFiles}
                    theme={theme === "dark" ? "dark" : "light"}
                    options={{ autorun: true, autoReload: true }}
                  >
                    <SandpackPreview
                      showOpenInCodeSandbox={false}
                      showRefreshButton={false}
                      style={{ flex: 1, border: "none" }}
                    />
                  </SandpackProvider>
                )}
              </div>
            </div>
          )}

          {/* ── Evaluate tab ──────────────────────────────── */}
          {rightTab === "evaluate" && (
            <div className="flex-1 overflow-y-auto bg-white dark:bg-black">
              {!scoreResult ? (
                /* empty state */
                <div className="flex flex-col items-center justify-center h-full gap-5 p-6 text-center">
                  <FlaskConical className="w-10 h-10 text-gray-300 dark:text-white/15" />
                  <p className="font-mono text-sm text-gray-400 leading-relaxed">
                    Click{" "}
                    <strong className="text-black dark:text-white">
                      Submit &amp; Evaluate
                    </strong>{" "}
                    to score your code against the reference solution.
                  </p>
                  <button
                    onClick={handleEvaluate}
                    className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-mono text-xs hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Run Evaluation
                  </button>
                </div>
              ) : (
                <div className="p-5 space-y-6">
                  {/* XP award banner */}
                  {scoreResult.passed &&
                    (xpAwarded !== null || xpAlreadyAwarded) && (
                      <div
                        className={`flex items-center gap-3 px-4 py-3 border ${
                          xpAlreadyAwarded
                            ? "border-gray-200 dark:border-white/8 bg-gray-50 dark:bg-[#0d0d0d]"
                            : "border-amber-200 dark:border-amber-700/40 bg-amber-50 dark:bg-amber-900/10"
                        }`}
                      >
                        <Zap
                          className={`w-5 h-5 shrink-0 ${
                            xpAlreadyAwarded
                              ? "text-gray-400"
                              : "text-amber-500"
                          }`}
                        />
                        <div className="min-w-0">
                          {xpAlreadyAwarded ? (
                            <p className="font-mono text-xs text-gray-400">
                              XP already awarded for this simulation.
                            </p>
                          ) : (
                            <>
                              <p className="font-bold text-sm text-amber-600 dark:text-amber-400">
                                +{xpAwarded} XP earned!
                              </p>
                              <p className="font-mono text-[11px] text-gray-400">
                                Added to your leaderboard score.
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                  {/* overall score card */}
                  <div className="flex items-center gap-5 p-4 border border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-[#0d0d0d]">
                    <ScoreRing score={scoreResult.overall} />
                    <div className="min-w-0">
                      <p
                        className={`text-xl font-bold mb-1 ${
                          scoreResult.passed
                            ? "text-emerald-500"
                            : scoreResult.overall >= 50
                              ? "text-amber-500"
                              : "text-red-500"
                        }`}
                      >
                        {scoreResult.label}
                      </p>
                      <p className="font-mono text-xs text-gray-400 leading-relaxed">
                        {scoreResult.overall >= 85
                          ? "All key CSS rules match the reference solution."
                          : scoreResult.overall >= 70
                            ? "Most rules are correct — a few properties still need work."
                            : scoreResult.overall >= 50
                              ? "You're on track. Check the property breakdown below."
                              : "Several layout rules are still broken. Use hints or the Solution tab."}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2">
                        {scoreResult.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                        <span className="font-mono text-[11px] text-gray-500">
                          {scoreResult.passed
                            ? "Passed (≥ 75%)"
                            : "Not yet passed — aim for ≥ 75%"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* score bar */}
                  <div>
                    <div className="flex justify-between font-mono text-[10px] text-gray-400 mb-1">
                      <span>MATCH SCORE</span>
                      <span>{scoreResult.overall}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-white/8 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-700 ${
                          scoreResult.overall >= 85
                            ? "bg-emerald-500"
                            : scoreResult.overall >= 70
                              ? "bg-amber-400"
                              : scoreResult.overall >= 50
                                ? "bg-orange-400"
                                : "bg-red-500"
                        }`}
                        style={{ width: `${scoreResult.overall}%` }}
                      />
                    </div>
                    <div className="flex justify-between font-mono text-[9px] text-gray-300 dark:text-white/20 mt-0.5">
                      <span>0</span>
                      <span>25</span>
                      <span>50</span>
                      <span>75</span>
                      <span>100</span>
                    </div>
                  </div>

                  {/* per-file breakdown */}
                  {scoreResult.files.map((file) => (
                    <div key={file.filename} className="space-y-2">
                      {/* file header */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-semibold text-black dark:text-white">
                          {file.filename}
                        </span>
                        <span className="font-mono text-[10px] text-gray-400">
                          {file.matchedCount}/{file.totalCount} · {file.score}%
                        </span>
                      </div>

                      {/* mini bar */}
                      <div className="h-1 bg-gray-100 dark:bg-white/8 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            file.score >= 85
                              ? "bg-emerald-500"
                              : file.score >= 70
                                ? "bg-amber-400"
                                : "bg-red-400"
                          }`}
                          style={{ width: `${file.score}%` }}
                        />
                      </div>

                      {/* CSS property drill-down */}
                      {file.isCss &&
                        file.checks.length > 0 &&
                        (() => {
                          /* group checks by selector */
                          const bySelector = new Map<
                            string,
                            typeof file.checks
                          >();
                          file.checks.forEach((c) => {
                            if (!bySelector.has(c.selector))
                              bySelector.set(c.selector, []);
                            bySelector.get(c.selector)!.push(c);
                          });

                          return (
                            <div className="space-y-1.5 mt-2">
                              {[...bySelector.entries()].map(
                                ([selector, checks]) => {
                                  const allMatch = checks.every(
                                    (c) => c.matched,
                                  );
                                  const key = `${file.filename}::${selector}`;
                                  const expanded = expandedSelector === key;

                                  return (
                                    <div
                                      key={selector}
                                      className="border border-gray-100 dark:border-white/8"
                                    >
                                      {/* selector toggleable header */}
                                      <button
                                        onClick={() =>
                                          setExpandedSelector(
                                            expanded ? null : key,
                                          )
                                        }
                                        className="flex items-center justify-between w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-white/4 transition-colors"
                                      >
                                        <span className="font-mono text-[11px] text-indigo-500 dark:text-indigo-400 truncate">
                                          {selector}
                                        </span>
                                        <div className="flex items-center gap-2 shrink-0">
                                          {allMatch ? (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                          ) : (
                                            <XCircle className="w-3.5 h-3.5 text-red-400" />
                                          )}
                                          <span className="font-mono text-[10px] text-gray-400">
                                            {
                                              checks.filter((c) => c.matched)
                                                .length
                                            }
                                            /{checks.length}
                                          </span>
                                          <span className="font-mono text-[10px] text-gray-300 dark:text-white/20">
                                            {expanded ? "▲" : "▼"}
                                          </span>
                                        </div>
                                      </button>

                                      {/* property rows */}
                                      {expanded && (
                                        <div className="divide-y divide-gray-50 dark:divide-white/4">
                                          {checks.map((check) => (
                                            <div
                                              key={check.property}
                                              className={`flex items-start gap-3 px-3 py-2 font-mono text-[11px] ${
                                                check.matched
                                                  ? "bg-emerald-50/50 dark:bg-emerald-900/10"
                                                  : "bg-red-50/50 dark:bg-red-900/10"
                                              }`}
                                            >
                                              {check.matched ? (
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                              ) : (
                                                <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                                              )}
                                              <div className="min-w-0">
                                                <span className="text-gray-700 dark:text-gray-300">
                                                  {check.property}
                                                </span>
                                                <div className="flex flex-col gap-0.5 mt-0.5">
                                                  <span className="text-emerald-600 dark:text-emerald-400 truncate">
                                                    ✓ {check.solutionValue}
                                                  </span>
                                                  {!check.matched && (
                                                    <span className="text-red-500 dark:text-red-400 truncate">
                                                      ✗{" "}
                                                      {check.userValue ??
                                                        "missing"}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                },
                              )}
                            </div>
                          );
                        })()}
                    </div>
                  ))}

                  {/* re-evaluate */}
                  <button
                    onClick={handleEvaluate}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 dark:border-white/8 font-mono text-xs text-gray-500 hover:text-black dark:hover:text-white hover:border-gray-400 dark:hover:border-white/30 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Re-evaluate
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
