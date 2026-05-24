/**
 * @fileoverview Unit tests for the benchmark engine components.
 *
 * Tests cover:
 * - Input size constants
 * - Benchmark wrapper generation correctness per language
 * - Data structure generators (arrays, strings, etc.)
 *
 * Note: Actual Docker execution tests are integration tests,
 * not unit tests. These test the generation/parsing logic.
 */

import { describe, it, expect } from '@jest/globals';
import {
  DEFAULT_INPUT_SIZES,
  EXPONENTIAL_SAFE_SIZES,
  FAST_ALGO_SIZES,
  generateIntArray,
  generateSortedArray,
  generateString,
  generateMatrix,
  generateJSBenchmarkWrapper,
  generatePythonBenchmarkWrapper,
  generateJavaBenchmarkWrapper,
  generateCppBenchmarkWrapper,
  getWrapperGenerator,
} from '../benchmark/input-generator.js';

// ============================================================
// Input Size Constants
// ============================================================

describe('Input Size Constants', () => {
  it('DEFAULT_INPUT_SIZES should be in increasing order', () => {
    for (let i = 1; i < DEFAULT_INPUT_SIZES.length; i++) {
      expect(DEFAULT_INPUT_SIZES[i]).toBeGreaterThan(DEFAULT_INPUT_SIZES[i - 1]);
    }
  });

  it('EXPONENTIAL_SAFE_SIZES should have smaller max than DEFAULT', () => {
    const maxDefault = Math.max(...DEFAULT_INPUT_SIZES);
    const maxExp = Math.max(...EXPONENTIAL_SAFE_SIZES);
    expect(maxExp).toBeLessThan(maxDefault);
  });

  it('FAST_ALGO_SIZES should have larger max than DEFAULT', () => {
    const maxDefault = Math.max(...DEFAULT_INPUT_SIZES);
    const maxFast = Math.max(...FAST_ALGO_SIZES);
    expect(maxFast).toBeGreaterThan(maxDefault);
  });
});

// ============================================================
// Input Generators
// ============================================================

describe('generateIntArray', () => {
  it('should generate an array of the correct size', () => {
    const arr = generateIntArray(100);
    expect(arr).toHaveLength(100);
  });

  it('should produce deterministic outputs with same seed', () => {
    const a = generateIntArray(50, -100, 100, 42);
    const b = generateIntArray(50, -100, 100, 42);
    expect(a).toEqual(b);
  });

  it('should produce different outputs with different seeds', () => {
    const a = generateIntArray(50, -100, 100, 42);
    const b = generateIntArray(50, -100, 100, 99);
    expect(a).not.toEqual(b);
  });

  it('should respect min/max bounds', () => {
    const arr = generateIntArray(1000, 0, 10, 123);
    arr.forEach((val) => {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(10);
    });
  });
});

describe('generateSortedArray', () => {
  it('should generate a sorted array', () => {
    const arr = generateSortedArray(100);
    for (let i = 1; i < arr.length; i++) {
      expect(arr[i]).toBeGreaterThanOrEqual(arr[i - 1]);
    }
  });
});

describe('generateString', () => {
  it('should generate a string of specified length', () => {
    const str = generateString(200);
    expect(str).toHaveLength(200);
  });

  it('should contain only lowercase letters', () => {
    const str = generateString(500);
    expect(/^[a-z]+$/.test(str)).toBe(true);
  });
});

describe('generateMatrix', () => {
  it('should generate a matrix with correct dimensions', () => {
    const mat = generateMatrix(5, 3);
    expect(mat).toHaveLength(5);
    mat.forEach((row) => expect(row).toHaveLength(3));
  });
});

// ============================================================
// Benchmark Wrapper Generation
// ============================================================

describe('generateJSBenchmarkWrapper', () => {
  it('should include benchmark timing and result marker', () => {
    const code = `function foo(arr) { return arr.length; }`;
    const wrapper = generateJSBenchmarkWrapper(code, 'foo', [10, 100, 1000]);
    expect(wrapper).toContain('__BENCHMARK_RESULT__');
    expect(wrapper).toContain('foo');
    expect(wrapper).toContain('hrtime');
  });

  it('should embed the user code', () => {
    const code = `function mySpecialFunc(arr) { return arr.reduce((a,b) => a+b, 0); }`;
    const wrapper = generateJSBenchmarkWrapper(code, 'mySpecialFunc', [10]);
    expect(wrapper).toContain('mySpecialFunc');
    expect(wrapper).toContain('reduce');
  });
});

describe('generatePythonBenchmarkWrapper', () => {
  it('should include benchmark timing with perf_counter_ns', () => {
    const code = `def foo(arr): return len(arr)`;
    const wrapper = generatePythonBenchmarkWrapper(code, 'foo', [10, 100]);
    expect(wrapper).toContain('__BENCHMARK_RESULT__');
    expect(wrapper).toContain('foo');
    expect(wrapper).toContain('perf_counter_ns');
  });
});

describe('generateJavaBenchmarkWrapper', () => {
  it('should include System.nanoTime instrumentation', () => {
    const code = `public static int foo(int[] arr) { return arr.length; }`;
    const wrapper = generateJavaBenchmarkWrapper(code, 'foo', [10, 100]);
    expect(wrapper).toContain('__BENCHMARK_RESULT__');
    expect(wrapper).toContain('foo');
    expect(wrapper).toContain('nanoTime');
  });
});

describe('generateCppBenchmarkWrapper', () => {
  it('should include chrono timing', () => {
    const code = `int foo(vector<int>& v) { return v.size(); }`;
    const wrapper = generateCppBenchmarkWrapper(code, 'foo', [10, 100]);
    expect(wrapper).toContain('__BENCHMARK_RESULT__');
    expect(wrapper).toContain('foo');
    expect(wrapper).toContain('chrono');
  });
});

// ============================================================
// Wrapper Generator Router
// ============================================================

describe('getWrapperGenerator', () => {
  it('should return the JS generator for "javascript"', () => {
    const gen = getWrapperGenerator('javascript');
    expect(gen).toBe(generateJSBenchmarkWrapper);
  });

  it('should return the JS generator for "node"', () => {
    const gen = getWrapperGenerator('node');
    expect(gen).toBe(generateJSBenchmarkWrapper);
  });

  it('should return the Python generator for "python"', () => {
    const gen = getWrapperGenerator('python');
    expect(gen).toBe(generatePythonBenchmarkWrapper);
  });

  it('should return the Java generator for "java"', () => {
    const gen = getWrapperGenerator('java');
    expect(gen).toBe(generateJavaBenchmarkWrapper);
  });

  it('should return the C++ generator for "cpp"', () => {
    const gen = getWrapperGenerator('cpp');
    expect(gen).toBe(generateCppBenchmarkWrapper);
  });

  it('should fall back to JS generator for unknown language', () => {
    const gen = getWrapperGenerator('rust');
    expect(gen).toBe(generateJSBenchmarkWrapper);
  });
});
