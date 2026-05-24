/**
 * @fileoverview ML Feature Extractor — converts analysis results into
 * numerical feature vectors suitable for machine learning classification.
 *
 * DESIGN DECISIONS:
 * - Features are normalized to [0, 1] range for consistent scaling.
 * - Feature vector is fixed-length (20 dimensions) for model compatibility.
 * - Includes both structural features (from AST) and behavioral features
 *   (from patterns/data structures) for richer representation.
 * - Designed to support future training of:
 *   1. k-NN classifier (nearest-neighbor on historical submissions)
 *   2. Decision tree / Random forest
 *   3. Simple neural network
 *
 * The feature vector is stored with every analysis result for retroactive
 * model training as the dataset grows.
 */

import { ComplexityClass, COMPLEXITY_ORDER } from '../types.js';

/**
 * Feature names in the order they appear in the vector.
 * Used for model interpretability and debugging.
 */
export const FEATURE_NAMES = [
  'max_loop_depth',            // 0: Max nested loop depth (0-5+)
  'total_loops',               // 1: Total loop count
  'logarithmic_loop_ratio',    // 2: Fraction of loops that are logarithmic
  'has_recursion',             // 3: Binary: recursion detected
  'recursive_call_count',      // 4: Number of recursive calls
  'has_memoization',           // 5: Binary: memoization/DP detected
  'has_sorting',               // 6: Binary: sorting operation detected
  'has_hashmap',               // 7: Binary: HashMap/Set usage
  'has_array_alloc',           // 8: Binary: dynamic array allocation
  'has_binary_search',         // 9: Binary: binary search pattern
  'has_two_pointers',          // 10: Binary: two-pointer pattern
  'has_sliding_window',        // 11: Binary: sliding window pattern
  'has_divide_conquer',        // 12: Binary: divide & conquer pattern
  'has_dp',                    // 13: Binary: dynamic programming pattern
  'has_backtracking',          // 14: Binary: backtracking pattern
  'code_line_count_norm',      // 15: Normalized line count (0-1)
  'function_count',            // 16: Number of functions
  'conditional_density',       // 17: Conditionals per line of code
  'pattern_count',             // 18: Number of distinct patterns detected
  'data_structure_count',      // 19: Number of data structures used
];

/**
 * Extract a fixed-length numerical feature vector from analysis results.
 *
 * @param {import('../types.js').StaticAnalysisResult} staticResult - Static analysis output
 * @returns {number[]} Feature vector of length 20
 */
export function extractFeatureVector(staticResult) {
  if (!staticResult || !staticResult.mlFeatures) {
    return new Array(FEATURE_NAMES.length).fill(0);
  }

  const ml = staticResult.mlFeatures;

  return [
    normalize(ml.maxLoopDepth || 0, 0, 5),                                    // 0
    normalize(ml.totalLoops || 0, 0, 10),                                      // 1
    ml.totalLoops > 0 ? (ml.logarithmicLoops || 0) / ml.totalLoops : 0,       // 2
    ml.hasRecursion || 0,                                                       // 3
    normalize(ml.recursiveCallCount || 0, 0, 5),                               // 4
    ml.hasMemoization || 0,                                                     // 5
    ml.hasSorting || 0,                                                         // 6
    ml.hasHashMap || 0,                                                         // 7
    ml.hasArray || 0,                                                           // 8
    ml.hasBinarySearch || 0,                                                    // 9
    ml.hasTwoPointers || 0,                                                     // 10
    ml.hasSlidingWindow || 0,                                                   // 11
    ml.hasDivideAndConquer || 0,                                                // 12
    (staticResult.patterns || []).includes('dynamic-programming') ? 1 : 0,      // 13
    (staticResult.patterns || []).includes('backtracking') ? 1 : 0,             // 14
    normalize(ml.codeLineCount || 0, 0, 200),                                  // 15
    normalize(ml.functionCount || 0, 0, 10),                                   // 16
    ml.codeLineCount > 0                                                        // 17
      ? Math.min(1, (ml.conditionalCount || 0) / ml.codeLineCount)
      : 0,
    normalize((staticResult.patterns || []).length, 0, 5),                      // 18
    normalize((staticResult.dataStructures || []).length, 0, 5),                // 19
  ];
}

/**
 * Convert a complexity class label to a numerical index for ML classification.
 *
 * @param {string} complexityClass
 * @returns {number} Class index (0 = O(1), 1 = O(log n), ... 7 = O(n!))
 */
export function complexityToLabel(complexityClass) {
  const idx = COMPLEXITY_ORDER.indexOf(complexityClass);
  return idx >= 0 ? idx : -1;
}

/**
 * Convert a numerical label back to a complexity class string.
 *
 * @param {number} label
 * @returns {string}
 */
export function labelToComplexity(label) {
  return COMPLEXITY_ORDER[label] || ComplexityClass.UNKNOWN;
}

/**
 * Create a training sample from an analysis result.
 * Includes feature vector + label + metadata.
 *
 * @param {import('../types.js').StaticAnalysisResult} staticResult
 * @param {string} verifiedComplexity - Ground-truth complexity (from manual verification or consensus)
 * @param {string} language
 * @returns {Object} Training sample
 */
export function createTrainingSample(staticResult, verifiedComplexity, language) {
  return {
    features: extractFeatureVector(staticResult),
    label: complexityToLabel(verifiedComplexity),
    labelString: verifiedComplexity,
    language,
    timestamp: Date.now(),
    featureNames: FEATURE_NAMES,
  };
}

// ============================================================
// Normalization
// ============================================================

/**
 * Min-max normalize a value to [0, 1].
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function normalize(value, min, max) {
  if (max === min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}
