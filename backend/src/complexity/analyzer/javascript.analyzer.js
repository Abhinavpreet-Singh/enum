/**
 * @fileoverview JavaScript AST-based static complexity analyzer.
 *
 * DESIGN DECISIONS:
 * - Uses `acorn` for parsing (fast, spec-compliant, zero-dependency ESM parser).
 * - Uses `acorn-walk` for AST traversal (simple, recursive walker).
 * - Detects:
 *   1. Loop nesting depth (for, while, do-while, for-in, for-of)
 *   2. Logarithmic loops (i *= 2, i >>= 1, i /= 2)
 *   3. Direct & indirect recursion
 *   4. Tail recursion (optimizable)
 *   5. Data structure allocations (Array, Map, Set, Object)
 *   6. Built-in sort calls
 *   7. Memoization/caching patterns
 *   8. Divide-and-conquer patterns (recursive calls on half input)
 *   9. Algorithmic patterns via structural detection
 *
 * DOES NOT EXECUTE CODE — purely structural analysis.
 */

import { ComplexityClass } from '../types.js';
import { detectPatterns, getDominantPattern } from './patterns.js';

// Dynamic imports for acorn (installed as peer dependency)
let acorn;
let walk;

async function ensureAcorn() {
  if (!acorn) {
    acorn = await import('acorn');
    walk = await import('acorn-walk');
  }
}

// ============================================================
// AST Analysis Helpers
// ============================================================

/**
 * Check if an AST node is a loop construct.
 * @param {string} type - AST node type
 * @returns {boolean}
 */
function isLoopNode(type) {
  return [
    'ForStatement',
    'WhileStatement',
    'DoWhileStatement',
    'ForInStatement',
    'ForOfStatement',
  ].includes(type);
}

/**
 * Check if a loop update expression indicates logarithmic iteration.
 * Patterns: i *= 2, i /= 2, i >>= 1, i <<= 1, i = i * 2, i = i / 2
 *
 * @param {Object} node - AST update expression node
 * @returns {boolean}
 */
function isLogarithmicUpdate(node) {
  if (!node) return false;

  // Handle AssignmentExpression: i *= 2, i /= 2, i >>= 1
  if (node.type === 'AssignmentExpression') {
    if (['*=', '/=', '>>=', '<<='].includes(node.operator)) {
      if (node.right && node.right.type === 'Literal') {
        const val = node.right.value;
        return val === 2 || val === 3;
      }
    }
    // i = i * 2, i = i / 2
    if (node.operator === '=' && node.right && node.right.type === 'BinaryExpression') {
      const { operator, right } = node.right;
      if (['*', '/', '>>', '<<'].includes(operator)) {
        if (right && right.type === 'Literal' && (right.value === 2 || right.value === 3)) {
          return true;
        }
      }
    }
  }

  // Handle UpdateExpression inside a special for-loop body
  // Not directly logarithmic — handled separately

  return false;
}

/**
 * Check if a for-loop has a logarithmic structure by examining the update and condition.
 *
 * @param {Object} forNode - ForStatement AST node
 * @returns {boolean}
 */
function isLogarithmicForLoop(forNode) {
  const update = forNode.update;
  if (!update) return false;

  // Direct assignment expression: i *= 2
  if (update.type === 'AssignmentExpression') {
    return isLogarithmicUpdate(update);
  }

  // Sequence expression (rare): (i *= 2, ...)
  if (update.type === 'SequenceExpression') {
    return update.expressions.some(isLogarithmicUpdate);
  }

  return false;
}

/**
 * Check if a while-loop body contains logarithmic updates.
 *
 * @param {Object} body - Loop body AST node
 * @param {string} source - Original source code
 * @returns {boolean}
 */
function hasLogarithmicBodyUpdate(body, source) {
  if (!body) return false;

  const bodySource = source.slice(body.start, body.end);

  // Check for common logarithmic patterns in the body
  const logPatterns = [
    /\w+\s*\*=\s*2/,
    /\w+\s*\/=\s*2/,
    /\w+\s*>>=\s*1/,
    /\w+\s*<<=\s*1/,
    /\w+\s*=\s*\w+\s*\*\s*2/,
    /\w+\s*=\s*\w+\s*\/\s*2/,
    /\w+\s*=\s*Math\.floor\s*\(\s*\w+\s*\/\s*2\s*\)/,
  ];

  return logPatterns.some((p) => p.test(bodySource));
}

/**
 * Extract all function declarations and their names from the AST.
 *
 * @param {Object} ast - Parsed AST
 * @returns {Map<string, Object>} Map of function name → AST node
 */
function extractFunctions(ast) {
  const functions = new Map();

  walk.simple(ast, {
    FunctionDeclaration(node) {
      if (node.id && node.id.name) {
        functions.set(node.id.name, node);
      }
    },
    VariableDeclarator(node) {
      if (
        node.id &&
        node.id.name &&
        node.init &&
        (node.init.type === 'FunctionExpression' || node.init.type === 'ArrowFunctionExpression')
      ) {
        functions.set(node.id.name, node.init);
      }
    },
  });

  return functions;
}

/**
 * Check if a function calls itself (direct recursion) or another function (indirect).
 *
 * @param {Object} funcNode - Function AST node
 * @param {string} funcName - Function name
 * @param {Map<string, Object>} allFunctions - All declared functions
 * @param {string} source - Source code
 * @returns {import('../types.js').RecursionInfo | null}
 */
function analyzeRecursion(funcNode, funcName, allFunctions, source) {
  let recursiveCalls = 0;
  let isDirect = false;
  let isIndirect = false;
  let isTailRecursion = false;
  let hasMemoization = false;

  // Check for memoization patterns
  const funcSource = source.slice(funcNode.start, funcNode.end);
  const memoPatterns = [
    /\bmemo\b/i,
    /\bcache\b/i,
    /\bdp\b/,
    /Map\(\).*\.has\(/,
    /Map\(\).*\.get\(/,
    /\[\w+\]\s*!==?\s*undefined/,
  ];
  hasMemoization = memoPatterns.some((p) => p.test(funcSource));

  walk.simple(funcNode, {
    CallExpression(callNode) {
      let calledName = null;

      if (callNode.callee.type === 'Identifier') {
        calledName = callNode.callee.name;
      } else if (
        callNode.callee.type === 'MemberExpression' &&
        callNode.callee.object.type === 'Identifier'
      ) {
        calledName = callNode.callee.object.name;
      }

      if (calledName === funcName) {
        isDirect = true;
        recursiveCalls++;
      } else if (calledName && allFunctions.has(calledName)) {
        // Check if the called function calls back (indirect recursion)
        const calledFuncSource = source.slice(
          allFunctions.get(calledName).start,
          allFunctions.get(calledName).end
        );
        if (calledFuncSource.includes(funcName + '(')) {
          isIndirect = true;
          recursiveCalls++;
        }
      }
    },

    ReturnStatement(retNode) {
      // Check for tail recursion: return foo(...)
      if (
        retNode.argument &&
        retNode.argument.type === 'CallExpression' &&
        retNode.argument.callee.type === 'Identifier' &&
        retNode.argument.callee.name === funcName
      ) {
        isTailRecursion = true;
      }
    },
  });

  if (!isDirect && !isIndirect) return null;

  return {
    functionName: funcName,
    isDirect,
    isIndirect,
    isTailRecursion,
    recursiveCalls,
    hasMemoization,
    line: funcNode.loc ? funcNode.loc.start.line : 0,
  };
}

/**
 * Detect data structure allocations that affect space complexity.
 *
 * @param {Object} ast - Parsed AST
 * @param {string} source - Source code
 * @returns {import('../types.js').DataStructureInfo[]}
 */
function detectDataStructures(ast, source) {
  const structures = [];

  walk.simple(ast, {
    NewExpression(node) {
      if (node.callee.type === 'Identifier') {
        const name = node.callee.name;
        if (name === 'Map' || name === 'WeakMap') {
          structures.push({ type: 'map', spaceImpact: 'O(n)', line: node.loc?.start?.line || 0 });
        } else if (name === 'Set' || name === 'WeakSet') {
          structures.push({ type: 'set', spaceImpact: 'O(n)', line: node.loc?.start?.line || 0 });
        } else if (name === 'Array') {
          structures.push({ type: 'array', spaceImpact: 'O(n)', line: node.loc?.start?.line || 0 });
        }
      }
    },

    CallExpression(node) {
      // Detect Array.from, Array.of, Object.keys/values/entries
      if (
        node.callee.type === 'MemberExpression' &&
        node.callee.object.type === 'Identifier'
      ) {
        const obj = node.callee.object.name;
        const prop = node.callee.property?.name;

        if (obj === 'Array' && ['from', 'of'].includes(prop)) {
          structures.push({ type: 'array', spaceImpact: 'O(n)', line: node.loc?.start?.line || 0 });
        }
        if (obj === 'Object' && ['keys', 'values', 'entries'].includes(prop)) {
          structures.push({ type: 'array', spaceImpact: 'O(n)', line: node.loc?.start?.line || 0 });
        }
      }

      // Detect .sort() calls
      if (
        node.callee.type === 'MemberExpression' &&
        node.callee.property?.name === 'sort'
      ) {
        structures.push({ type: 'sorting', spaceImpact: 'O(n)', line: node.loc?.start?.line || 0 });
      }
    },

    ArrayExpression(node) {
      // Large array literals
      if (node.elements && node.elements.length > 10) {
        structures.push({ type: 'array', spaceImpact: 'O(n)', line: node.loc?.start?.line || 0 });
      }
    },

    ObjectExpression(node) {
      // Dynamic object as hash map (heuristic: used inside a loop)
      if (node.properties && node.properties.length === 0) {
        structures.push({ type: 'map', spaceImpact: 'O(n)', line: node.loc?.start?.line || 0 });
      }
    },
  });

  return structures;
}

// ============================================================
// Loop Analysis
// ============================================================

/**
 * Analyze all loops in the AST, tracking nesting depth.
 *
 * @param {Object} ast - Parsed AST
 * @param {string} source - Source code
 * @returns {import('../types.js').LoopInfo[]}
 */
function analyzeLoops(ast, source) {
  const loops = [];
  let currentDepth = 0;
  let maxDepth = 0;

  /**
   * Recursively walk the AST tracking loop depth.
   */
  function walkNode(node) {
    if (!node || typeof node !== 'object') return;

    if (isLoopNode(node.type)) {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);

      let isLogarithmic = false;
      let isLinear = true; // Assume linear unless proven otherwise

      if (node.type === 'ForStatement') {
        isLogarithmic = isLogarithmicForLoop(node);
        isLinear = !isLogarithmic;
      } else if (node.type === 'WhileStatement' || node.type === 'DoWhileStatement') {
        isLogarithmic = hasLogarithmicBodyUpdate(node.body, source);
        isLinear = !isLogarithmic;
      }

      let loopType = node.type.replace('Statement', '').toLowerCase();
      if (loopType === 'forin') loopType = 'for-in';
      if (loopType === 'forof') loopType = 'for-of';

      loops.push({
        depth: currentDepth,
        type: loopType,
        isLogarithmic,
        isLinear,
        line: node.loc ? node.loc.start.line : 0,
      });
    }

    // Walk child nodes
    for (const key of Object.keys(node)) {
      if (key === 'type' || key === 'loc' || key === 'start' || key === 'end') continue;

      const child = node[key];
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item === 'object' && item.type) {
            walkNode(item);
          }
        }
      } else if (child && typeof child === 'object' && child.type) {
        walkNode(child);
      }
    }

    if (isLoopNode(node.type)) {
      currentDepth--;
    }
  }

  walkNode(ast);
  return loops;
}

// ============================================================
// Complexity Estimation from AST Features
// ============================================================

/**
 * Estimate time complexity from detected loops, recursion, and patterns.
 *
 * Heuristic rules:
 * 1. No loops + no recursion → O(1)
 * 2. Single linear loop → O(n)
 * 3. Single logarithmic loop → O(log n)
 * 4. Nested loops (depth d) → O(n^d)
 * 5. Loop + sort → O(n log n)
 * 6. Single recursive call (halving) → O(log n)
 * 7. Single recursive call (linear) → O(n)
 * 8. Two recursive calls (halving) → O(n log n)
 * 9. Two recursive calls (no halving) → O(2^n)
 * 10. Recursion with memoization → reduces by one level
 *
 * @param {Object} features
 * @returns {{timeComplexity: string, spaceComplexity: string, confidence: number}}
 */
function estimateFromFeatures(features) {
  const {
    loops,
    recursionInfos,
    dataStructures,
    patterns,
    hasSorting,
    maxLoopDepth,
    hasLogarithmicLoop,
  } = features;

  let timeComplexity = ComplexityClass.O_1;
  let spaceComplexity = ComplexityClass.O_1;
  let confidence = 0.5; // Base confidence

  // ---- Space Complexity ----
  const hasLinearSpace = dataStructures.some(
    (ds) => ds.spaceImpact === 'O(n)' && ds.type !== 'sorting'
  );
  const hasQuadraticSpace = dataStructures.some((ds) => ds.spaceImpact === 'O(n²)');

  if (hasQuadraticSpace) {
    spaceComplexity = ComplexityClass.O_N_SQUARED;
  } else if (hasLinearSpace) {
    spaceComplexity = ComplexityClass.O_N;
  }

  // ---- Recursion-based estimation ----
  const primaryRecursion = recursionInfos[0] || null;

  if (primaryRecursion) {
    const calls = primaryRecursion.recursiveCalls;
    const hasMemo = primaryRecursion.hasMemoization;

    if (calls === 1) {
      // Single recursive call
      timeComplexity = ComplexityClass.O_N; // Linear recursion
      spaceComplexity = ComplexityClass.O_N; // Call stack

      // Check if it's halving (binary search style)
      // This is approximate — we look for patterns in the code
      if (hasLogarithmicLoop || patterns.some((p) => p.pattern === 'binary-search')) {
        timeComplexity = ComplexityClass.O_LOG_N;
        spaceComplexity = ComplexityClass.O_LOG_N;
        confidence = 0.75;
      }
    } else if (calls === 2) {
      // Two recursive calls — classic divide & conquer
      if (hasMemo) {
        timeComplexity = ComplexityClass.O_N; // Memoized reduces to linear
        spaceComplexity = ComplexityClass.O_N;
        confidence = 0.7;
      } else if (patterns.some((p) => p.pattern === 'divide-and-conquer')) {
        timeComplexity = ComplexityClass.O_N_LOG_N;
        spaceComplexity = ComplexityClass.O_N;
        confidence = 0.75;
      } else {
        timeComplexity = ComplexityClass.O_TWO_N;
        spaceComplexity = ComplexityClass.O_N;
        confidence = 0.65;
      }
    } else if (calls > 2) {
      timeComplexity = hasMemo ? ComplexityClass.O_N_SQUARED : ComplexityClass.O_TWO_N;
      spaceComplexity = ComplexityClass.O_N;
      confidence = 0.5;
    }
  }

  // ---- Loop-based estimation (overrides recursion if loops dominate) ----
  if (loops.length > 0 && !primaryRecursion) {
    if (maxLoopDepth === 1) {
      if (hasLogarithmicLoop) {
        timeComplexity = ComplexityClass.O_LOG_N;
        confidence = 0.85;
      } else {
        timeComplexity = ComplexityClass.O_N;
        confidence = 0.8;
      }
    } else if (maxLoopDepth === 2) {
      // Check if inner loop is logarithmic
      const innerLog = loops.some((l) => l.depth === 2 && l.isLogarithmic);
      const outerLog = loops.some((l) => l.depth === 1 && l.isLogarithmic);

      if (innerLog && !outerLog) {
        timeComplexity = ComplexityClass.O_N_LOG_N;
        confidence = 0.8;
      } else if (outerLog && !innerLog) {
        timeComplexity = ComplexityClass.O_N_LOG_N;
        confidence = 0.75;
      } else {
        timeComplexity = ComplexityClass.O_N_SQUARED;
        confidence = 0.85;
      }
    } else if (maxLoopDepth === 3) {
      timeComplexity = ComplexityClass.O_N_CUBED;
      confidence = 0.8;
    } else if (maxLoopDepth > 3) {
      timeComplexity = ComplexityClass.O_N_CUBED; // Cap at O(n³) for readability
      confidence = 0.6;
    }
  }

  // ---- Sorting adjustment ----
  if (hasSorting) {
    const sortIdx = COMPLEXITY_ORDER.indexOf(ComplexityClass.O_N_LOG_N);
    const currentIdx = COMPLEXITY_ORDER.indexOf(timeComplexity);

    // If current complexity is less than O(n log n), bump up
    if (currentIdx < sortIdx) {
      timeComplexity = ComplexityClass.O_N_LOG_N;
      confidence = Math.max(confidence, 0.8);
    }
    // Sorting adds O(n) space unless in-place
    if (spaceComplexity === ComplexityClass.O_1) {
      spaceComplexity = ComplexityClass.O_N;
    }
  }

  // ---- Pattern-based adjustment ----
  const dominantPattern = getDominantPattern(patterns);
  if (dominantPattern && dominantPattern.confidence > 0.6) {
    const patternTimeIdx = COMPLEXITY_ORDER.indexOf(dominantPattern.timeComplexity);
    const currentTimeIdx = COMPLEXITY_ORDER.indexOf(timeComplexity);

    // Only override if pattern suggests higher or equal complexity
    if (patternTimeIdx >= currentTimeIdx) {
      // Blend: keep current estimate but boost confidence if pattern agrees
      if (patternTimeIdx === currentTimeIdx) {
        confidence = Math.min(1, confidence + 0.1);
      }
    }
  }

  // ---- Recursion + loop combination ----
  if (primaryRecursion && loops.length > 0) {
    const recIdx = COMPLEXITY_ORDER.indexOf(timeComplexity);
    if (maxLoopDepth >= 1) {
      // Recursion with inner loops — multiply complexities
      const loopComplexityIdx = maxLoopDepth; // O(n^depth) index
      const combined = Math.min(COMPLEXITY_ORDER.length - 1, recIdx + loopComplexityIdx);
      timeComplexity = COMPLEXITY_ORDER[combined];
      confidence = Math.max(0.4, confidence - 0.15);
    }
  }

  return { timeComplexity, spaceComplexity, confidence };
}

// ============================================================
// Public API
// ============================================================

/**
 * Analyze JavaScript source code for time and space complexity.
 *
 * @param {string} code - JavaScript source code
 * @returns {Promise<import('../types.js').StaticAnalysisResult>}
 */
export async function analyzeJavaScript(code) {
  await ensureAcorn();

  const warnings = [];
  let ast;

  try {
    ast = acorn.parse(code, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
    });
  } catch (parseError) {
    // Try as script (non-module)
    try {
      ast = acorn.parse(code, {
        ecmaVersion: 'latest',
        sourceType: 'script',
        locations: true,
        allowReturnOutsideFunction: true,
      });
    } catch (err) {
      warnings.push(`Parse error: ${err.message}`);
      // Fall back to heuristic analysis
      return heuristicAnalysis(code, warnings);
    }
  }

  // Extract all functions
  const functions = extractFunctions(ast);

  // Analyze loops
  const loops = analyzeLoops(ast, code);
  const maxLoopDepth = loops.length > 0 ? Math.max(...loops.map((l) => l.depth)) : 0;
  const hasLogarithmicLoop = loops.some((l) => l.isLogarithmic);

  // Analyze recursion
  const recursionInfos = [];
  for (const [name, node] of functions) {
    const recInfo = analyzeRecursion(node, name, functions, code);
    if (recInfo) recursionInfos.push(recInfo);
  }

  // Detect data structures
  const dataStructures = detectDataStructures(ast, code);

  // Detect algorithmic patterns
  const patterns = detectPatterns(code);

  // Check for sorting
  const hasSorting = dataStructures.some((ds) => ds.type === 'sorting') ||
    /\.sort\s*\(/.test(code);

  // Estimate complexity
  const features = {
    loops,
    recursionInfos,
    dataStructures,
    patterns,
    hasSorting,
    maxLoopDepth,
    hasLogarithmicLoop,
  };

  const { timeComplexity, spaceComplexity, confidence } = estimateFromFeatures(features);

  // Build ML feature vector
  const mlFeatures = buildMLFeatures(features, code);

  return {
    timeComplexity,
    spaceComplexity,
    confidence,
    loops,
    recursion: recursionInfos,
    dataStructures,
    patterns: patterns.map((p) => p.pattern),
    maxLoopDepth,
    hasLogarithmicLoop,
    hasSorting,
    mlFeatures,
    warnings,
  };
}

/**
 * Fallback heuristic analysis when AST parsing fails.
 *
 * @param {string} code
 * @param {string[]} warnings
 * @returns {import('../types.js').StaticAnalysisResult}
 */
function heuristicAnalysis(code, warnings) {
  warnings.push('Using heuristic analysis (AST parsing failed)');

  const forLoops = (code.match(/\bfor\s*\(/g) || []).length;
  const whileLoops = (code.match(/\bwhile\s*\(/g) || []).length;
  const totalLoops = forLoops + whileLoops;
  const patterns = detectPatterns(code);

  // Very rough depth estimation by indentation
  let maxDepth = 0;
  let currentDepth = 0;
  for (const char of code) {
    if (char === '{') { currentDepth++; maxDepth = Math.max(maxDepth, currentDepth); }
    if (char === '}') currentDepth--;
  }

  const loopDepth = Math.min(totalLoops, Math.floor(maxDepth / 2));
  const hasRecursion = /function\s+(\w+)[\s\S]*?\1\s*\(/.test(code);
  const hasSorting = /\.sort\s*\(/.test(code);

  let timeComplexity = ComplexityClass.O_1;
  if (loopDepth >= 3) timeComplexity = ComplexityClass.O_N_CUBED;
  else if (loopDepth === 2) timeComplexity = ComplexityClass.O_N_SQUARED;
  else if (loopDepth === 1) timeComplexity = ComplexityClass.O_N;
  if (hasSorting && loopDepth <= 1) timeComplexity = ComplexityClass.O_N_LOG_N;
  if (hasRecursion && loopDepth === 0) timeComplexity = ComplexityClass.O_N;

  return {
    timeComplexity,
    spaceComplexity: ComplexityClass.O_1,
    confidence: 0.3,
    loops: [],
    recursion: [],
    dataStructures: [],
    patterns: patterns.map((p) => p.pattern),
    maxLoopDepth: loopDepth,
    hasLogarithmicLoop: false,
    hasSorting,
    mlFeatures: {},
    warnings,
  };
}

/**
 * Build ML feature vector from analysis results.
 *
 * @param {Object} features - Analyzed features
 * @param {string} code - Source code
 * @returns {import('../types.js').MLFeatureVector}
 */
function buildMLFeatures(features, code) {
  const lines = code.split('\n').filter((l) => l.trim()).length;
  const conditionals = (code.match(/\b(if|else|switch|case|\\?\\.)\s*[\({]/g) || []).length;

  return {
    maxLoopDepth: features.maxLoopDepth,
    totalLoops: features.loops.length,
    logarithmicLoops: features.loops.filter((l) => l.isLogarithmic).length,
    linearLoops: features.loops.filter((l) => l.isLinear).length,
    hasRecursion: features.recursionInfos.length > 0 ? 1 : 0,
    recursiveCallCount: features.recursionInfos.reduce((sum, r) => sum + r.recursiveCalls, 0),
    hasMemoization: features.recursionInfos.some((r) => r.hasMemoization) ? 1 : 0,
    hasSorting: features.hasSorting ? 1 : 0,
    hasHashMap: features.dataStructures.some((ds) => ds.type === 'map' || ds.type === 'set') ? 1 : 0,
    hasArray: features.dataStructures.some((ds) => ds.type === 'array') ? 1 : 0,
    hasBinarySearch: features.patterns.some((p) => p.pattern === 'binary-search') ? 1 : 0,
    hasTwoPointers: features.patterns.some((p) => p.pattern === 'two-pointers') ? 1 : 0,
    hasSlidingWindow: features.patterns.some((p) => p.pattern === 'sliding-window') ? 1 : 0,
    hasDivideAndConquer: features.patterns.some((p) => p.pattern === 'divide-and-conquer') ? 1 : 0,
    codeLineCount: lines,
    functionCount: (code.match(/\bfunction\b/g) || []).length +
      (code.match(/=>/g) || []).length,
    conditionalCount: conditionals,
  };
}

// Re-export COMPLEXITY_ORDER for convenience
export { COMPLEXITY_ORDER } from '../types.js';
