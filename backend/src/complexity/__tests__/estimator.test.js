/**
 * @fileoverview Unit tests for the hybrid estimator logic.
 *
 * Tests verify:
 * - Confidence scoring math
 * - Agreement detection between static & runtime results
 * - Disagreement resolution strategy
 */

import { describe, it, expect } from '@jest/globals';
import {
  calculateOverallConfidence,
  calculateAgreement,
  resolveDisagreement,
} from '../estimator/confidence.js';

// ============================================================
// Agreement Scoring
// ============================================================

describe('calculateAgreement', () => {
  it('should return score 1.0 and "agree" for matching complexities', () => {
    const result = calculateAgreement('O(n)', 'O(n)');
    expect(result.score).toBe(1.0);
    expect(result.status).toBe('agree');
  });

  it('should return "adjacent" for neighboring complexity classes', () => {
    const result = calculateAgreement('O(n)', 'O(n log n)');
    expect(result.score).toBe(0.7);
    expect(result.status).toBe('adjacent');
  });

  it('should return "disagree" for distant complexity classes', () => {
    const result = calculateAgreement('O(1)', 'O(n^2)');
    expect(result.status).toBe('disagree');
    expect(result.score).toBeLessThan(0.5);
  });

  it('should handle unknown complexities gracefully', () => {
    const result = calculateAgreement('O(n)', 'Unknown');
    expect(result.status).toBe('disagree');
  });
});

// ============================================================
// Confidence Scoring
// ============================================================

describe('calculateOverallConfidence', () => {
  it('should return high confidence when static and runtime agree', () => {
    const { confidence } = calculateOverallConfidence({
      staticConfidence: 0.9,
      runtimeRSquared: 0.95,
      staticComplexity: 'O(n)',
      runtimeComplexity: 'O(n)',
      dataPointCount: 7,
      hasPatternMatch: true,
    });
    expect(confidence).toBeGreaterThan(0.8);
  });

  it('should return lower confidence when results disagree', () => {
    const { confidence: agreeConf } = calculateOverallConfidence({
      staticConfidence: 0.9,
      runtimeRSquared: 0.95,
      staticComplexity: 'O(n)',
      runtimeComplexity: 'O(n)',
      dataPointCount: 7,
      hasPatternMatch: true,
    });

    const { confidence: disagreeConf } = calculateOverallConfidence({
      staticConfidence: 0.9,
      runtimeRSquared: 0.95,
      staticComplexity: 'O(n)',
      runtimeComplexity: 'O(n^2)',
      dataPointCount: 7,
      hasPatternMatch: false,
    });

    expect(agreeConf).toBeGreaterThan(disagreeConf);
  });

  it('should give bonus for pattern detection', () => {
    const { confidence: withPattern } = calculateOverallConfidence({
      staticConfidence: 0.7,
      runtimeRSquared: 0.8,
      staticComplexity: 'O(n log n)',
      runtimeComplexity: 'O(n log n)',
      dataPointCount: 5,
      hasPatternMatch: true,
    });

    const { confidence: withoutPattern } = calculateOverallConfidence({
      staticConfidence: 0.7,
      runtimeRSquared: 0.8,
      staticComplexity: 'O(n log n)',
      runtimeComplexity: 'O(n log n)',
      dataPointCount: 5,
      hasPatternMatch: false,
    });

    expect(withPattern).toBeGreaterThan(withoutPattern);
  });

  it('should penalize low data point count', () => {
    const { confidence: fewPoints } = calculateOverallConfidence({
      staticConfidence: 0.9,
      runtimeRSquared: 0.9,
      staticComplexity: 'O(n)',
      runtimeComplexity: 'O(n)',
      dataPointCount: 2,
      hasPatternMatch: false,
    });

    const { confidence: manyPoints } = calculateOverallConfidence({
      staticConfidence: 0.9,
      runtimeRSquared: 0.9,
      staticComplexity: 'O(n)',
      runtimeComplexity: 'O(n)',
      dataPointCount: 10,
      hasPatternMatch: false,
    });

    expect(manyPoints).toBeGreaterThan(fewPoints);
  });

  it('should clamp confidence to [0, 1]', () => {
    const { confidence } = calculateOverallConfidence({
      staticConfidence: 1.0,
      runtimeRSquared: 1.0,
      staticComplexity: 'O(1)',
      runtimeComplexity: 'O(1)',
      dataPointCount: 20,
      hasPatternMatch: true,
    });
    expect(confidence).toBeLessThanOrEqual(1.0);
    expect(confidence).toBeGreaterThanOrEqual(0.0);
  });

  it('should return status "static-only" when no runtime provided', () => {
    const { status } = calculateOverallConfidence({
      staticConfidence: 0.8,
    });
    expect(status).toBe('static-only');
  });

  it('should return factor details', () => {
    const { factors } = calculateOverallConfidence({
      staticConfidence: 0.85,
      runtimeRSquared: 0.9,
      staticComplexity: 'O(n)',
      runtimeComplexity: 'O(n)',
      dataPointCount: 7,
      hasPatternMatch: true,
    });
    expect(factors.static).toBe(0.85);
    expect(factors.regression).toBe(0.9);
    expect(factors.agreement).toBeDefined();
    expect(factors.dataSufficiency).toBeDefined();
    expect(factors.patternBonus).toBeDefined();
  });
});

// ============================================================
// Disagreement Resolution
// ============================================================

describe('resolveDisagreement', () => {
  it('should prefer runtime when R² is very high', () => {
    const result = resolveDisagreement('O(n)', 'O(n^2)', 0.5, 0.95);
    // Runtime weight = 0.95 * 0.4 = 0.38, Static weight = 0.5 * 0.6 = 0.30
    // runtimeWeight > staticWeight AND runtimeRSquared > 0.85 → prefer runtime
    expect(result).toBe('O(n^2)');
  });

  it('should prefer static when static confidence is high and runtime R² is low', () => {
    const result = resolveDisagreement('O(n)', 'O(n^3)', 0.9, 0.3);
    // staticWeight = 0.9 * 0.6 = 0.54, runtimeWeight = 0.3 * 0.4 = 0.12
    // staticWeight > runtimeWeight AND staticConfidence > 0.8 → prefer static
    expect(result).toBe('O(n)');
  });

  it('should prefer the higher (conservative) estimate when both are uncertain', () => {
    const result = resolveDisagreement('O(n)', 'O(n^2)', 0.5, 0.5);
    // Neither threshold met → pick the higher (more conservative) estimate
    expect(result).toBe('O(n^2)');
  });

  it('should return known estimate if the other is unknown', () => {
    const result = resolveDisagreement('O(n)', 'Unknown', 0.8, 0.5);
    expect(result).toBe('O(n)');
  });
});
