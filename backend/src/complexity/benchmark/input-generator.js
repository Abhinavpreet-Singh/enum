/**
 * @fileoverview Auto-generates test inputs of increasing sizes for benchmarking.
 *
 * DESIGN DECISIONS:
 * - Exponential scaling: [10, 50, 100, 500, 1000, 5000, 10000] to cover
 *   a wide range while keeping total runtime manageable.
 * - Deterministic inputs (seeded random) for reproducibility.
 * - Generates inputs appropriate to common data structure types:
 *   arrays, strings, matrices, linked lists, trees, graphs.
 * - Each language gets a wrapper that initializes the input and calls the
 *   user's function with timing instrumentation.
 */

// ============================================================
// Input Size Configurations
// ============================================================

/**
 * Default input sizes for benchmarking.
 * Exponential scaling captures both small and large behavior.
 * Large sizes are critical for distinguishing O(n) from O(n log n).
 */
export const DEFAULT_INPUT_SIZES = [10, 50, 100, 500, 1000, 5000, 10000];

/**
 * Reduced input sizes for potentially exponential algorithms.
 * Prevents infinite execution while still detecting exponential growth.
 */
export const EXPONENTIAL_SAFE_SIZES = [5, 8, 10, 12, 15, 18, 20];

/**
 * Large input sizes for algorithms suspected to be O(1) or O(log n).
 */
export const FAST_ALGO_SIZES = [100, 1000, 10000, 100000, 500000, 1000000];

// ============================================================
// Seeded Random Number Generator
// ============================================================

/**
 * Simple seeded PRNG (Mulberry32) for reproducible benchmark inputs.
 * Ensures the same code always gets the same test inputs.
 *
 * @param {number} seed
 * @returns {() => number} Returns values in [0, 1)
 */
function seededRandom(seed) {
  let state = seed | 0;
  return function () {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================================
// Input Generation Functions
// ============================================================

/**
 * Generate an array of random integers.
 *
 * @param {number} size - Array length
 * @param {number} [minVal=-10000] - Minimum value
 * @param {number} [maxVal=10000] - Maximum value
 * @param {number} [seed=42] - Random seed
 * @returns {number[]}
 */
export function generateIntArray(size, minVal = -10000, maxVal = 10000, seed = 42) {
  const rng = seededRandom(seed);
  const arr = new Array(size);
  const range = maxVal - minVal;
  for (let i = 0; i < size; i++) {
    arr[i] = Math.floor(rng() * range) + minVal;
  }
  return arr;
}

/**
 * Generate a sorted array of random integers (for binary search benchmarks).
 *
 * @param {number} size
 * @param {number} [seed=42]
 * @returns {number[]}
 */
export function generateSortedArray(size, seed = 42) {
  return generateIntArray(size, 0, size * 10, seed).sort((a, b) => a - b);
}

/**
 * Generate a random string of lowercase letters.
 *
 * @param {number} length
 * @param {number} [seed=42]
 * @returns {string}
 */
export function generateString(length, seed = 42) {
  const rng = seededRandom(seed);
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let str = '';
  for (let i = 0; i < length; i++) {
    str += chars[Math.floor(rng() * 26)];
  }
  return str;
}

/**
 * Generate a 2D matrix (for DP / graph problems).
 *
 * @param {number} rows
 * @param {number} cols
 * @param {number} [seed=42]
 * @returns {number[][]}
 */
export function generateMatrix(rows, cols, seed = 42) {
  const rng = seededRandom(seed);
  const matrix = [];
  for (let i = 0; i < rows; i++) {
    const row = [];
    for (let j = 0; j < cols; j++) {
      row.push(Math.floor(rng() * 100));
    }
    matrix.push(row);
  }
  return matrix;
}

// ============================================================
// Language-Specific Benchmark Wrappers
// ============================================================

/**
 * Generate JavaScript benchmark wrapper code.
 * Wraps user code with high-resolution timing and runs for multiple input sizes.
 *
 * @param {string} userCode - User's function code
 * @param {string} functionName - Name of the function to benchmark
 * @param {number[]} inputSizes - Array of input sizes to test
 * @returns {string} Complete executable JS code with benchmark harness
 */
export function generateJSBenchmarkWrapper(userCode, functionName, inputSizes) {
  const inputSizesJSON = JSON.stringify(inputSizes);

  return `
// ====== BENCHMARK HARNESS (auto-generated) ======
// Measures execution time and memory for complexity analysis.
// DO NOT MODIFY — this is injected by the analysis engine.

${userCode}

function __generateArray(size) {
  let seed = 42;
  const arr = [];
  for (let i = 0; i < size; i++) {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    arr.push(((t ^ (t >>> 14)) >>> 0) % 20001 - 10000);
  }
  return arr;
}

const __sizes = ${inputSizesJSON};
const __results = [];

for (const size of __sizes) {
  const input = __generateArray(size);

  // Force GC if available (V8 --expose-gc flag)
  if (typeof global !== 'undefined' && global.gc) global.gc();

  const memBefore = process.memoryUsage().heapUsed;
  const start = process.hrtime.bigint();

  try {
    ${functionName}(input);
  } catch (e) {
    __results.push({ inputSize: size, executionTimeMs: -1, memoryUsageBytes: 0, error: e.message });
    continue;
  }

  const end = process.hrtime.bigint();
  const memAfter = process.memoryUsage().heapUsed;

  __results.push({
    inputSize: size,
    executionTimeMs: Number(end - start) / 1e6,
    memoryUsageBytes: Math.max(0, memAfter - memBefore),
  });
}

// Output as JSON for parsing
console.log('__BENCHMARK_RESULT__' + JSON.stringify(__results));
`;
}

/**
 * Generate Python benchmark wrapper code.
 *
 * @param {string} userCode
 * @param {string} functionName
 * @param {number[]} inputSizes
 * @returns {string}
 */
export function generatePythonBenchmarkWrapper(userCode, functionName, inputSizes) {
  const sizesStr = inputSizes.join(', ');

  return `
# ====== BENCHMARK HARNESS (auto-generated) ======
import time
import json
import tracemalloc
import sys

${userCode}

def __generate_array(size):
    seed = 42
    arr = []
    for i in range(size):
        seed = (seed + 0x6d2b79f5) & 0xFFFFFFFF
        t = ((seed ^ (seed >> 15)) * (1 | seed)) & 0xFFFFFFFF
        t = ((t + ((t ^ (t >> 7)) * (61 | t)) & 0xFFFFFFFF) ^ t) & 0xFFFFFFFF
        arr.append(((t ^ (t >> 14)) & 0xFFFFFFFF) % 20001 - 10000)
    return arr

sizes = [${sizesStr}]
results = []

for size in sizes:
    input_data = __generate_array(size)

    tracemalloc.start()
    start = time.perf_counter_ns()

    try:
        ${functionName}(input_data)
    except Exception as e:
        results.append({"inputSize": size, "executionTimeMs": -1, "memoryUsageBytes": 0, "error": str(e)})
        tracemalloc.stop()
        continue

    end = time.perf_counter_ns()
    current, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    results.append({
        "inputSize": size,
        "executionTimeMs": (end - start) / 1e6,
        "memoryUsageBytes": peak,
    })

print("__BENCHMARK_RESULT__" + json.dumps(results))
`;
}

/**
 * Generate Java benchmark wrapper code.
 *
 * @param {string} userCode
 * @param {string} functionName
 * @param {number[]} inputSizes
 * @returns {string}
 */
export function generateJavaBenchmarkWrapper(userCode, functionName, inputSizes) {
  const sizesArray = inputSizes.map((s) => String(s)).join(', ');

  return `
// ====== BENCHMARK HARNESS (auto-generated) ======
import java.util.*;

public class Main {
    ${userCode}

    static int[] generateArray(int size) {
        int seed = 42;
        int[] arr = new int[size];
        for (int i = 0; i < size; i++) {
            seed = seed + 0x6d2b79f5;
            int t = (seed ^ (seed >>> 15)) * (1 | seed);
            t = (t + ((t ^ (t >>> 7)) * (61 | t))) ^ t;
            arr[i] = ((t ^ (t >>> 14)) >>> 0) % 20001 - 10000;
        }
        return arr;
    }

    public static void main(String[] args) {
        int[] sizes = {${sizesArray}};
        StringBuilder sb = new StringBuilder("[");

        for (int idx = 0; idx < sizes.length; idx++) {
            int size = sizes[idx];
            int[] input = generateArray(size);

            System.gc();
            Runtime rt = Runtime.getRuntime();
            long memBefore = rt.totalMemory() - rt.freeMemory();
            long start = System.nanoTime();

            try {
                ${functionName}(input);
            } catch (Exception e) {
                if (idx > 0) sb.append(",");
                sb.append(String.format("{\\"inputSize\\":%d,\\"executionTimeMs\\":-1,\\"memoryUsageBytes\\":0,\\"error\\":\\"%s\\"}", size, e.getMessage()));
                continue;
            }

            long end = System.nanoTime();
            long memAfter = rt.totalMemory() - rt.freeMemory();

            if (idx > 0) sb.append(",");
            sb.append(String.format("{\\"inputSize\\":%d,\\"executionTimeMs\\":%.4f,\\"memoryUsageBytes\\":%d}",
                size, (end - start) / 1e6, Math.max(0, memAfter - memBefore)));
        }

        sb.append("]");
        System.out.println("__BENCHMARK_RESULT__" + sb.toString());
    }
}
`;
}

/**
 * Generate C++ benchmark wrapper code.
 *
 * @param {string} userCode
 * @param {string} functionName
 * @param {number[]} inputSizes
 * @returns {string}
 */
export function generateCppBenchmarkWrapper(userCode, functionName, inputSizes) {
  const sizesInit = inputSizes.map((s) => String(s)).join(', ');

  return `
// ====== BENCHMARK HARNESS (auto-generated) ======
#include <iostream>
#include <vector>
#include <chrono>
#include <cstdio>
#include <fstream>
#include <string>
#include <algorithm>

using namespace std;

${userCode}

vector<int> generateArray(int size) {
    int seed = 42;
    vector<int> arr(size);
    for (int i = 0; i < size; i++) {
        seed = seed + 0x6d2b79f5;
        int t = (seed ^ (seed >> 15)) * (1 | seed);
        t = (t + ((t ^ (t >> 7)) * (61 | t))) ^ t;
        arr[i] = ((unsigned int)(t ^ (t >> 14))) % 20001 - 10000;
    }
    return arr;
}

long getMemoryUsage() {
    // Read VmRSS from /proc/self/status (Linux only)
    ifstream status("/proc/self/status");
    string line;
    while (getline(status, line)) {
        if (line.substr(0, 6) == "VmRSS:") {
            long kb = 0;
            sscanf(line.c_str(), "VmRSS: %ld kB", &kb);
            return kb * 1024;
        }
    }
    return 0;
}

int main() {
    vector<int> sizes = {${sizesInit}};
    cout << "__BENCHMARK_RESULT__[";

    for (int idx = 0; idx < (int)sizes.size(); idx++) {
        int size = sizes[idx];
        vector<int> input = generateArray(size);

        long memBefore = getMemoryUsage();
        auto start = chrono::high_resolution_clock::now();

        try {
            ${functionName}(input);
        } catch (exception& e) {
            if (idx > 0) cout << ",";
            printf("{\\"inputSize\\":%d,\\"executionTimeMs\\":-1,\\"memoryUsageBytes\\":0,\\"error\\":\\"%s\\"}", size, e.what());
            continue;
        }

        auto end = chrono::high_resolution_clock::now();
        long memAfter = getMemoryUsage();
        double ms = chrono::duration<double, milli>(end - start).count();

        if (idx > 0) cout << ",";
        printf("{\\"inputSize\\":%d,\\"executionTimeMs\\":%.4f,\\"memoryUsageBytes\\":%ld}", size, ms, max(0L, memAfter - memBefore));
    }

    cout << "]" << endl;
    return 0;
}
`;
}

// ============================================================
// Wrapper Selector
// ============================================================

/**
 * Select the appropriate benchmark wrapper generator for the given language.
 *
 * @param {string} language - Programming language
 * @returns {function(string, string, number[]): string} Wrapper generator function
 */
export function getWrapperGenerator(language) {
  const generators = {
    javascript: generateJSBenchmarkWrapper,
    node: generateJSBenchmarkWrapper,
    python: generatePythonBenchmarkWrapper,
    java: generateJavaBenchmarkWrapper,
    cpp: generateCppBenchmarkWrapper,
    c: generateCppBenchmarkWrapper, // C uses C++ wrapper (compatible)
  };

  return generators[language] || generators.javascript;
}
