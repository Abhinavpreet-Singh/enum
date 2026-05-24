/**
 * @fileoverview Unit tests for OLS regression and curve fitting.
 *
 * These tests verify correct complexity classification from
 * synthetic runtime data points.
 *
 * The regression API expects arrays of {inputSize, executionTimeMs} objects
 * for time, and {inputSize, memoryUsageBytes} objects for memory.
 */

import { describe, it, expect } from '@jest/globals';
import { fitComplexityCurve, fitMemoryCurve, generateChartData } from '../benchmark/regression.js';

// ============================================================
// Helpers — generate synthetic data
// ============================================================

/**
 * Generate data points following a known complexity pattern.
 *
 * @param {(n: number) => number} f - Complexity function
 * @param {number[]} sizes - Input sizes
 * @param {number} noise - Noise factor (0-1)
 * @returns {Array<{inputSize: number, executionTimeMs: number}>}
 */
function syntheticTimeData(f, sizes, noise = 0.05) {
  // First element is treated as warm-up and removed by preprocessing,
  // so prepend a dummy warm-up point.
  return [
    { inputSize: sizes[0], executionTimeMs: f(sizes[0]) * 1.5 }, // warm-up
    ...sizes.map((n) => {
      const base = f(n);
      const jitter = base * noise * (Math.random() - 0.5) * 2;
      return { inputSize: n, executionTimeMs: Math.max(1, base + jitter) };
    }),
  ];
}

const SIZES = [100, 200, 500, 1000, 2000, 5000, 10000];
const SMALL_SIZES = [5, 8, 10, 12, 15, 18, 20];

// ============================================================
// Time Complexity Regression
// ============================================================

describe('fitComplexityCurve', () => {
  it('should detect O(1) for constant-time data', () => {
    const data = syntheticTimeData(() => 100, SIZES, 0.02);
    const result = fitComplexityCurve(data);
    expect(result.bestFit).toBe('O(1)');
  });

  it('should detect O(n) for linear data', () => {
    const data = syntheticTimeData((n) => 2 * n, SIZES, 0.02);
    const result = fitComplexityCurve(data);
    expect(result.bestFit).toBe('O(n)');
    expect(result.rSquared).toBeGreaterThan(0.9);
  });

  it('should detect O(n^2) for quadratic data', () => {
    const data = syntheticTimeData((n) => 0.5 * n * n, SIZES, 0.02);
    const result = fitComplexityCurve(data);
    expect(result.bestFit).toBe('O(n^2)');
    expect(result.rSquared).toBeGreaterThan(0.9);
  });

  it('should detect O(n log n) for n-log-n data', () => {
    const data = syntheticTimeData((n) => n * Math.log2(n), SIZES, 0.02);
    const result = fitComplexityCurve(data);
    expect(result.bestFit).toBe('O(n log n)');
    expect(result.rSquared).toBeGreaterThan(0.9);
  });

  it('should detect O(log n) for logarithmic data', () => {
    const data = syntheticTimeData((n) => 10 * Math.log2(n), SIZES, 0.02);
    const result = fitComplexityCurve(data);
    expect(result.bestFit).toBe('O(log n)');
    expect(result.rSquared).toBeGreaterThan(0.8);
  });

  it('should detect O(n^3) for cubic data', () => {
    const sizes = [10, 20, 30, 50, 70, 100];
    const data = syntheticTimeData((n) => n * n * n, sizes, 0.02);
    const result = fitComplexityCurve(data);
    expect(result.bestFit).toBe('O(n^3)');
    expect(result.rSquared).toBeGreaterThan(0.9);
  });

  it('should detect O(2^n) for exponential data', () => {
    const data = syntheticTimeData((n) => Math.pow(2, n), SMALL_SIZES, 0.02);
    const result = fitComplexityCurve(data);
    expect(result.bestFit).toBe('O(2^n)');
    expect(result.rSquared).toBeGreaterThan(0.9);
  });

  it('should return allFits map', () => {
    const data = syntheticTimeData((n) => n, SIZES, 0.02);
    const result = fitComplexityCurve(data);
    expect(result.allFits).toBeDefined();
    expect(typeof result.allFits).toBe('object');
    expect(Object.keys(result.allFits).length).toBeGreaterThanOrEqual(2);
  });

  it('should handle insufficient data points gracefully', () => {
    const data = [{ inputSize: 100, executionTimeMs: 50 }];
    const result = fitComplexityCurve(data);
    expect(result).toBeDefined();
    expect(result.bestFit).toBeDefined();
    expect(result.warning).toBeDefined(); // Should warn about insufficient data
  });
});

// ============================================================
// Memory Complexity Regression
// ============================================================

describe('fitMemoryCurve', () => {
  it('should detect O(n) memory usage', () => {
    const data = SIZES.map((n) => ({
      inputSize: n,
      memoryUsageBytes: n * 8 + 100,
    }));
    const result = fitMemoryCurve(data);
    expect(result.bestFit).toBe('O(n)');
  });

  it('should detect O(1) constant memory', () => {
    const data = SIZES.map((n) => ({
      inputSize: n,
      memoryUsageBytes: 1024,
    }));
    const result = fitMemoryCurve(data);
    expect(result.bestFit).toBe('O(1)');
  });

  it('should detect O(n^2) memory for matrix allocation', () => {
    const sizes = [10, 20, 50, 100, 200];
    const data = sizes.map((n) => ({
      inputSize: n,
      memoryUsageBytes: n * n * 8,
    }));
    const result = fitMemoryCurve(data);
    expect(result.bestFit).toBe('O(n^2)');
  });

  it('should handle insufficient memory data', () => {
    const data = [{ inputSize: 10, memoryUsageBytes: 100 }];
    const result = fitMemoryCurve(data);
    expect(result.warning).toBeDefined();
  });
});

// ============================================================
// Chart Data Generation
// ============================================================

describe('generateChartData', () => {
  it('should produce chart data with actual and predicted', () => {
    const data = SIZES.map((n) => ({
      inputSize: n,
      executionTimeMs: n * 2,
    }));
    const chart = generateChartData(data);
    expect(chart).toBeDefined();
    expect(chart.actual).toBeDefined();
    expect(chart.predicted).toBeDefined();
    expect(chart.actual).toHaveLength(data.length);
  });

  it('should have actual data matching input', () => {
    const data = [
      { inputSize: 100, executionTimeMs: 200 },
      { inputSize: 200, executionTimeMs: 400 },
      { inputSize: 500, executionTimeMs: 1000 },
    ];
    const chart = generateChartData(data);
    chart.actual.forEach((pt, i) => {
      expect(pt.n).toBe(data[i].inputSize);
      expect(pt.time).toBe(data[i].executionTimeMs);
    });
  });
});
