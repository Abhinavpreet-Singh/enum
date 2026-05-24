/**
 * @fileoverview Algorithmic pattern detection across all languages.
 *
 * DESIGN DECISION: Language-agnostic pattern detection using keyword/structural
 * heuristics. More specific AST-based detection is done per-language; this module
 * provides the shared logic and pattern catalog.
 *
 * Each pattern has:
 * - keywords: tokens that suggest the pattern
 * - structuralHints: code structure indicators
 * - expectedComplexity: typical time/space complexity when this pattern is used
 */

import { AlgoPattern, ComplexityClass } from '../types.js';

// ============================================================
// Pattern Definitions
// ============================================================

/** @type {Object.<string, {keywords: RegExp[], structural: RegExp[], timeComplexity: string, spaceComplexity: string, description: string}>} */
export const PATTERN_CATALOG = {
  [AlgoPattern.TWO_POINTERS]: {
    keywords: [
      /\bleft\b.*\bright\b/i,
      /\bstart\b.*\bend\b/i,
      /\blow\b.*\bhigh\b/i,
      /\bi\b.*\bj\b.*while/i,
    ],
    structural: [
      // Two variables moving toward each other
      /while\s*\(.*<.*\)/,
      /\w+\s*\+\+.*\w+\s*--/,
      /\w+\s*--.*\w+\s*\+\+/,
    ],
    timeComplexity: ComplexityClass.O_N,
    spaceComplexity: ComplexityClass.O_1,
    description: 'Two pointers technique — traverses array from both ends',
  },

  [AlgoPattern.SLIDING_WINDOW]: {
    keywords: [
      /\bwindow\b/i,
      /\bsliding\b/i,
      /\bsubstring\b/i,
      /\bsubarray\b/i,
      /\bmax_?len\b/i,
      /\bmin_?len\b/i,
    ],
    structural: [
      // Right pointer moves, left adjusts
      /for\s*\(.*\)[\s\S]*?while\s*\(/,
      /\bright\b.*\+\+[\s\S]*?\bleft\b.*\+\+/,
    ],
    timeComplexity: ComplexityClass.O_N,
    spaceComplexity: ComplexityClass.O_N,
    description: 'Sliding window — maintains a dynamic window over a sequence',
  },

  [AlgoPattern.BINARY_SEARCH]: {
    keywords: [
      /\bbinary.?search\b/i,
      /\bmid\b/i,
      /\blow\b.*\bhigh\b/i,
      /\bleft\b.*\bright\b.*\bmid\b/i,
    ],
    structural: [
      // Classic binary search structure: mid = (lo + hi) / 2
      /mid\s*=\s*[\w\s+()]*\/\s*2/,
      /mid\s*=\s*[\w\s+()]*>>\s*1/,
      /Math\.floor\s*\(\s*\(.*\+.*\)\s*\/\s*2\s*\)/,
      /\/\/\s*2/,
    ],
    timeComplexity: ComplexityClass.O_LOG_N,
    spaceComplexity: ComplexityClass.O_1,
    description: 'Binary search — halves search space each iteration',
  },

  [AlgoPattern.HASHMAP_LOOKUP]: {
    keywords: [
      /\bMap\b/,
      /\bHashMap\b/,
      /\bdict\b/,
      /\bunordered_map\b/,
      /\bSet\b/,
      /\bHashSet\b/,
      /\bset\b/,
      /\bunordered_set\b/,
    ],
    structural: [
      /new\s+Map\s*\(/,
      /new\s+Set\s*\(/,
      /new\s+HashMap\b/,
      /new\s+HashSet\b/,
      /\{\s*\}/, // Object literal as map
    ],
    timeComplexity: ComplexityClass.O_N,
    spaceComplexity: ComplexityClass.O_N,
    description: 'Hash-based lookup — trades space for O(1) access time',
  },

  [AlgoPattern.DIVIDE_AND_CONQUER]: {
    keywords: [
      /\bmerge\b/i,
      /\bpartition\b/i,
      /\bdivide\b/i,
      /\bconquer\b/i,
    ],
    structural: [
      // Recursive function that operates on half the input
      /\(.*mid.*\)[\s\S]*?\(.*mid.*\)/,
      /return\s+\w+\(.*\/\s*2.*\)/,
      /\w+\(\s*\w+\s*,\s*mid\s*\)[\s\S]*?\w+\(\s*mid\s*,/,
    ],
    timeComplexity: ComplexityClass.O_N_LOG_N,
    spaceComplexity: ComplexityClass.O_N,
    description: 'Divide and conquer — splits problem, solves recursively, merges results',
  },

  [AlgoPattern.DYNAMIC_PROGRAMMING]: {
    keywords: [
      /\bdp\b/i,
      /\bmemo\b/i,
      /\btabul/i,
      /\bcache\b/i,
      /\boptimal\b/i,
    ],
    structural: [
      // dp[i] = dp[i-1] + ...
      /dp\s*\[.*\]\s*=\s*.*dp\s*\[/,
      /memo\s*\[.*\]\s*=/,
      /\bcache\b.*\bget\b/,
      // 2D DP table
      /dp\s*\[.*\]\s*\[.*\]/,
    ],
    timeComplexity: ComplexityClass.O_N_SQUARED, // Common, but varies
    spaceComplexity: ComplexityClass.O_N,
    description: 'Dynamic programming — stores subproblem results to avoid recomputation',
  },

  [AlgoPattern.SORTING]: {
    keywords: [
      /\.sort\s*\(/,
      /\bsort\s*\(/,
      /\bsorted\b/,
      /Arrays\.sort\b/,
      /Collections\.sort\b/,
      /std::sort\b/,
    ],
    structural: [
      /\.sort\s*\(/,
      /sort\s*\(\s*\w+\s*,\s*\w+/,
    ],
    timeComplexity: ComplexityClass.O_N_LOG_N,
    spaceComplexity: ComplexityClass.O_N,
    description: 'Sorting-based approach — O(n log n) sort dominates complexity',
  },

  [AlgoPattern.BFS_DFS]: {
    keywords: [
      /\bbfs\b/i,
      /\bdfs\b/i,
      /\bbreadth.?first\b/i,
      /\bdepth.?first\b/i,
      /\bqueue\b/i,
      /\bstack\b/i,
      /\bvisited\b/i,
    ],
    structural: [
      /\bqueue\b.*\bpush\b.*while.*\blength\b/i,
      /\bstack\b.*\bpush\b.*while.*\blength\b/i,
      /visited\s*\[/,
      /visited\.add\s*\(/,
    ],
    timeComplexity: ComplexityClass.O_N,
    spaceComplexity: ComplexityClass.O_N,
    description: 'Graph traversal — visits each node once, O(V + E)',
  },

  [AlgoPattern.GREEDY]: {
    keywords: [
      /\bgreedy\b/i,
      /\bmax\b.*\bprofit\b/i,
      /\bmin\b.*\bcost\b/i,
      /\binterval\b/i,
    ],
    structural: [
      /\.sort\s*\(.*\)[\s\S]*?for\s*\(/,
    ],
    timeComplexity: ComplexityClass.O_N_LOG_N,
    spaceComplexity: ComplexityClass.O_1,
    description: 'Greedy algorithm — makes locally optimal choices',
  },

  [AlgoPattern.BACKTRACKING]: {
    keywords: [
      /\bbacktrack\b/i,
      /\bpermut/i,
      /\bcombination/i,
      /\bsubset/i,
    ],
    structural: [
      // Recursive function with push/pop or add/remove pattern
      /push\s*\(.*\)[\s\S]*?pop\s*\(/,
      /add\s*\(.*\)[\s\S]*?remove\s*\(/,
    ],
    timeComplexity: ComplexityClass.O_TWO_N,
    spaceComplexity: ComplexityClass.O_N,
    description: 'Backtracking — explores all possible paths with pruning',
  },

  [AlgoPattern.PREFIX_SUM]: {
    keywords: [
      /\bprefix\b/i,
      /\bcumulative\b/i,
      /\bpresum\b/i,
    ],
    structural: [
      /prefix\s*\[.*\]\s*=\s*prefix\s*\[.*-\s*1\s*\]\s*\+/,
      /\bsum\b.*=.*\bsum\b.*\+/,
    ],
    timeComplexity: ComplexityClass.O_N,
    spaceComplexity: ComplexityClass.O_N,
    description: 'Prefix sum — precomputes cumulative sums for O(1) range queries',
  },

  [AlgoPattern.MONOTONIC_STACK]: {
    keywords: [
      /\bmonotonic\b/i,
      /\bnext.*greater\b/i,
      /\bnext.*smaller\b/i,
      /\bprevious.*greater\b/i,
    ],
    structural: [
      /stack.*while.*stack.*peek\b/,
      /stack.*while.*stack\[.*\]/,
    ],
    timeComplexity: ComplexityClass.O_N,
    spaceComplexity: ComplexityClass.O_N,
    description: 'Monotonic stack — maintains sorted order for efficient comparisons',
  },
};

// ============================================================
// Pattern Detection
// ============================================================

/**
 * Detect algorithmic patterns in source code.
 *
 * Returns an array of detected patterns with confidence scores.
 * Uses a scoring system: keyword matches add 1 point, structural matches add 2 points.
 * A pattern is "detected" if its score exceeds the threshold.
 *
 * @param {string} code - Source code string
 * @returns {{pattern: string, confidence: number, description: string, timeComplexity: string, spaceComplexity: string}[]}
 */
export function detectPatterns(code) {
  const detectedPatterns = [];

  for (const [patternName, patternDef] of Object.entries(PATTERN_CATALOG)) {
    let score = 0;
    const maxScore = patternDef.keywords.length + patternDef.structural.length * 2;

    // Keyword matches (lower confidence)
    for (const regex of patternDef.keywords) {
      if (regex.test(code)) {
        score += 1;
      }
    }

    // Structural matches (higher confidence)
    for (const regex of patternDef.structural) {
      if (regex.test(code)) {
        score += 2;
      }
    }

    // Require at least one structural match OR multiple keyword matches
    const hasStructuralMatch = patternDef.structural.some((r) => r.test(code));
    const keywordMatchCount = patternDef.keywords.filter((r) => r.test(code)).length;

    if (hasStructuralMatch || keywordMatchCount >= 2) {
      const confidence = Math.min(1, score / Math.max(maxScore * 0.5, 1));

      detectedPatterns.push({
        pattern: patternName,
        confidence: Math.round(confidence * 100) / 100,
        description: patternDef.description,
        timeComplexity: patternDef.timeComplexity,
        spaceComplexity: patternDef.spaceComplexity,
      });
    }
  }

  // Sort by confidence descending
  detectedPatterns.sort((a, b) => b.confidence - a.confidence);

  return detectedPatterns;
}

/**
 * Get the dominant pattern from detected patterns.
 * The dominant pattern is the one with highest confidence.
 *
 * @param {{pattern: string, confidence: number, timeComplexity: string, spaceComplexity: string}[]} patterns
 * @returns {{pattern: string, timeComplexity: string, spaceComplexity: string} | null}
 */
export function getDominantPattern(patterns) {
  if (patterns.length === 0) return null;
  return patterns[0];
}
