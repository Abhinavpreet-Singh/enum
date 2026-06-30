"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, Loader2, TrendingUp, Network, ShieldAlert, ShieldCheck, AlertTriangle, Sparkles, Circle, CheckCircle2, Lock } from "lucide-react";
import Link from "next/link";
import axios from "axios";

import ComponentSidebar from "@/components/systemDesign/ComponentSidebar";
import SystemDesignCanvas, {
  CanvasHandle,
} from "@/components/systemDesign/SystemDesignCanvas";
import NodeConfigPanel from "@/components/systemDesign/NodeConfigPanel";
import FeedbackPanel from "@/components/systemDesign/FeedbackPanel";
import type {
  SystemDesignNode,
  SystemDesignEdge,
  ComponentConfig,
  EvaluationResult,
} from "@/systemDesign";
import { analyzeArchitecture } from "@/systemDesign";
import { proxy } from "@/app/proxy";

interface SDSimulation {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  tags: string[];
  maxScore: number;
  evaluationRules: Array<{
    description: string;
    requiredComponent: string;
    requiredEdge: string;
    points: number;
  }>;
}

interface SubmissionEntry {
  id: string;
  score: number;
  maxScore: number;
  createdAt: string;
}

const DIFF_COLORS: Record<string, string> = {
  easy: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
  medium: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  hard: "text-red-400 border-red-400/30 bg-red-400/10",
};

export default function SystemDesignClientPage() {
  const params = useParams();
  const router = useRouter();
  const simulationId = params?.id as string;

  const canvasRef = useRef<CanvasHandle>(null);
  const [selectedNode, setSelectedNode] = useState<SystemDesignNode | null>(
    null,
  );
  const [explanation, setExplanation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);

  const [simulation, setSimulation] = useState<SDSimulation | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [locked, setLocked] = useState(false);
  const [history, setHistory] = useState<SubmissionEntry[]>([]);

  const [activeTab, setActiveTab] = useState<"problem" | "analyzer">("problem");
  const [activeGraph, setActiveGraph] = useState<{
    nodes: SystemDesignNode[];
    edges: SystemDesignEdge[];
  }>({ nodes: [], edges: [] });

  const handleGraphChange = useCallback(
    (nodes: SystemDesignNode[], edges: SystemDesignEdge[]) => {
      setActiveGraph({ nodes, edges });
    },
    [],
  );

  const auditResults = React.useMemo(() => {
    if (!simulation) return [];
    return analyzeArchitecture(
      activeGraph.nodes,
      activeGraph.edges,
      simulation.evaluationRules,
    );
  }, [activeGraph, simulation]);

  const errorCount = React.useMemo(() => {
    return auditResults.filter((r) => !r.passed && r.type === "error").length;
  }, [auditResults]);

  const warningCount = React.useMemo(() => {
    return auditResults.filter(
      (r) => !r.passed && (r.type === "warning" || r.type === "optimization"),
    ).length;
  }, [auditResults]);

  useEffect(() => {
    if (!simulationId) return;
    axios
      .get(`${proxy}/api/v1/system-design/simulations/${simulationId}`)
      .then((r) => setSimulation(r.data.data ?? null))
      .catch((err) => {
        if (axios.isAxiosError(err) && err.response?.status === 403) {
          setLocked(true);
        }
        setSimulation(null);
      })
      .finally(() => setLoadingMeta(false));
  }, [simulationId]);

  // Fetch past submissions (best-effort — silently skip if not authenticated)
  useEffect(() => {
    if (!simulationId) return;
    axios
      .get(`${proxy}/api/v1/system-design/submissions/${simulationId}`, {
        withCredentials: true,
      })
      .then((r) => setHistory(r.data.data ?? []))
      .catch(() => {});
  }, [simulationId]);

  const handleConfigChange = useCallback(
    (nodeId: string, config: ComponentConfig) => {
      setSelectedNode((prev) =>
        !prev || prev.id !== nodeId
          ? prev
          : { ...prev, data: { ...prev.data, config } },
      );
      window.dispatchEvent(
        new CustomEvent("sd:config-change", { detail: { nodeId, config } }),
      );
    },
    [],
  );

  const handleSubmit = async () => {
    if (!canvasRef.current) return;
    const { nodes, edges } = canvasRef.current.exportGraph();
    if (nodes.length === 0) {
      alert("Add at least one component to the canvas.");
      return;
    }

    // Extract critical error audits from our live results list
    const criticalErrors = auditResults.filter((r) => !r.passed && r.type === "error");
    if (criticalErrors.length > 0) {
      const errorMsg = criticalErrors
        .map((e, idx) => `${idx + 1}. [${e.title}]: ${e.message}`)
        .join("\n\n");
      
      const confirmSubmit = confirm(
        `⚠️ CRITICAL ARCHITECTURE VULNERABILITIES DETECTED\n\n` +
        `Your design contains severe flaws that will deduct points from your final score:\n\n` +
        `${errorMsg}\n\n` +
        `Are you sure you want to submit anyway? Click 'OK' to proceed with deductions, or 'Cancel' to keep refining your canvas.`
      );
      if (!confirmSubmit) return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(
        `${proxy}/api/v1/system-design/submit`,
        {
          simulationId,
          nodes,
          edges,
          explanation,
          replayEvents: canvasRef.current.getReplayEvents(),
        },
        { withCredentials: true },
      );
      const data = res.data.data;
      if (data?.evaluation) {
        setResult({
          ...data.evaluation,
          xpEarned: data.xpEarned,
          alreadyAwarded: data.alreadyAwarded,
          totalXp: data.totalXp,
          currentStreak: data.currentStreak,
        });
        if (typeof data.totalXp === "number") {
          window.dispatchEvent(
            new CustomEvent("userXpUpdated", { detail: { xp: data.totalXp } }),
          );
        }
        // Prepend to local history
        setHistory((prev) =>
          [
            {
              id: data.submissionId,
              score: data.evaluation.score,
              maxScore: data.evaluation.maxScore,
              createdAt: new Date().toISOString(),
            },
            ...prev,
          ].slice(0, 10),
        );
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          const shouldLogin = confirm(
            "You need to be logged in to submit. Go to login page?",
          );
          if (shouldLogin) router.push("/login");
        } else {
          const msg = err.response?.data?.message ?? err.message;
          alert(`Submission failed: ${msg}`);
        }
      } else {
        alert("Failed to submit. Please try again.");
      }
      console.error("Submission error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!loadingMeta && locked) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-black">
        <div className="max-w-md border border-gray-200 bg-white p-8 text-center dark:border-white/10 dark:bg-[#111]">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-gray-200 dark:border-white/10">
            <Lock className="h-5 w-5 text-gray-400" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-black dark:text-white">
            Premium System Design
          </h1>
          <p className="mb-5 text-gray-600 dark:text-gray-400">
            Upgrade to Enum Pro or unlock System Design to work on this scenario.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Link
              href="/dashboard/pro?product=track-system-design"
              className="border border-black bg-black px-4 py-2 font-mono text-xs uppercase tracking-widest text-white hover:bg-gray-800 dark:border-white dark:bg-white dark:text-black"
            >
              Unlock Pro
            </Link>
            <Link
              href="/dashboard/simulations"
              className="px-4 py-2 font-mono text-xs uppercase tracking-widest text-gray-500 hover:text-black dark:hover:text-white"
            >
              Back
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50 dark:bg-black">
      {/* ── Top bar */}
      <header className="flex items-center justify-between h-11 px-4 border-b border-gray-200 dark:border-white/20 bg-white dark:bg-[#111] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/dashboard/simulations"
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 shrink-0 transition-colors"
          >
            <ArrowLeft size={15} />
          </Link>
          <Network size={13} className="text-blue-500 shrink-0" />
          <h1 className="text-xs font-semibold text-black dark:text-white truncate">
            {loadingMeta
              ? "Loading..."
              : (simulation?.title ?? "System Design")}
          </h1>
          {simulation && (
            <span
              className={`px-1.5 py-0.5 text-[9px] font-mono font-bold border shrink-0 ${DIFF_COLORS[simulation.difficulty] ?? "text-gray-400 border-gray-300"}`}
            >
              {simulation.difficulty.toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-[11px] font-semibold tracking-wide bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-40 transition-colors"
          >
            {submitting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Send size={12} />
            )}
            SUBMIT
          </button>
        </div>
      </header>

      {/* ── Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Problem pane — fixed width, no inner scroll issues */}
        <aside className="w-80 shrink-0 flex flex-col border-r border-gray-200 dark:border-white/20 bg-white dark:bg-[#141414] overflow-hidden">
          {loadingMeta ? (
            <div className="p-4 space-y-3 animate-pulse">
              <div className="h-4 bg-gray-100 dark:bg-white/8 rounded w-3/4" />
              <div className="h-3 bg-gray-100 dark:bg-white/5 rounded w-1/2" />
              <div className="h-24 bg-gray-100 dark:bg-white/5 rounded" />
            </div>
          ) : simulation ? (
            <>
              {/* Header block */}
              <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-white/15 shrink-0">
                <p className="font-mono text-[9px] tracking-[0.3em] text-gray-400 dark:text-gray-400 uppercase mb-1.5">
                  System Design
                </p>
                <h2 className="text-sm font-bold text-black dark:text-white leading-snug mb-2.5">
                  {simulation.title}
                </h2>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-mono font-bold border ${DIFF_COLORS[simulation.difficulty] ?? "text-gray-400 border-gray-200"}`}
                  >
                    {simulation.difficulty.toUpperCase()}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-mono text-gray-500 dark:text-gray-300">
                    <TrendingUp size={10} />
                    {simulation.maxScore} pts
                  </span>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-100 dark:border-white/10 shrink-0 bg-gray-50/50 dark:bg-black/20">
                <button
                  onClick={() => setActiveTab("problem")}
                  className={`flex-1 py-2 text-center font-mono text-[10px] font-bold uppercase tracking-wider border-r border-gray-100 dark:border-white/10 transition-colors ${
                    activeTab === "problem"
                      ? "bg-white dark:bg-[#141414] text-black dark:text-white border-b-2 border-black dark:border-white"
                      : "text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-305 transition-colors"
                  }`}
                >
                  Problem
                </button>
                <button
                  onClick={() => setActiveTab("analyzer")}
                  className={`flex-1 py-2 text-center font-mono text-[10px] font-bold uppercase tracking-wider transition-colors relative flex items-center justify-center gap-1.5 ${
                    activeTab === "analyzer"
                      ? "bg-white dark:bg-[#141414] text-black dark:text-white border-b-2 border-black dark:border-white"
                      : "text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-305 transition-colors"
                  }`}
                >
                  Live Analyzer
                  {errorCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                  )}
                  {errorCount === 0 && warningCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  )}
                </button>
              </div>

              {activeTab === "problem" ? (
                <div className="flex-1 flex flex-col overflow-y-auto">
                  {/* Description */}
                  <div className="px-4 py-4 flex-1">
                    <p className="font-mono text-[9px] tracking-[0.3em] text-gray-400 dark:text-gray-400 uppercase mb-2">
                      Problem
                    </p>
                    <p className="text-[11px] text-gray-950 dark:text-white leading-relaxed">
                      {simulation.description}
                    </p>
                  </div>

                  {/* Explanation — pinned bottom */}
                  <div className="border-t border-gray-100 dark:border-white/15 px-4 py-3 shrink-0">
                    <p className="font-mono text-[9px] tracking-[0.3em] text-gray-400 dark:text-gray-400 uppercase mb-1.5">
                      Your Explanation
                    </p>
                    <textarea
                      rows={4}
                      value={explanation}
                      onChange={(e) => setExplanation(e.target.value)}
                      placeholder="Trade-offs, decisions, why this architecture..."
                      className="w-full px-2.5 py-2 text-[11px] font-mono border border-gray-200 dark:border-white/20 bg-white dark:bg-black/60 text-black dark:text-white placeholder-gray-300 dark:placeholder-gray-500 resize-none outline-none focus:border-black dark:focus:border-white/50 transition-colors leading-relaxed"
                    />
                  </div>

                  {/* Past Attempts */}
                  {history.length > 0 && (
                    <div className="border-t border-gray-100 dark:border-white/15 px-4 py-2.5 shrink-0">
                      <p className="font-mono text-[9px] tracking-[0.3em] text-gray-400 dark:text-gray-400 uppercase mb-1.5">
                        Past Attempts
                      </p>
                      <div className="space-y-1">
                        {history.slice(0, 5).map((s) => {
                          const pct = Math.round((s.score / s.maxScore) * 100);
                          return (
                            <div
                              key={s.id}
                              className="flex items-center justify-between"
                            >
                              <span className="text-[10px] font-mono text-gray-400 dark:text-gray-505">
                                {new Date(s.createdAt).toLocaleDateString(
                                  undefined,
                                  { month: "short", day: "numeric" },
                                )}
                              </span>
                              <span
                                className={`text-[10px] font-mono font-semibold ${
                                  pct >= 80
                                    ? "text-emerald-500"
                                    : pct >= 50
                                      ? "text-amber-400"
                                      : "text-red-400"
                                }`}
                              >
                                {s.score}/{s.maxScore} ({pct}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
                  {/* Goal Checklist */}
                  <div>
                    <p className="font-mono text-[9px] tracking-[0.3em] text-gray-400 dark:text-gray-400 uppercase mb-2.5">
                      Goal Checklist
                    </p>
                    {auditResults.filter((r) => r.type === "requirement")
                      .length === 0 ? (
                      <p className="text-[10px] font-mono text-gray-400 italic">
                        No design requirements set for this simulation.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {auditResults
                          .filter((r) => r.type === "requirement")
                          .map((req) => (
                            <div
                              key={req.id}
                              className={`flex items-start gap-2.5 px-3 py-2 border transition-all ${
                                req.passed
                                  ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-800 dark:text-emerald-400"
                                  : "border-gray-200 dark:border-white/5 bg-gray-50/20 dark:bg-white/2 text-gray-500 dark:text-gray-400"
                              }`}
                            >
                              {req.passed ? (
                                <CheckCircle2
                                  size={13}
                                  className="text-emerald-500 shrink-0 mt-0.5"
                                />
                              ) : (
                                <Circle
                                  size={13}
                                  className="text-gray-300 dark:text-gray-650 shrink-0 mt-0.5"
                                />
                              )}
                              <div className="min-w-0">
                                <p className="text-[11px] font-semibold leading-tight">
                                  {req.title}
                                </p>
                                <p className="text-[9px] font-mono text-gray-400 mt-1 leading-normal">
                                  {req.message}
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Architecture Audits */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-mono text-[9px] tracking-[0.3em] text-gray-400 dark:text-gray-400 uppercase">
                        Architectural Audits
                      </p>
                    </div>
                    <p className="text-[9px] font-mono text-gray-400 dark:text-gray-500 mb-3 italic">
                      Tip: Double-click any connection line to delete it.
                    </p>

                    {auditResults.filter((r) => r.type !== "requirement")
                      .length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-gray-200 dark:border-white/5 bg-gray-50/20 dark:bg-white/2">
                        <ShieldCheck
                          size={20}
                          className="mx-auto text-emerald-500 mb-1.5 opacity-60"
                        />
                        <p className="text-[11px] font-semibold text-gray-800 dark:text-white">
                          All systems normal
                        </p>
                        <p className="text-[9px] text-gray-400 mt-0.5 font-mono">
                          Checks run on components and connections.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {auditResults
                          .filter((r) => r.type !== "requirement")
                          .map((audit) => {
                            let Icon = AlertTriangle;
                            let borderClass =
                              "border-amber-500/20 bg-amber-500/5 text-amber-800 dark:text-amber-400";
                            let iconClass = "text-amber-500";

                            if (audit.type === "error") {
                              Icon = ShieldAlert;
                              borderClass =
                                "border-red-500/20 bg-red-500/5 text-red-800 dark:text-red-400";
                              iconClass = "text-red-500";
                            } else if (audit.type === "optimization") {
                              Icon = Sparkles;
                              borderClass =
                                "border-blue-500/20 bg-blue-500/5 text-blue-800 dark:text-blue-400";
                              iconClass = "text-blue-500";
                            } else if (audit.passed) {
                              Icon = ShieldCheck;
                              borderClass =
                                "border-emerald-500/20 bg-emerald-500/5 text-emerald-800 dark:text-emerald-400";
                              iconClass = "text-emerald-500";
                            }

                            return (
                              <div
                                key={audit.id}
                                className={`flex items-start gap-2.5 px-3 py-2 border transition-all ${borderClass}`}
                              >
                                <Icon
                                  size={13}
                                  className={`${iconClass} shrink-0 mt-0.5`}
                                />
                                <div className="min-w-0">
                                  <p className="text-[11px] font-bold leading-tight flex items-center gap-1.5">
                                    {audit.title}
                                    {audit.passed && (
                                      <span className="text-[8px] font-mono px-1 border border-emerald-500/30 text-emerald-500 bg-emerald-500/10 font-normal">
                                        PASSED
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-[10px] font-mono text-gray-500 dark:text-gray-400 mt-1 leading-normal">
                                    {audit.message}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="p-4 text-xs text-gray-400">
              Failed to load simulation.
            </p>
          )}
        </aside>

        {/* RIGHT: Canvas */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <ComponentSidebar horizontal />
          <div className="flex-1 overflow-hidden">
            <SystemDesignCanvas
              ref={canvasRef}
              onNodeSelect={setSelectedNode}
              onGraphChange={handleGraphChange}
            />
          </div>
        </div>

        {selectedNode && (
          <NodeConfigPanel
            node={selectedNode}
            onConfigChange={handleConfigChange}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>

      <FeedbackPanel result={result} onClose={() => setResult(null)} />
    </div>
  );
}
