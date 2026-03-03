"use client";

import { useState } from "react";
import {
  X,
  Brain,
  Loader2,
  Clock,
  HardDrive,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";

interface ComplexityAnalysisResult {
  analysisId: string;
  timeComplexity: string;
  spaceComplexity: string;
  confidence: number;
  explanation: {
    explanationSimple: string;
    explanationTechnical: string;
    optimizationSuggestion: string;
    isOptimal: boolean;
    tleRisk: string | null;
    memoryRisk: string | null;
    maxFeasibleN: number | null;
    growthDescription: string;
  };
  mlPrediction: {
    prediction: string;
    confidence: number;
  } | null;
  analysisTimeMs: number;
}

interface ComplexityAnalysisModalProps {
  code: string;
  language: string;
  questionId: string;
  onClose: () => void;
}

export default function ComplexityAnalysisModal({
  code,
  language,
  questionId,
  onClose,
}: ComplexityAnalysisModalProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComplexityAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTechnical, setShowTechnical] = useState(false);

  const analyzeComplexity = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch("/api/complexity/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          code,
          language,
          questionId,
          mode: "static-only",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || data.error || "Analysis failed");
        setLoading(false);
        return;
      }

      if (data.success && data.data) {
        setResult(data.data);
      } else {
        setError("Unexpected response format");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze complexity");
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return "Very High";
    if (confidence >= 0.6) return "High";
    if (confidence >= 0.4) return "Medium";
    return "Low";
  };

  const formatComplexity = (c: string) => {
    return c
      .replace("O(1)", "O(1)")
      .replace("O(log n)", "O(log n)")
      .replace("O(n)", "O(n)")
      .replace("O(n log n)", "O(n log n)")
      .replace("O(n^2)", "O(n²)")
      .replace("O(n^3)", "O(n³)")
      .replace("O(2^n)", "O(2ⁿ)")
      .replace("O(n!)", "O(n!)");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-black" />
            <div>
              <h2 className="text-lg font-bold text-black">
                Complexity Analysis
              </h2>
              <p className="text-xs text-gray-500 font-mono">
                Powered by static analysis + ML
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">
          {/* Initial state — show analyze button */}
          {!loading && !result && !error && (
            <div className="text-center py-12">
              <div className="inline-flex p-4 bg-gray-100 rounded-full mb-4">
                <Brain className="w-10 h-10 text-black" />
              </div>
              <h3 className="text-lg font-semibold text-black mb-2">
                Analyze Your Solution
              </h3>
              <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                Our AI will analyze your code&apos;s time and space complexity,
                provide a detailed explanation, and suggest optimizations.
              </p>
              <button
                onClick={analyzeComplexity}
                className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                <Zap className="w-5 h-5" />
                Analyze Time Complexity
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-black mx-auto mb-4" />
              <p className="text-sm text-gray-600 font-medium">
                Analyzing your code...
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Running static analysis and ML classification
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-center py-12">
              <div className="inline-flex p-3 bg-gray-100 rounded-full mb-4">
                <AlertTriangle className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-lg font-semibold text-black mb-2">
                Analysis Failed
              </h3>
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              <button
                onClick={analyzeComplexity}
                className="inline-flex items-center gap-2 px-5 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-5">
              {/* Complexity Cards */}
              <div className="grid grid-cols-2 gap-4">
                {/* Time Complexity */}
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="font-mono text-xs text-gray-500 tracking-[0.15em]">
                      TIME COMPLEXITY
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-black font-mono">
                    {formatComplexity(result.timeComplexity)}
                  </p>
                  {result.explanation.growthDescription && (
                    <p className="text-xs text-gray-500 mt-1">
                      {result.explanation.growthDescription}
                    </p>
                  )}
                </div>

                {/* Space Complexity */}
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <HardDrive className="w-4 h-4 text-gray-500" />
                    <span className="font-mono text-xs text-gray-500 tracking-[0.15em]">
                      SPACE COMPLEXITY
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-black font-mono">
                    {formatComplexity(result.spaceComplexity)}
                  </p>
                </div>
              </div>

              {/* Confidence */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-gray-500" />
                  <span className="font-mono text-xs text-gray-500 tracking-[0.15em]">
                    CONFIDENCE: {getConfidenceLabel(result.confidence).toUpperCase()}
                  </span>
                </div>
                <span className="font-mono text-sm font-bold text-black">
                  {(result.confidence * 100).toFixed(0)}%
                </span>
              </div>

              {/* ML Prediction Badge */}
              {result.mlPrediction && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                  <Brain className="w-4 h-4 text-gray-400" />
                  <span className="font-mono text-xs text-gray-500">
                    ML PREDICTION:{" "}
                    <span className="font-bold text-black">
                      {formatComplexity(result.mlPrediction.prediction)}
                    </span>{" "}
                    ({(result.mlPrediction.confidence * 100).toFixed(0)}%)
                  </span>
                </div>
              )}

              {/* Simple Explanation */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-mono text-xs tracking-[0.2em] text-gray-500 mb-3">
                  EXPLANATION
                </h4>
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {result.explanation.explanationSimple}
                </div>
              </div>

              {/* Technical Explanation (Collapsible) */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowTechnical(!showTechnical)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <span className="font-mono text-xs tracking-[0.2em] text-gray-500">
                    TECHNICAL DETAILS
                  </span>
                  {showTechnical ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                {showTechnical && (
                  <div className="p-4 border-t border-gray-200">
                    <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-mono">
                      {result.explanation.explanationTechnical
                        .split("**")
                        .map((part, idx) =>
                          idx % 2 === 1 ? (
                            <strong key={idx} className="text-gray-900">
                              {part}
                            </strong>
                          ) : (
                            <span key={idx}>{part}</span>
                          )
                        )}
                    </div>
                  </div>
                )}
              </div>

              {/* Optimization Suggestions */}
              {result.explanation.optimizationSuggestion && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    {result.explanation.isOptimal ? (
                      <CheckCircle2 className="w-4 h-4 text-black" />
                    ) : (
                      <Zap className="w-4 h-4 text-black" />
                    )}
                    <span className="font-mono text-xs tracking-[0.2em] text-gray-500">
                      {result.explanation.isOptimal
                        ? "OPTIMAL SOLUTION"
                        : "OPTIMIZATION SUGGESTIONS"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {result.explanation.optimizationSuggestion}
                  </div>
                </div>
              )}

              {/* Risk Assessments */}
              {(result.explanation.tleRisk ||
                result.explanation.memoryRisk) && (
                <div className="space-y-3">
                  {result.explanation.tleRisk && (
                    <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                      <AlertTriangle className="w-4 h-4 text-black mt-0.5 shrink-0" />
                      <p className="text-sm text-gray-700">
                        {result.explanation.tleRisk}
                      </p>
                    </div>
                  )}
                  {result.explanation.memoryRisk && (
                    <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                      <HardDrive className="w-4 h-4 text-black mt-0.5 shrink-0" />
                      <p className="text-sm text-gray-700">
                        {result.explanation.memoryRisk}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Max Feasible N */}
              {result.explanation.maxFeasibleN &&
                result.explanation.maxFeasibleN !== null && (
                  <div className="text-center py-2">
                    <p className="text-xs text-gray-400 font-mono">
                      Max feasible input size (1s limit):{" "}
                      <span className="font-bold text-gray-600">
                        n ≈{" "}
                        {result.explanation.maxFeasibleN >= 1e9
                          ? "10⁹+"
                          : result.explanation.maxFeasibleN >= 1e6
                            ? `${(result.explanation.maxFeasibleN / 1e6).toFixed(0)}M`
                            : result.explanation.maxFeasibleN >= 1e3
                              ? `${(result.explanation.maxFeasibleN / 1e3).toFixed(0)}K`
                              : result.explanation.maxFeasibleN.toLocaleString()}
                      </span>
                    </p>
                  </div>
                )}

              {/* Analysis Metadata */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400 font-mono">
                  Analysis ID: {result.analysisId}
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  {result.analysisTimeMs}ms
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-3 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-100 text-black text-xs rounded flex items-center gap-2 hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
