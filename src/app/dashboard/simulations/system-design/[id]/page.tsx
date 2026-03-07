"use client";

import React, { useCallback, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
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
  ComponentConfig,
  EvaluationResult,
} from "@/systemDesign";
import { proxy } from "@/app/proxy";

export default function SystemDesignSimulationPage() {
  const params = useParams();
  const router = useRouter();
  const simulationId = params?.id as string;

  const canvasRef = useRef<CanvasHandle>(null);
  const [selectedNode, setSelectedNode] = useState<SystemDesignNode | null>(null);
  const [explanation, setExplanation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);

  // ---------- Config change ----------
  const handleConfigChange = useCallback(
    (nodeId: string, config: ComponentConfig) => {
      // We need to propagate to the canvas. Since ReactFlow nodes are managed
      // inside the canvas via useNodesState, we update the selected node in
      // local state and let the canvas pick it up through onNodeSelect refresh.
      // For a direct approach we re-export via canvas ref — but the simplest
      // approach is to update the data in a custom event.
      setSelectedNode((prev) => {
        if (!prev || prev.id !== nodeId) return prev;
        return { ...prev, data: { ...prev.data, config } };
      });

      // Dispatch a custom event the canvas can subscribe to (keeps components decoupled).
      window.dispatchEvent(
        new CustomEvent("sd:config-change", { detail: { nodeId, config } })
      );
    },
    []
  );

  // ---------- Submit ----------
  const handleSubmit = async () => {
    if (!canvasRef.current) return;

    const { nodes, edges } = canvasRef.current.exportGraph();
    if (nodes.length === 0) {
      alert("Please add at least one component to the canvas.");
      return;
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
        { withCredentials: true }
      );

      setResult(res.data.data?.evaluation ?? null);
    } catch (err) {
      console.error("Submission error:", err);
      alert("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-black">
      {/* Top bar */}
      <header className="flex items-center justify-between h-14 px-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/simulations"
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            System Design — {simulationId}
          </h1>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
                     bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
          Submit
        </button>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <ComponentSidebar />

        {/* Canvas */}
        <div className="flex flex-col flex-1">
          <div className="flex-1 overflow-hidden">
            <SystemDesignCanvas
              ref={canvasRef}
              onNodeSelect={setSelectedNode}
            />
          </div>

          {/* Explanation */}
          <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-3 shrink-0">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Architecture Explanation
            </label>
            <textarea
              rows={3}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explain your design decisions, trade-offs, and why you chose this architecture..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700
                         bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100
                         placeholder:text-gray-400 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Config panel */}
        {selectedNode && (
          <NodeConfigPanel
            node={selectedNode}
            onConfigChange={handleConfigChange}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>

      {/* Feedback modal */}
      <FeedbackPanel result={result} onClose={() => setResult(null)} />
    </div>
  );
}
