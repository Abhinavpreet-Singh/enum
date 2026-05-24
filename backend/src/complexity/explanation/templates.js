/**
 * @fileoverview Explanation templates for complexity analysis results.
 *
 * Each complexity class has:
 * - A beginner-friendly explanation
 * - A technical/interview-style explanation
 * - Real-world analogies
 * - Common optimization paths
 * - Max feasible N for competitive programming (assuming ~10^8 ops/sec)
 */

import { ComplexityClass } from '../types.js';

/**
 * @typedef {Object} ComplexityTemplate
 * @property {string} simple - Beginner-friendly explanation
 * @property {string} technical - Technical/interview explanation
 * @property {string} analogy - Real-world analogy
 * @property {string[]} optimizations - How to optimize to a better complexity
 * @property {number} maxFeasibleN - Max N for 1-second time limit
 * @property {string} growthDescription - How performance degrades with input size
 */

/** @type {Object.<string, ComplexityTemplate>} */
export const COMPLEXITY_TEMPLATES = {
  [ComplexityClass.O_1]: {
    simple: 'Your code runs in constant time — it takes the same amount of time regardless of input size. This is the best possible performance.',
    technical: 'O(1) constant time complexity. The algorithm performs a fixed number of operations independent of input size n. This is optimal and cannot be improved.',
    analogy: 'Like looking up a word in a dictionary by page number — instant, no matter how big the dictionary.',
    optimizations: [],
    maxFeasibleN: Infinity,
    growthDescription: 'Performance stays flat — doubling input has no effect on runtime.',
  },

  [ComplexityClass.O_LOG_N]: {
    simple: 'Your code runs in logarithmic time — it gets slightly slower as input grows, but very slowly. Even for huge inputs, it stays fast.',
    technical: 'O(log n) logarithmic complexity. The algorithm halves the problem space each iteration (binary search pattern). For n=1,000,000, only ~20 iterations are needed.',
    analogy: 'Like finding a name in a phone book by opening to the middle and eliminating half each time.',
    optimizations: ['Already near-optimal. Only O(1) is faster, but that usually requires direct access/hashing.'],
    maxFeasibleN: 1e18,
    growthDescription: 'Extremely scalable — doubling input adds only one extra operation.',
  },

  [ComplexityClass.O_N]: {
    simple: 'Your code runs in linear time — if the input doubles, the time doubles. This is efficient for most problems.',
    technical: 'O(n) linear complexity. The algorithm iterates through the input once (or a constant number of times). This is optimal when every element must be examined.',
    analogy: 'Like reading every page of a book — you must look at each page, but only once.',
    optimizations: [
      'Consider if you can skip elements using binary search (O(log n))',
      'Use hash-based lookups to avoid repeated scans',
      'Check if mathematical formulas can replace iteration (O(1))',
    ],
    maxFeasibleN: 1e8,
    growthDescription: 'Scales linearly — 10x more input = 10x more time.',
  },

  [ComplexityClass.O_N_LOG_N]: {
    simple: 'Your code runs in "n log n" time — slightly worse than linear. This is typically the best you can do when sorting is required.',
    technical: 'O(n log n) linearithmic complexity. Common in comparison-based sorting algorithms (merge sort, quicksort) and divide-and-conquer approaches. This is the theoretical lower bound for comparison-based sorting.',
    analogy: 'Like organizing a shuffled deck by repeatedly splitting it in half, sorting each half, and merging back.',
    optimizations: [
      'If data has special properties (bounded range), use counting/radix sort for O(n)',
      'If you don\'t need full sorting, consider partial sort or nth_element',
      'Check if the problem can be solved without sorting using hash maps',
    ],
    maxFeasibleN: 1e7,
    growthDescription: 'Efficient at scale — 10x input ≈ 13x time. Handles millions of elements.',
  },

  [ComplexityClass.O_N_SQUARED]: {
    simple: 'Your code runs in quadratic time — if input doubles, time quadruples. This is slow for large inputs and likely needs optimization.',
    technical: 'O(n²) quadratic complexity. Usually caused by nested loops iterating over the input. Acceptable for n ≤ 10,000 but will TLE for larger inputs in competitive programming.',
    analogy: 'Like comparing every student in a class with every other student — the work grows explosively with class size.',
    optimizations: [
      'Use sorting + two pointers to reduce to O(n log n)',
      'Use hash maps to eliminate the inner loop → O(n)',
      'Consider sliding window technique for contiguous subarray problems',
      'Use divide-and-conquer to split the work',
    ],
    maxFeasibleN: 1e4,
    growthDescription: 'Grows quadratically — 10x input = 100x time. Will be slow for n > 10,000.',
  },

  [ComplexityClass.O_N_CUBED]: {
    simple: 'Your code runs in cubic time — very slow for anything beyond small inputs. This usually means there are three nested loops that should be optimized.',
    technical: 'O(n³) cubic complexity. Often found in naive matrix multiplication, Floyd-Warshall shortest path, or three-nested-loop brute force. Feasible only for n ≤ 500.',
    analogy: 'Like checking every possible combination of three items from a list — grows extremely fast.',
    optimizations: [
      'Use matrix exponentiation to reduce to O(n² log n)',
      'Apply dynamic programming to eliminate one loop dimension',
      'Consider Strassen\'s algorithm for matrix multiplication → O(n^2.807)',
      'Check if the innermost loop can be replaced with binary search or hash lookup',
    ],
    maxFeasibleN: 500,
    growthDescription: 'Grows cubically — 10x input = 1000x time. Only feasible for small inputs.',
  },

  [ComplexityClass.O_TWO_N]: {
    simple: 'Your code runs in exponential time — it doubles in time for each additional input element. This will be extremely slow for even moderate inputs (n > 20).',
    technical: 'O(2^n) exponential complexity. Common in brute-force recursive solutions exploring all subsets (power set). Must be optimized using memoization/DP or pruning for practical use.',
    analogy: 'Like trying every possible combination of on/off switches — adding one more switch doubles the work.',
    optimizations: [
      'Add memoization/caching to reduce to polynomial time (DP)',
      'Use branch-and-bound with pruning to eliminate dead ends',
      'Check if the problem has optimal substructure for dynamic programming',
      'Consider greedy approach if locally optimal choices lead to global optimum',
      'Use bit manipulation for subset enumeration with early termination',
    ],
    maxFeasibleN: 25,
    growthDescription: 'Grows exponentially — each +1 to input doubles the time. Infeasible for n > 25.',
  },

  [ComplexityClass.O_N_FACTORIAL]: {
    simple: 'Your code runs in factorial time — the slowest common complexity. Only usable for very small inputs (n ≤ 10).',
    technical: 'O(n!) factorial complexity. Typically found in brute-force permutation generation. Must be heavily optimized or replaced with an entirely different approach.',
    analogy: 'Like trying every possible order to visit cities — the number of routes explodes impossibly fast.',
    optimizations: [
      'Use DP with bitmask to reduce to O(2^n * n)',
      'Apply constraint propagation and backtracking with pruning',
      'Consider approximation algorithms for NP-hard problems',
    ],
    maxFeasibleN: 12,
    growthDescription: 'Grows faster than exponential — completely infeasible for n > 12.',
  },

  [ComplexityClass.UNKNOWN]: {
    simple: 'The complexity of your code could not be determined with confidence. This may be due to complex control flow, unusual patterns, or analysis limitations.',
    technical: 'Complexity undetermined. The analyzer could not classify the algorithm into a known complexity class. Manual analysis recommended.',
    analogy: '',
    optimizations: ['Try simplifying the algorithm structure for clearer analysis'],
    maxFeasibleN: -1,
    growthDescription: 'Unknown growth pattern.',
  },
};

/**
 * Get the template for a given complexity class.
 *
 * @param {string} complexityClass
 * @returns {ComplexityTemplate}
 */
export function getTemplate(complexityClass) {
  return COMPLEXITY_TEMPLATES[complexityClass] || COMPLEXITY_TEMPLATES[ComplexityClass.UNKNOWN];
}

/**
 * Estimate maximum feasible N for a given time limit (seconds).
 *
 * @param {string} complexityClass
 * @param {number} [timeLimitSec=1] - Time limit in seconds
 * @param {number} [opsPerSec=1e8] - Assumed operations per second
 * @returns {string} Human-readable max N
 */
export function estimateMaxN(complexityClass, timeLimitSec = 1, opsPerSec = 1e8) {
  const maxOps = timeLimitSec * opsPerSec;

  const maxN = {
    [ComplexityClass.O_1]: Infinity,
    [ComplexityClass.O_LOG_N]: Infinity,
    [ComplexityClass.O_N]: maxOps,
    [ComplexityClass.O_N_LOG_N]: Math.floor(maxOps / Math.log2(maxOps)),
    [ComplexityClass.O_N_SQUARED]: Math.floor(Math.sqrt(maxOps)),
    [ComplexityClass.O_N_CUBED]: Math.floor(Math.cbrt(maxOps)),
    [ComplexityClass.O_TWO_N]: Math.floor(Math.log2(maxOps)),
    [ComplexityClass.O_N_FACTORIAL]: 12,
  }[complexityClass];

  if (maxN === undefined || maxN === Infinity) return 'No practical limit';
  if (maxN >= 1e9) return `~${(maxN / 1e9).toFixed(0)} × 10⁹`;
  if (maxN >= 1e6) return `~${(maxN / 1e6).toFixed(0)} × 10⁶`;
  if (maxN >= 1e3) return `~${(maxN / 1e3).toFixed(0)} × 10³`;
  return `~${maxN}`;
}
