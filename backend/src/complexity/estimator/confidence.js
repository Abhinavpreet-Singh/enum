/**
 * @fileoverview Confidence scoring logic for complexity estimates.
 *
 * DESIGN DECISIONS:
 * - Multi-factor confidence calculation based on:
 *   1. Static analysis confidence (how clear the code patterns are)
 *   2. Regression R² (how well benchmarks fit the model)
 *   3. Agreement between static and runtime estimates
 *   4. Number of data points available
 * - Score is normalized to [0, 1] where:
 *   0.0 - 0.3 = Low confidence (unreliable)
 *   0.3 - 0.6 = Medium confidence (likely correct)
 *   0.6 - 0.8 = High confidence (reliable)
 *   0.8 - 1.0 = Very high confidence (strong agreement)
 */

import { COMPLEXITY_ORDER } from '../types.js';

/**
 * Calculate agreement score between static and runtime complexity estimates.
 *
 * @param {string} staticComplexity - Static analysis estimate
 * @param {string} runtimeComplexity - Runtime benchmark estimate
 * @returns {{score: number, status: 'agree' | 'adjacent' | 'disagree'}}
 */
export function calculateAgreement(staticComplexity, runtimeComplexity) {
  const staticIdx = COMPLEXITY_ORDER.indexOf(staticComplexity);
  const runtimeIdx = COMPLEXITY_ORDER.indexOf(runtimeComplexity);

  // If either estimate is unknown, can't compute agreement
  if (staticIdx === -1 || runtimeIdx === -1) {
    return { score: 0.3, status: 'disagree' };
  }

  const distance = Math.abs(staticIdx - runtimeIdx);

  if (distance === 0) {
    return { score: 1.0, status: 'agree' };
  } else if (distance === 1) {
    // Adjacent complexity classes (e.g., O(n) vs O(n log n)) — partial agreement
    return { score: 0.7, status: 'adjacent' };
  } else {
    // Significant disagreement
    return { score: Math.max(0, 0.5 - distance * 0.1), status: 'disagree' };
  }
}

/**
 * Calculate overall confidence score from all analysis signals.
 *
 * @param {Object} params
 * @param {number} params.staticConfidence - Static analyzer confidence (0-1)
 * @param {number} [params.runtimeRSquared] - Regression R² value (0-1), null if no runtime
 * @param {string} [params.staticComplexity] - Static complexity estimate
 * @param {string} [params.runtimeComplexity] - Runtime complexity estimate
 * @param {number} [params.dataPointCount] - Number of benchmark data points
 * @param {boolean} [params.hasPatternMatch] - Whether a known algo pattern was detected
 * @returns {{confidence: number, factors: Object, status: string}}
 */
export function calculateOverallConfidence({
  staticConfidence,
  runtimeRSquared = null,
  staticComplexity = null,
  runtimeComplexity = null,
  dataPointCount = 0,
  hasPatternMatch = false,
}) {
  const factors = {};

  // Factor 1: Static analysis confidence (weight: 0.3)
  factors.static = staticConfidence;

  // Factor 2: Runtime regression quality (weight: 0.3)
  if (runtimeRSquared !== null) {
    factors.regression = runtimeRSquared;
  }

  // Factor 3: Agreement between static and runtime (weight: 0.25)
  let agreement = null;
  if (staticComplexity && runtimeComplexity) {
    agreement = calculateAgreement(staticComplexity, runtimeComplexity);
    factors.agreement = agreement.score;
  }

  // Factor 4: Data sufficiency bonus (weight: 0.1)
  if (dataPointCount > 0) {
    factors.dataSufficiency = Math.min(1, dataPointCount / 7); // 7+ points = full score
  }

  // Factor 5: Pattern match bonus (weight: 0.05)
  if (hasPatternMatch) {
    factors.patternBonus = 0.15;
  }

  // Compute weighted average
  let totalWeight = 0;
  let weightedSum = 0;

  const weights = {
    static: 0.30,
    regression: 0.30,
    agreement: 0.25,
    dataSufficiency: 0.10,
    patternBonus: 0.05,
  };

  for (const [factor, value] of Object.entries(factors)) {
    if (value !== null && value !== undefined && weights[factor]) {
      weightedSum += value * weights[factor];
      totalWeight += weights[factor];
    }
  }

  // Normalize to account for missing factors
  const confidence = totalWeight > 0
    ? Math.round((weightedSum / totalWeight) * 100) / 100
    : staticConfidence;

  // Determine overall status
  let status;
  if (agreement) {
    status = agreement.status === 'agree' ? 'agree'
      : agreement.status === 'adjacent' ? 'partial'
        : 'disagree';
  } else {
    status = 'static-only';
  }

  return {
    confidence: Math.max(0, Math.min(1, confidence)),
    factors,
    status,
  };
}

/**
 * Determine the final complexity when static and runtime disagree.
 * Uses a heuristic: trust the runtime estimate more when R² is high,
 * trust the static estimate more when it detects clear patterns.
 *
 * @param {string} staticComplexity
 * @param {string} runtimeComplexity
 * @param {number} staticConfidence
 * @param {number} runtimeRSquared
 * @returns {string} Final complexity estimate
 */
export function resolveDisagreement(
  staticComplexity,
  runtimeComplexity,
  staticConfidence,
  runtimeRSquared
) {
  // If one is unknown, use the other
  if (!staticComplexity || staticComplexity === 'Unknown') return runtimeComplexity;
  if (!runtimeComplexity || runtimeComplexity === 'Unknown') return staticComplexity;

  // Weight the decision by confidence
  const staticWeight = staticConfidence * 0.6;
  const runtimeWeight = runtimeRSquared * 0.4;

  if (runtimeWeight > staticWeight && runtimeRSquared > 0.85) {
    // Strong empirical evidence trumps static analysis
    return runtimeComplexity;
  }

  if (staticWeight > runtimeWeight && staticConfidence > 0.8) {
    // Clear code patterns trump noisy benchmarks
    return staticComplexity;
  }

  // When in doubt, prefer the higher (worse) complexity estimate
  // This is conservative — better to over-estimate than under-estimate
  const staticIdx = COMPLEXITY_ORDER.indexOf(staticComplexity);
  const runtimeIdx = COMPLEXITY_ORDER.indexOf(runtimeComplexity);

  return staticIdx >= runtimeIdx ? staticComplexity : runtimeComplexity;
}
