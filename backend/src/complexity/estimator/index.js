/**
 * @fileoverview Hybrid complexity estimator — combines static and runtime
 * analysis results into a single, high-confidence estimate.
 *
 * DESIGN DECISIONS:
 * - Two-layer analysis: static (fast, heuristic) + runtime (slow, empirical).
 * - Agreement between layers dramatically increases confidence.
 * - When they disagree, we apply a conservative strategy:
 *   1. Strong runtime evidence (R² > 0.9) overrides static analysis
 *   2. Clear static patterns (confidence > 0.8) override noisy benchmarks
 *   3. If both are weak, take the pessimistic (higher) estimate
 * - Returns an "agreement status" so the UI can show how reliable the result is.
 */

import { runStaticAnalysis } from '../analyzer/index.js';
import { runBenchmarkEngine } from '../benchmark/index.js';
import {
  calculateOverallConfidence,
  resolveDisagreement,
} from './confidence.js';
import { ComplexityClass, AnalysisMode, COMPLEXITY_ORDER } from '../types.js';

/**
 * Run the hybrid complexity estimation pipeline.
 *
 * @param {import('../types.js').AnalysisRequest} request
 * @returns {Promise<import('../types.js').HybridAnalysisResult>}
 */
export async function estimateComplexity(request) {
  const { code, language, functionName, mode = AnalysisMode.FULL } = request;

  let staticResult = null;
  let runtimeResult = null;

  // ---- Phase 1: Static Analysis (always fast, no execution) ----
  if (mode !== AnalysisMode.BENCHMARK_ONLY) {
    staticResult = await runStaticAnalysis(code, language);
  }

  // ---- Phase 2: Runtime Benchmark (requires Docker, slower) ----
  if (mode !== AnalysisMode.STATIC_ONLY && functionName) {
    try {
      runtimeResult = await runBenchmarkEngine({
        code,
        language,
        functionName,
        staticResult, // Pass static result for input size optimization
      });
    } catch (err) {
      console.warn('[Estimator] Benchmark failed, using static-only:', err.message);
    }
  }

  // ---- Phase 3: Combine Results ----
  return combineResults(staticResult, runtimeResult);
}

/**
 * Combine static and runtime analysis results into a hybrid estimate.
 *
 * @param {import('../types.js').StaticAnalysisResult | null} staticResult
 * @param {import('../types.js').RuntimeAnalysisResult | null} runtimeResult
 * @returns {import('../types.js').HybridAnalysisResult}
 */
function combineResults(staticResult, runtimeResult) {
  // ---- Handle edge cases ----
  if (!staticResult && !runtimeResult) {
    return {
      timeComplexity: ComplexityClass.UNKNOWN,
      spaceComplexity: ComplexityClass.UNKNOWN,
      confidence: 0,
      staticAnalysis: null,
      runtimeAnalysis: null,
      agreementStatus: 'no-analysis',
    };
  }

  if (!runtimeResult) {
    // Static-only mode
    return {
      timeComplexity: staticResult.timeComplexity,
      spaceComplexity: staticResult.spaceComplexity,
      confidence: staticResult.confidence * 0.85, // Penalize slightly for no runtime confirmation
      staticAnalysis: staticResult,
      runtimeAnalysis: null,
      agreementStatus: 'static-only',
    };
  }

  if (!staticResult) {
    // Benchmark-only mode
    return {
      timeComplexity: runtimeResult.timeComplexity,
      spaceComplexity: runtimeResult.spaceComplexity,
      confidence: runtimeResult.confidence * 0.85,
      staticAnalysis: null,
      runtimeAnalysis: runtimeResult,
      agreementStatus: 'benchmark-only',
    };
  }

  // ---- Both analyses available — combine ----

  // Resolve time complexity
  const staticTime = staticResult.timeComplexity;
  const runtimeTime = runtimeResult.timeComplexity;

  let timeComplexity;
  let timeAgreement;

  if (staticTime === runtimeTime) {
    timeComplexity = staticTime;
    timeAgreement = 'agree';
  } else if (areAdjacent(staticTime, runtimeTime)) {
    // Adjacent complexity classes — pick the more conservative one
    timeComplexity = resolveDisagreement(
      staticTime, runtimeTime,
      staticResult.confidence,
      runtimeResult.timeRegression?.rSquared || 0
    );
    timeAgreement = 'partial';
  } else {
    timeComplexity = resolveDisagreement(
      staticTime, runtimeTime,
      staticResult.confidence,
      runtimeResult.timeRegression?.rSquared || 0
    );
    timeAgreement = 'disagree';
  }

  // Resolve space complexity
  const staticSpace = staticResult.spaceComplexity;
  const runtimeSpace = runtimeResult.spaceComplexity;

  // For space, prefer static analysis (memory measurement is less reliable than timing)
  let spaceComplexity;
  if (runtimeSpace !== ComplexityClass.UNKNOWN && staticSpace !== ComplexityClass.UNKNOWN) {
    // Prefer the higher (more conservative) estimate
    const sIdx = COMPLEXITY_ORDER.indexOf(staticSpace);
    const rIdx = COMPLEXITY_ORDER.indexOf(runtimeSpace);
    spaceComplexity = sIdx >= rIdx ? staticSpace : runtimeSpace;
  } else {
    spaceComplexity = staticSpace !== ComplexityClass.UNKNOWN ? staticSpace : runtimeSpace;
  }

  // Calculate overall confidence
  const { confidence, factors, status } = calculateOverallConfidence({
    staticConfidence: staticResult.confidence,
    runtimeRSquared: runtimeResult.timeRegression?.rSquared || null,
    staticComplexity: staticTime,
    runtimeComplexity: runtimeTime,
    dataPointCount: runtimeResult.dataPoints?.filter((dp) => !dp.timedOut).length || 0,
    hasPatternMatch: staticResult.patterns?.length > 0,
  });

  return {
    timeComplexity,
    spaceComplexity,
    confidence,
    staticAnalysis: staticResult,
    runtimeAnalysis: runtimeResult,
    agreementStatus: timeAgreement,
    confidenceFactors: factors,
  };
}

/**
 * Check if two complexity classes are adjacent in the complexity order.
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function areAdjacent(a, b) {
  const idxA = COMPLEXITY_ORDER.indexOf(a);
  const idxB = COMPLEXITY_ORDER.indexOf(b);
  if (idxA === -1 || idxB === -1) return false;
  return Math.abs(idxA - idxB) === 1;
}
