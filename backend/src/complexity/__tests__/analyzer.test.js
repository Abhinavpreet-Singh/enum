/**
 * @fileoverview Unit tests for static code analyzers.
 *
 * Tests cover JavaScript, Python, Java, and C++ analyzers to verify
 * correct detection of loop nesting, recursion, data structures,
 * and complexity heuristics.
 *
 * Analyzer return shape:
 *   { timeComplexity, spaceComplexity, confidence, loops, recursion,
 *     dataStructures, patterns, maxLoopDepth, hasLogarithmicLoop,
 *     hasSorting, mlFeatures, warnings }
 */

import { describe, it, expect } from '@jest/globals';
import { analyzeJavaScript } from '../analyzer/javascript.analyzer.js';
import { analyzePython } from '../analyzer/python.analyzer.js';
import { analyzeJava } from '../analyzer/java.analyzer.js';
import { analyzeCpp } from '../analyzer/cpp.analyzer.js';
import { runStaticAnalysis } from '../analyzer/index.js';

// ============================================================
// JavaScript Analyzer
// ============================================================

describe('JavaScript Analyzer', () => {
  it('should detect O(1) for simple arithmetic', () => {
    const code = `function add(a, b) { return a + b; }`;
    const result = analyzeJavaScript(code);
    expect(result.timeComplexity).toBe('O(1)');
    expect(result.spaceComplexity).toBe('O(1)');
    expect(result.maxLoopDepth).toBe(0);
  });

  it('should detect O(n) for a single loop', () => {
    const code = `
function sumArray(arr) {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
  }
  return sum;
}`;
    const result = analyzeJavaScript(code);
    expect(result.timeComplexity).toBe('O(n)');
    expect(result.maxLoopDepth).toBe(1);
  });

  it('should detect O(n^2) for nested loops', () => {
    const code = `
function bubbleSort(arr) {
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length - i; j++) {
      if (arr[j] > arr[j+1]) {
        [arr[j], arr[j+1]] = [arr[j+1], arr[j]];
      }
    }
  }
  return arr;
}`;
    const result = analyzeJavaScript(code);
    expect(result.timeComplexity).toBe('O(n^2)');
    expect(result.maxLoopDepth).toBe(2);
  });

  it('should detect O(n^3) for triple-nested loops', () => {
    const code = `
function matMul(a, b, n) {
  const c = [];
  for (let i = 0; i < n; i++) {
    c[i] = [];
    for (let j = 0; j < n; j++) {
      c[i][j] = 0;
      for (let k = 0; k < n; k++) {
        c[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return c;
}`;
    const result = analyzeJavaScript(code);
    expect(result.maxLoopDepth).toBe(3);
    expect(result.timeComplexity).toBe('O(n^3)');
  });

  it('should detect O(log n) for halving loops', () => {
    const code = `
function binarySearch(arr, target) {
  let lo = 0, hi = arr.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}`;
    const result = analyzeJavaScript(code);
    expect(result.timeComplexity).toBe('O(log n)');
    expect(result.hasLogarithmicLoop).toBe(true);
  });

  it('should detect recursion', () => {
    const code = `
function fib(n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}`;
    const result = analyzeJavaScript(code);
    expect(result.recursion.length).toBeGreaterThan(0);
    expect(result.recursion[0].isDirect).toBe(true);
    expect(result.timeComplexity).toBe('O(2^n)');
  });

  it('should detect memoization and reduce complexity', () => {
    const code = `
const memo = new Map();
function fib(n) {
  if (memo.has(n)) return memo.get(n);
  if (n <= 1) return n;
  const val = fib(n - 1) + fib(n - 2);
  memo.set(n, val);
  return val;
}`;
    const result = analyzeJavaScript(code);
    expect(result.recursion[0].hasMemoization).toBe(true);
    // Memoized recursion should be better than O(2^n)
    expect(['O(n)', 'O(n log n)']).toContain(result.timeComplexity);
  });

  it('should detect O(n) space for Map/Set/Array allocation', () => {
    const code = `
function createMap(arr) {
  const m = new Map();
  for (let i = 0; i < arr.length; i++) m.set(i, arr[i]);
  return m;
}`;
    const result = analyzeJavaScript(code);
    expect(result.spaceComplexity).toBe('O(n)');
  });

  it('should detect sorting calls and flag O(n log n)', () => {
    const code = `
function sortedUnique(arr) {
  arr.sort((a, b) => a - b);
  return [...new Set(arr)];
}`;
    const result = analyzeJavaScript(code);
    expect(result.hasSorting).toBe(true);
    expect(result.timeComplexity).toBe('O(n log n)');
  });

  it('should build ML features object', () => {
    const code = `function foo(x) { return x * 2; }`;
    const result = analyzeJavaScript(code);
    expect(result.mlFeatures).toBeDefined();
    expect(typeof result.mlFeatures).toBe('object');
    expect(typeof result.mlFeatures.maxLoopDepth).toBe('number');
  });
});

// ============================================================
// Python Analyzer
// ============================================================

describe('Python Analyzer', () => {
  it('should detect O(1) for constant-time code', () => {
    const code = `
def add(a, b):
    return a + b
`;
    const result = analyzePython(code);
    expect(result.timeComplexity).toBe('O(1)');
  });

  it('should detect O(n) for a single for loop', () => {
    const code = `
def sum_list(nums):
    total = 0
    for num in nums:
        total += num
    return total
`;
    const result = analyzePython(code);
    expect(result.timeComplexity).toBe('O(n)');
    expect(result.maxLoopDepth).toBe(1);
  });

  it('should detect O(n^2) for nested loops', () => {
    const code = `
def pairs(arr):
    result = []
    for i in range(len(arr)):
        for j in range(i + 1, len(arr)):
            result.append((arr[i], arr[j]))
    return result
`;
    const result = analyzePython(code);
    expect(result.timeComplexity).toBe('O(n^2)');
    expect(result.maxLoopDepth).toBe(2);
  });

  it('should detect recursion', () => {
    const code = `
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)
`;
    const result = analyzePython(code);
    expect(result.recursion.length).toBeGreaterThan(0);
  });
});

// ============================================================
// Java Analyzer
// ============================================================

describe('Java Analyzer', () => {
  it('should detect O(n) for a single loop', () => {
    const code = `
public int sum(int[] arr) {
    int total = 0;
    for (int i = 0; i < arr.length; i++) {
        total += arr[i];
    }
    return total;
}`;
    const result = analyzeJava(code);
    expect(result.timeComplexity).toBe('O(n)');
    expect(result.maxLoopDepth).toBe(1);
  });

  it('should detect O(n^2) for nested loops', () => {
    const code = `
public void printPairs(int[] arr) {
    for (int i = 0; i < arr.length; i++) {
        for (int j = i + 1; j < arr.length; j++) {
            System.out.println(arr[i] + " " + arr[j]);
        }
    }
}`;
    const result = analyzeJava(code);
    expect(result.timeComplexity).toBe('O(n^2)');
    expect(result.maxLoopDepth).toBe(2);
  });

  it('should detect sorting usage', () => {
    const code = `
public int[] sortArray(int[] arr) {
    Arrays.sort(arr);
    return arr;
}`;
    const result = analyzeJava(code);
    expect(result.hasSorting).toBe(true);
    expect(result.timeComplexity).toBe('O(n log n)');
  });

  it('should detect HashMap in dataStructures', () => {
    const code = `
public int[] twoSum(int[] nums, int target) {
    HashMap<Integer, Integer> map = new HashMap<>();
    for (int i = 0; i < nums.length; i++) {
        int comp = target - nums[i];
        if (map.containsKey(comp)) return new int[]{map.get(comp), i};
        map.put(nums[i], i);
    }
    return null;
}`;
    const result = analyzeJava(code);
    expect(result.spaceComplexity).toBe('O(n)');
    expect(result.dataStructures.some((ds) => ds.type === 'HashMap')).toBe(true);
  });

  it('should detect recursion', () => {
    const code = `
public int fib(int n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
}`;
    const result = analyzeJava(code);
    expect(result.recursion.length).toBeGreaterThan(0);
  });
});

// ============================================================
// C++ Analyzer
// ============================================================

describe('C++ Analyzer', () => {
  it('should detect O(n) for a single loop', () => {
    const code = `
int sumArray(vector<int>& arr) {
    int total = 0;
    for (int i = 0; i < arr.size(); i++) {
        total += arr[i];
    }
    return total;
}`;
    const result = analyzeCpp(code);
    expect(result.timeComplexity).toBe('O(n)');
    expect(result.maxLoopDepth).toBe(1);
  });

  it('should detect O(n^2) for nested loops', () => {
    const code = `
void printPairs(vector<int>& v) {
    for (int i = 0; i < v.size(); i++) {
        for (int j = i + 1; j < v.size(); j++) {
            cout << v[i] << " " << v[j] << endl;
        }
    }
}`;
    const result = analyzeCpp(code);
    expect(result.timeComplexity).toBe('O(n^2)');
    expect(result.maxLoopDepth).toBe(2);
  });

  it('should detect STL containers', () => {
    const code = `
void solve(vector<int>& nums) {
    unordered_map<int, int> freq;
    for (auto& n : nums) freq[n]++;
}`;
    const result = analyzeCpp(code);
    expect(result.dataStructures.some((ds) => ds.type === 'unordered_map')).toBe(true);
    expect(result.spaceComplexity).toBe('O(n)');
  });

  it('should detect std::sort', () => {
    const code = `
void sortVec(vector<int>& v) {
    sort(v.begin(), v.end());
}`;
    const result = analyzeCpp(code);
    expect(result.hasSorting).toBe(true);
    expect(result.timeComplexity).toBe('O(n log n)');
  });

  it('should detect recursion', () => {
    const code = `
int fib(int n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
}`;
    const result = analyzeCpp(code);
    expect(result.recursion.length).toBeGreaterThan(0);
  });
});

// ============================================================
// Analyzer Index (router)
// ============================================================

describe('Static Analyzer Router', () => {
  it('should route JavaScript analysis', async () => {
    const result = await runStaticAnalysis(
      'function foo(arr) { for (let x of arr) console.log(x); }',
      'javascript'
    );
    expect(result).toBeDefined();
    expect(result.timeComplexity).toBe('O(n)');
  });

  it('should route Python analysis', async () => {
    const result = await runStaticAnalysis(
      'def foo(arr):\n    for x in arr:\n        print(x)\n',
      'python'
    );
    expect(result).toBeDefined();
    expect(result.timeComplexity).toBe('O(n)');
  });

  it('should route Java analysis', async () => {
    const result = await runStaticAnalysis(
      'public void foo(int[] arr) { for (int i = 0; i < arr.length; i++) {} }',
      'java'
    );
    expect(result).toBeDefined();
    expect(result.timeComplexity).toBe('O(n)');
  });

  it('should route C++ analysis', async () => {
    const result = await runStaticAnalysis(
      'void foo(vector<int>& v) { for (int i = 0; i < v.size(); i++) {} }',
      'cpp'
    );
    expect(result).toBeDefined();
    expect(result.timeComplexity).toBe('O(n)');
  });

  it('should throw for unsupported language', async () => {
    await expect(runStaticAnalysis('print("hello")', 'rust')).rejects.toThrow();
  });
});
