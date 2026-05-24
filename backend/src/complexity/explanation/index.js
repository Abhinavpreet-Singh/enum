/**
 * @fileoverview AI Explanation Layer — generates human-readable explanations
 * of complexity analysis results.
 *
 * Produces:
 * 1. Simple (beginner) explanation
 * 2. Technical (interview) explanation
 * 3. Optimization suggestions
 * 4. TLE/memory risk assessment
 * 5. Comparison with optimal solution (if questionId provided)
 */

import { getTemplate, estimateMaxN } from './templates.js';
import { ComplexityClass, COMPLEXITY_ORDER } from '../types.js';

/**
 * Generate complete explanation for a complexity analysis result.
 *
 * @param {Object} params
 * @param {import('../types.js').HybridAnalysisResult} params.hybridResult - Combined analysis result
 * @param {Object} [params.optimalComplexity] - Known optimal complexity for the problem
 * @param {string} [params.optimalComplexity.time] - Optimal time complexity
 * @param {string} [params.optimalComplexity.space] - Optimal space complexity
 * @param {number} [params.constraintN] - Max N from problem constraints (e.g., 10^5)
 * @returns {import('../types.js').ExplanationResult}
 */
export function generateExplanation({
  hybridResult,
  optimalComplexity = null,
  constraintN = null,
}) {
  const { timeComplexity, spaceComplexity, confidence, staticAnalysis, runtimeAnalysis, agreementStatus } = hybridResult;

  const timeTemplate = getTemplate(timeComplexity);
  const spaceTemplate = getTemplate(spaceComplexity);

  // ---- Simple Explanation ----
  let explanationSimple = timeTemplate.simple;

  if (spaceComplexity !== ComplexityClass.O_1 && spaceComplexity !== ComplexityClass.UNKNOWN) {
    explanationSimple += `\n\nFor memory: your code uses ${spaceComplexity} space. ${spaceTemplate.simple}`;
  }

  if (confidence < 0.5) {
    explanationSimple += '\n\n⚠️ Note: This analysis has low confidence. The actual complexity may differ.';
  }

  if (agreementStatus === 'disagree') {
    explanationSimple += '\n\n⚠️ The static analysis and runtime benchmark disagreed on the complexity. The estimate may be less reliable.';
  }

  // ---- Technical Explanation ----
  let explanationTechnical = `**Time Complexity: ${timeComplexity}**\n${timeTemplate.technical}`;
  explanationTechnical += `\n\n**Space Complexity: ${spaceComplexity}**\n`;

  if (spaceComplexity === ComplexityClass.O_1) {
    explanationTechnical += 'Constant extra space — no auxiliary data structures that grow with input.';
  } else {
    explanationTechnical += spaceTemplate.technical || `Uses ${spaceComplexity} auxiliary space.`;
  }

  // Add analysis details
  if (staticAnalysis) {
    const details = [];

    if (staticAnalysis.maxLoopDepth > 0) {
      details.push(`Loop nesting depth: ${staticAnalysis.maxLoopDepth}`);
    }
    if (staticAnalysis.hasLogarithmicLoop) {
      details.push('Contains logarithmic loop (halving pattern detected)');
    }
    if (staticAnalysis.recursion?.length > 0) {
      const rec = staticAnalysis.recursion[0];
      details.push(`Recursion: ${rec.recursiveCalls} recursive call(s) in \`${rec.functionName}\``);
      if (rec.hasMemoization) details.push('Memoization detected — reduces exponential to polynomial');
      if (rec.isTailRecursion) details.push('Tail recursion detected — can be optimized by compiler');
    }
    if (staticAnalysis.hasSorting) {
      details.push('Sorting operation detected (contributes O(n log n))');
    }
    if (staticAnalysis.patterns?.length > 0) {
      details.push(`Algorithmic patterns: ${staticAnalysis.patterns.join(', ')}`);
    }

    if (details.length > 0) {
      explanationTechnical += '\n\n**Analysis Details:**\n' + details.map((d) => `• ${d}`).join('\n');
    }
  }

  if (runtimeAnalysis && runtimeAnalysis.timeRegression) {
    explanationTechnical += `\n\n**Empirical Analysis:**\n`;
    explanationTechnical += `• Best regression fit: ${runtimeAnalysis.timeRegression.bestFit} (R² = ${runtimeAnalysis.timeRegression.rSquared})`;
    explanationTechnical += `\n• Data points collected: ${runtimeAnalysis.dataPoints?.filter((d) => !d.timedOut).length || 0}`;
    if (runtimeAnalysis.hitTimeout) {
      explanationTechnical += '\n• ⚠️ Some input sizes caused timeout';
    }
  }

  explanationTechnical += `\n\n**Confidence: ${(confidence * 100).toFixed(0)}%** (${getConfidenceLabel(confidence)})`;

  // ---- Optimization Suggestions ----
  let optimizationSuggestion = '';
  let isOptimal = false;

  if (optimalComplexity) {
    const userTimeIdx = COMPLEXITY_ORDER.indexOf(timeComplexity);
    const optimalTimeIdx = COMPLEXITY_ORDER.indexOf(optimalComplexity.time);

    if (userTimeIdx <= optimalTimeIdx) {
      isOptimal = true;
      optimizationSuggestion = `✅ Your solution has optimal time complexity (${timeComplexity}). `;

      // Check space
      if (optimalComplexity.space) {
        const userSpaceIdx = COMPLEXITY_ORDER.indexOf(spaceComplexity);
        const optimalSpaceIdx = COMPLEXITY_ORDER.indexOf(optimalComplexity.space);

        if (userSpaceIdx > optimalSpaceIdx) {
          optimizationSuggestion += `However, space could be improved from ${spaceComplexity} to ${optimalComplexity.space}.`;
          isOptimal = false;
        } else {
          optimizationSuggestion += 'Space complexity is also optimal. Great job!';
        }
      }
    } else {
      isOptimal = false;
      optimizationSuggestion = `Your solution runs in ${timeComplexity}, but the optimal solution achieves ${optimalComplexity.time}. `;
      optimizationSuggestion += `\n\nSuggested optimizations:\n`;
      optimizationSuggestion += timeTemplate.optimizations.map((o) => `• ${o}`).join('\n');
    }
  } else {
    // No optimal complexity known — provide general optimizations
    if (timeTemplate.optimizations.length > 0) {
      optimizationSuggestion = `Potential optimizations for ${timeComplexity} algorithms:\n`;
      optimizationSuggestion += timeTemplate.optimizations.map((o) => `• ${o}`).join('\n');
    } else {
      optimizationSuggestion = 'Your algorithm already has excellent time complexity.';
      isOptimal = true;
    }
  }

  // ---- TLE Risk Assessment ----
  let tleRisk = null;
  if (constraintN) {
    tleRisk = assessTLERisk(timeComplexity, constraintN);
  } else {
    // Provide general TLE risk based on common competitive programming constraints
    const maxN = getTemplate(timeComplexity).maxFeasibleN;
    if (maxN !== Infinity && maxN > 0) {
      tleRisk = `This complexity will fail for n > ${formatNumber(maxN)} (assuming 1-second time limit).`;
    }
  }

  // ---- Memory Risk Assessment ----
  let memoryRisk = null;
  const spaceMaxN = getTemplate(spaceComplexity).maxFeasibleN;
  if (spaceComplexity === ComplexityClass.O_N_SQUARED) {
    memoryRisk = 'O(n²) space is risky — for n = 10,000, this uses ~400MB. Consider reducing to O(n).';
  } else if (spaceComplexity === ComplexityClass.O_N && constraintN && constraintN > 1e7) {
    memoryRisk = `O(n) space with n = ${formatNumber(constraintN)} uses ~${Math.round(constraintN * 8 / 1e6)}MB. Watch memory limits.`;
  }

  // ---- Max Feasible N ----
  const maxFeasibleN = estimateMaxN(timeComplexity);

  return {
    explanationSimple,
    explanationTechnical,
    optimizationSuggestion,
    isOptimal,
    tleRisk,
    memoryRisk,
    maxFeasibleN,
    growthDescription: timeTemplate.growthDescription,
  };
}

// ============================================================
// Helpers
// ============================================================

/**
 * Assess TLE risk for a given constraint.
 *
 * @param {string} timeComplexity
 * @param {number} constraintN
 * @returns {string | null}
 */
function assessTLERisk(timeComplexity, constraintN) {
  const maxN = getTemplate(timeComplexity).maxFeasibleN;

  if (maxN === Infinity) return null;

  if (constraintN > maxN * 2) {
    return `🔴 HIGH RISK: Your ${timeComplexity} solution will almost certainly TLE for n = ${formatNumber(constraintN)}. ` +
      `Max feasible n for ${timeComplexity} is ~${formatNumber(maxN)}.`;
  }

  if (constraintN > maxN * 0.5) {
    return `🟡 MODERATE RISK: Your ${timeComplexity} solution is borderline for n = ${formatNumber(constraintN)}. ` +
      `It may pass with a fast language (C++) but TLE in Python/Java.`;
  }

  return `🟢 Low risk: Your ${timeComplexity} solution should handle n = ${formatNumber(constraintN)} comfortably.`;
}

/**
 * Get a human-readable confidence label.
 *
 * @param {number} confidence
 * @returns {string}
 */
function getConfidenceLabel(confidence) {
  if (confidence >= 0.8) return 'Very High';
  if (confidence >= 0.6) return 'High';
  if (confidence >= 0.4) return 'Medium';
  if (confidence >= 0.2) return 'Low';
  return 'Very Low';
}

/**
 * Format a large number for display.
 *
 * @param {number} n
 * @returns {string}
 */
function formatNumber(n) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(0)} × 10⁹`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)} × 10⁶`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)} × 10³`;
  return String(n);
}
