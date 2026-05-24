/**
 * @fileoverview Type definitions for the Complexity Analyzer system.
 * Uses JSDoc for type safety without requiring TypeScript compilation.
 * All types are exported as documentation — consumed via @typedef imports.
 *
 * DESIGN DECISION: JSDoc over TypeScript to integrate seamlessly with the
 * existing ES module JavaScript backend without adding a build step.
 */

// ============================================================
// ENUMS / CONSTANTS
// ============================================================

/** @enum {string} Supported complexity classes */
export const ComplexityClass = {
  O_1: 'O(1)',
  O_LOG_N: 'O(log n)',
  O_N: 'O(n)',
  O_N_LOG_N: 'O(n log n)',
  O_N_SQUARED: 'O(n²)',
  O_N_CUBED: 'O(n³)',
  O_TWO_N: 'O(2^n)',
  O_N_FACTORIAL: 'O(n!)',
  UNKNOWN: 'Unknown',
};

/** Ordered from best to worst for comparison */
export const COMPLEXITY_ORDER = [
  ComplexityClass.O_1,
  ComplexityClass.O_LOG_N,
  ComplexityClass.O_N,
  ComplexityClass.O_N_LOG_N,
  ComplexityClass.O_N_SQUARED,
  ComplexityClass.O_N_CUBED,
  ComplexityClass.O_TWO_N,
  ComplexityClass.O_N_FACTORIAL,
];

/** @enum {string} Supported languages */
export const Language = {
  JAVASCRIPT: 'javascript',
  PYTHON: 'python',
  JAVA: 'java',
  CPP: 'cpp',
  C: 'c',
};

/** @enum {string} Analysis modes */
export const AnalysisMode = {
  FULL: 'full',
  STATIC_ONLY: 'static-only',
  BENCHMARK_ONLY: 'benchmark-only',
};

/** @enum {string} Algorithmic patterns */
export const AlgoPattern = {
  TWO_POINTERS: 'two-pointers',
  SLIDING_WINDOW: 'sliding-window',
  BINARY_SEARCH: 'binary-search',
  HASHMAP_LOOKUP: 'hashmap-lookup',
  DIVIDE_AND_CONQUER: 'divide-and-conquer',
  DYNAMIC_PROGRAMMING: 'dynamic-programming',
  SORTING: 'sorting',
  BFS_DFS: 'bfs-dfs',
  GREEDY: 'greedy',
  RECURSION: 'recursion',
  BACKTRACKING: 'backtracking',
  BRUTE_FORCE: 'brute-force',
  PREFIX_SUM: 'prefix-sum',
  MONOTONIC_STACK: 'monotonic-stack',
};

// ============================================================
// TYPE DEFINITIONS (JSDoc)
// ============================================================

/**
 * @typedef {Object} LoopInfo
 * @property {number} depth - Nesting depth of the loop
 * @property {string} type - Loop type: 'for' | 'while' | 'do-while' | 'for-in' | 'for-of' | 'forEach'
 * @property {boolean} isLogarithmic - Whether the loop variable changes logarithmically (i *= 2, i /= 2)
 * @property {boolean} isLinear - Whether loop is linear (i++, i--)
 * @property {number} line - Source line number
 */

/**
 * @typedef {Object} RecursionInfo
 * @property {string} functionName - Name of the recursive function
 * @property {boolean} isDirect - Whether recursion is direct (calls itself)
 * @property {boolean} isIndirect - Whether recursion is indirect (A -> B -> A)
 * @property {boolean} isTailRecursion - Whether it's tail recursive (optimizable)
 * @property {number} recursiveCalls - Number of recursive calls in the function body
 * @property {boolean} hasMemoization - Whether memoization/caching is detected
 * @property {number} line - Source line number
 */

/**
 * @typedef {Object} DataStructureInfo
 * @property {string} type - 'array' | 'map' | 'set' | 'stack' | 'queue' | 'tree' | 'graph'
 * @property {string} spaceImpact - Estimated space impact: 'O(1)' | 'O(n)' | 'O(n²)'
 * @property {number} line - Source line number
 */

/**
 * @typedef {Object} StaticAnalysisResult
 * @property {string} timeComplexity - Estimated time complexity string
 * @property {string} spaceComplexity - Estimated space complexity string
 * @property {number} confidence - Confidence score 0.0 - 1.0
 * @property {LoopInfo[]} loops - Detected loops
 * @property {RecursionInfo[]} recursion - Detected recursion
 * @property {DataStructureInfo[]} dataStructures - Detected data structures
 * @property {string[]} patterns - Detected algorithmic patterns
 * @property {number} maxLoopDepth - Maximum loop nesting depth
 * @property {boolean} hasLogarithmicLoop - Whether any loop has logarithmic iteration
 * @property {boolean} hasSorting - Whether sorting is detected
 * @property {Object} mlFeatures - Numerical features for ML classification
 * @property {string[]} warnings - Analysis warnings
 */

/**
 * @typedef {Object} BenchmarkDataPoint
 * @property {number} inputSize - Input size n
 * @property {number} executionTimeMs - Execution time in milliseconds
 * @property {number} memoryUsageBytes - Peak memory usage in bytes
 * @property {boolean} timedOut - Whether execution timed out
 */

/**
 * @typedef {Object} RegressionResult
 * @property {string} bestFit - Best fitting complexity class
 * @property {number} rSquared - R² goodness of fit (0-1)
 * @property {Object.<string, number>} allFits - R² scores for all models
 * @property {number[]} coefficients - Fitted model coefficients [a, b]
 */

/**
 * @typedef {Object} RuntimeAnalysisResult
 * @property {string} timeComplexity - Estimated time complexity from benchmarks
 * @property {string} spaceComplexity - Estimated space complexity from memory profile
 * @property {number} confidence - Confidence score 0.0 - 1.0
 * @property {BenchmarkDataPoint[]} dataPoints - Raw benchmark data
 * @property {RegressionResult} timeRegression - Time complexity regression result
 * @property {RegressionResult} spaceRegression - Space complexity regression result
 * @property {number} maxInputSize - Largest input size tested
 * @property {boolean} hitTimeout - Whether any test case timed out
 * @property {string[]} warnings - Analysis warnings
 */

/**
 * @typedef {Object} HybridAnalysisResult
 * @property {string} timeComplexity - Final estimated time complexity
 * @property {string} spaceComplexity - Final estimated space complexity
 * @property {number} confidence - Overall confidence 0.0 - 1.0
 * @property {StaticAnalysisResult} staticAnalysis - Static analysis details
 * @property {RuntimeAnalysisResult|null} runtimeAnalysis - Runtime analysis details (null if static-only)
 * @property {string} agreementStatus - 'agree' | 'partial' | 'disagree' | 'static-only'
 */

/**
 * @typedef {Object} ExplanationResult
 * @property {string} explanationSimple - Beginner-friendly explanation
 * @property {string} explanationTechnical - Interview-style technical explanation
 * @property {string} optimizationSuggestion - How to optimize (if not optimal)
 * @property {boolean} isOptimal - Whether the solution has optimal complexity
 * @property {string|null} tleRisk - TLE risk assessment or null
 * @property {string|null} memoryRisk - Memory overflow risk or null
 * @property {string|null} maxFeasibleN - Max feasible N for competitive programming constraints
 */

/**
 * @typedef {Object} ComplexityAnalysisResponse
 * @property {string} timeComplexity - Final time complexity
 * @property {string} spaceComplexity - Final space complexity
 * @property {number} confidence - Overall confidence 0.0 - 1.0
 * @property {StaticAnalysisResult} staticAnalysis - Static analysis details
 * @property {RuntimeAnalysisResult|null} runtimeAnalysis - Runtime details
 * @property {ExplanationResult} explanation - AI explanation
 * @property {Object} mlFeatures - ML feature vector for future training
 * @property {string} analysisId - Unique analysis ID (for caching / reference)
 * @property {number} analysisTimeMs - Total analysis wall-clock time
 */

/**
 * @typedef {Object} AnalysisRequest
 * @property {string} code - User source code
 * @property {string} language - Language: 'javascript' | 'python' | 'java' | 'cpp' | 'c'
 * @property {string} [functionName] - Entry function name (for benchmarking)
 * @property {string} [questionId] - Optional question ID for optimal comparison
 * @property {string} [mode] - 'full' | 'static-only' | 'benchmark-only'
 * @property {string} [userId] - User ID for rate limiting / ML data collection
 */

/**
 * @typedef {Object} MLFeatureVector
 * @property {number} maxLoopDepth - Max nested loop depth
 * @property {number} totalLoops - Total number of loops
 * @property {number} logarithmicLoops - Number of logarithmic loops
 * @property {number} linearLoops - Number of linear loops
 * @property {number} hasRecursion - 1 if recursion detected, 0 otherwise
 * @property {number} recursiveCallCount - Number of recursive calls
 * @property {number} hasMemoization - 1 if memoization detected, 0 otherwise
 * @property {number} hasSorting - 1 if sorting detected, 0 otherwise
 * @property {number} hasHashMap - 1 if HashMap/Set usage, 0 otherwise
 * @property {number} hasArray - 1 if array allocation detected, 0 otherwise
 * @property {number} hasBinarySearch - 1 if binary search pattern, 0 otherwise
 * @property {number} hasTwoPointers - 1 if two-pointer pattern, 0 otherwise
 * @property {number} hasSlidingWindow - 1 if sliding window pattern, 0 otherwise
 * @property {number} hasDivideAndConquer - 1 if divide-and-conquer pattern, 0 otherwise
 * @property {number} codeLineCount - Total lines of code (proxy for complexity)
 * @property {number} functionCount - Number of function declarations
 * @property {number} conditionalCount - Number of if/else/switch statements
 */
