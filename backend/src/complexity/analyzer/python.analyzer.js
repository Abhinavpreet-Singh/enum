/**
 * @fileoverview Python static complexity analyzer using regex/heuristic approach.
 *
 * DESIGN DECISION: Python AST cannot be parsed natively in Node.js.
 * Options considered:
 * 1. Shell out to `python3 -c "import ast; ..."` — adds latency + dependency
 * 2. Use tree-sitter — heavy dependency, complex setup
 * 3. Regex/heuristic — fast, no dependencies, good enough for complexity analysis
 *
 * We chose option 3 for the static analysis layer. The empirical benchmark layer
 * runs actual Python code in Docker for ground-truth validation.
 *
 * Python-specific features detected:
 * - Indentation-based loop nesting
 * - List comprehensions (hidden loops)
 * - Generator expressions
 * - `range(n)` patterns
 * - `collections` module usage (Counter, defaultdict, deque)
 * - `@functools.lru_cache` / `@cache` decorators
 * - `sorted()` / `list.sort()`
 * - `bisect` module (binary search)
 */

import { ComplexityClass } from '../types.js';
import { detectPatterns } from './patterns.js';

// ============================================================
// Python-Specific Pattern Detection
// ============================================================

/**
 * Detect loop nesting depth in Python code using indentation analysis.
 *
 * Python uses indentation for scope, so we track indentation levels
 * of `for` and `while` keywords to determine nesting.
 *
 * @param {string} code
 * @returns {{loops: import('../types.js').LoopInfo[], maxDepth: number}}
 */
function analyzeLoops(code) {
  const lines = code.split('\n');
  const loops = [];
  const indentStack = []; // Stack of indentation levels for active loops
  let maxDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Calculate indentation level (spaces or 4-space tabs)
    const indent = line.length - line.trimStart().length;

    // Pop loops that have ended (lower or equal indentation)
    while (indentStack.length > 0 && indent <= indentStack[indentStack.length - 1]) {
      indentStack.pop();
    }

    // Detect for/while loops
    const forMatch = trimmed.match(/^for\s+\w+\s+in\s+/);
    const whileMatch = trimmed.match(/^while\s+/);

    if (forMatch || whileMatch) {
      indentStack.push(indent);
      const depth = indentStack.length;
      maxDepth = Math.max(maxDepth, depth);

      // Check for logarithmic patterns
      let isLogarithmic = false;
      if (whileMatch) {
        // Look at the next few lines for logarithmic updates
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          const bodyLine = lines[j].trim();
          if (/\w+\s*(\*|\/|>>|<<)=\s*\d+/.test(bodyLine)) {
            isLogarithmic = true;
            break;
          }
          if (/\w+\s*=\s*\w+\s*(\*|\/\/|>>|<<)\s*\d+/.test(bodyLine)) {
            isLogarithmic = true;
            break;
          }
        }
      }

      // Check for range-based logarithmic (rare but exists)
      if (forMatch && /range\s*\(\s*\d+\s*,\s*\w+\s*,\s*\w+\s*\*/.test(trimmed)) {
        isLogarithmic = true;
      }

      loops.push({
        depth,
        type: forMatch ? 'for' : 'while',
        isLogarithmic,
        isLinear: !isLogarithmic,
        line: i + 1,
      });
    }
  }

  return { loops, maxDepth };
}

/**
 * Detect recursion in Python code.
 *
 * @param {string} code
 * @returns {import('../types.js').RecursionInfo[]}
 */
function analyzeRecursion(code) {
  const recursions = [];

  // Find all function definitions
  const funcPattern = /def\s+(\w+)\s*\([^)]*\)\s*:/g;
  let match;

  while ((match = funcPattern.exec(code)) !== null) {
    const funcName = match[1];
    const funcStart = match.index;

    // Find the function body (indented block after def)
    const afterDef = code.slice(funcStart);
    const lines = afterDef.split('\n');
    const defLine = lines[0];
    const defIndent = defLine.length - defLine.trimStart().length;

    let funcBody = '';
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trimStart();
      if (!trimmed) { funcBody += '\n'; continue; }

      const indent = line.length - trimmed.length;
      if (indent <= defIndent && trimmed.length > 0 && !trimmed.startsWith('#')) break;
      funcBody += line + '\n';
    }

    // Check for direct recursion
    const callPattern = new RegExp(`\\b${funcName}\\s*\\(`, 'g');
    const calls = (funcBody.match(callPattern) || []).length;

    if (calls > 0) {
      // Check for memoization
      const hasMemo =
        /@(functools\.)?(lru_cache|cache)\b/.test(afterDef.slice(0, match.index + 200)) ||
        /\bmemo\b|\bcache\b|\bdp\b/.test(funcBody);

      // Check for tail recursion (return funcName(...))
      const isTail = new RegExp(`return\\s+${funcName}\\s*\\(`).test(funcBody);

      // Find line number
      const lineNum = code.slice(0, funcStart).split('\n').length;

      recursions.push({
        functionName: funcName,
        isDirect: true,
        isIndirect: false,
        isTailRecursion: isTail,
        recursiveCalls: calls,
        hasMemoization: hasMemo,
        line: lineNum,
      });
    }
  }

  return recursions;
}

/**
 * Detect data structures and their space impact in Python code.
 *
 * @param {string} code
 * @returns {import('../types.js').DataStructureInfo[]}
 */
function detectDataStructures(code) {
  const structures = [];

  // Lists / arrays
  if (/\[\s*\]|\blist\s*\(/.test(code)) {
    structures.push({ type: 'array', spaceImpact: 'O(n)', line: 0 });
  }

  // Dictionaries
  if (/\{\s*\}|\bdict\s*\(|\bdefaultdict\s*\(|\bCounter\s*\(/.test(code)) {
    structures.push({ type: 'map', spaceImpact: 'O(n)', line: 0 });
  }

  // Sets
  if (/\bset\s*\(/.test(code)) {
    structures.push({ type: 'set', spaceImpact: 'O(n)', line: 0 });
  }

  // Deque (queue)
  if (/\bdeque\s*\(/.test(code)) {
    structures.push({ type: 'queue', spaceImpact: 'O(n)', line: 0 });
  }

  // 2D list
  if (/\[\s*\[/.test(code) || /for\s+\w+\s+in\s+range.*\]\s*for\s+/.test(code)) {
    structures.push({ type: 'array', spaceImpact: 'O(n²)', line: 0 });
  }

  // Heapq
  if (/\bheapq\b/.test(code)) {
    structures.push({ type: 'heap', spaceImpact: 'O(n)', line: 0 });
  }

  return structures;
}

/**
 * Detect list comprehensions as hidden loops.
 *
 * @param {string} code
 * @returns {number} Number of hidden loop levels in comprehensions
 */
function detectComprehensionDepth(code) {
  // [expr for x in iterable] — 1 level
  // [expr for x in iterable for y in iterable] — 2 levels
  // {expr for x in iterable} — set comprehension
  const comprehensions = code.match(/\[\s*.*?\bfor\s+.*?\bin\s+.*?\]/gs) || [];
  let maxCompDepth = 0;

  for (const comp of comprehensions) {
    const forCount = (comp.match(/\bfor\s+/g) || []).length;
    maxCompDepth = Math.max(maxCompDepth, forCount);
  }

  return maxCompDepth;
}

// ============================================================
// Public API
// ============================================================

/**
 * Analyze Python source code for time and space complexity.
 *
 * @param {string} code - Python source code
 * @returns {Promise<import('../types.js').StaticAnalysisResult>}
 */
export async function analyzePython(code) {
  const warnings = [];

  // Analyze loops
  const { loops, maxDepth } = analyzeLoops(code);
  const comprehensionDepth = detectComprehensionDepth(code);
  const effectiveMaxDepth = Math.max(maxDepth, comprehensionDepth);
  const hasLogarithmicLoop = loops.some((l) => l.isLogarithmic);

  // Analyze recursion
  const recursionInfos = analyzeRecursion(code);

  // Detect data structures
  const dataStructures = detectDataStructures(code);

  // Detect algorithmic patterns
  const patterns = detectPatterns(code);

  // Detect sorting
  const hasSorting = /\.sort\s*\(/.test(code) || /\bsorted\s*\(/.test(code);

  // ---- Estimate time complexity ----
  let timeComplexity = ComplexityClass.O_1;
  let spaceComplexity = ComplexityClass.O_1;
  let confidence = 0.5;

  // Space from data structures
  if (dataStructures.some((ds) => ds.spaceImpact === 'O(n²)')) {
    spaceComplexity = ComplexityClass.O_N_SQUARED;
  } else if (dataStructures.some((ds) => ds.spaceImpact === 'O(n)')) {
    spaceComplexity = ComplexityClass.O_N;
  }

  // Recursion-based
  const primaryRec = recursionInfos[0];
  if (primaryRec) {
    if (primaryRec.hasMemoization) {
      if (primaryRec.recursiveCalls <= 2) {
        timeComplexity = ComplexityClass.O_N;
        spaceComplexity = ComplexityClass.O_N;
        confidence = 0.75;
      } else {
        timeComplexity = ComplexityClass.O_N_SQUARED;
        spaceComplexity = ComplexityClass.O_N;
        confidence = 0.6;
      }
    } else if (primaryRec.recursiveCalls === 1) {
      timeComplexity = ComplexityClass.O_N;
      spaceComplexity = ComplexityClass.O_N;
      confidence = 0.65;
    } else if (primaryRec.recursiveCalls === 2) {
      timeComplexity = ComplexityClass.O_TWO_N;
      spaceComplexity = ComplexityClass.O_N;
      confidence = 0.7;
    } else {
      timeComplexity = ComplexityClass.O_TWO_N;
      confidence = 0.5;
    }
  }

  // Loop-based (if no recursion or loops dominate)
  if (loops.length > 0 && !primaryRec) {
    if (effectiveMaxDepth === 1) {
      timeComplexity = hasLogarithmicLoop ? ComplexityClass.O_LOG_N : ComplexityClass.O_N;
      confidence = 0.8;
    } else if (effectiveMaxDepth === 2) {
      const innerLog = loops.some((l) => l.depth === 2 && l.isLogarithmic);
      timeComplexity = innerLog ? ComplexityClass.O_N_LOG_N : ComplexityClass.O_N_SQUARED;
      confidence = 0.8;
    } else if (effectiveMaxDepth === 3) {
      timeComplexity = ComplexityClass.O_N_CUBED;
      confidence = 0.75;
    } else {
      timeComplexity = ComplexityClass.O_N_CUBED;
      confidence = 0.6;
    }
  }

  // Sorting override
  if (hasSorting) {
    const sortIdx = COMPLEXITY_ORDER.indexOf(ComplexityClass.O_N_LOG_N);
    const currentIdx = COMPLEXITY_ORDER.indexOf(timeComplexity);
    if (currentIdx < sortIdx) {
      timeComplexity = ComplexityClass.O_N_LOG_N;
      confidence = Math.max(confidence, 0.8);
    }
  }

  // Python-specific: bisect module → binary search
  if (/\bbisect\b/.test(code)) {
    if (timeComplexity === ComplexityClass.O_1) {
      timeComplexity = ComplexityClass.O_LOG_N;
    }
    confidence = Math.max(confidence, 0.75);
  }

  // Build ML features
  const mlFeatures = {
    maxLoopDepth: effectiveMaxDepth,
    totalLoops: loops.length,
    logarithmicLoops: loops.filter((l) => l.isLogarithmic).length,
    linearLoops: loops.filter((l) => l.isLinear).length,
    hasRecursion: recursionInfos.length > 0 ? 1 : 0,
    recursiveCallCount: recursionInfos.reduce((sum, r) => sum + r.recursiveCalls, 0),
    hasMemoization: recursionInfos.some((r) => r.hasMemoization) ? 1 : 0,
    hasSorting: hasSorting ? 1 : 0,
    hasHashMap: dataStructures.some((ds) => ds.type === 'map' || ds.type === 'set') ? 1 : 0,
    hasArray: dataStructures.some((ds) => ds.type === 'array') ? 1 : 0,
    hasBinarySearch: /\bbisect\b/.test(code) || patterns.some((p) => p.pattern === 'binary-search') ? 1 : 0,
    hasTwoPointers: patterns.some((p) => p.pattern === 'two-pointers') ? 1 : 0,
    hasSlidingWindow: patterns.some((p) => p.pattern === 'sliding-window') ? 1 : 0,
    hasDivideAndConquer: patterns.some((p) => p.pattern === 'divide-and-conquer') ? 1 : 0,
    codeLineCount: code.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#')).length,
    functionCount: (code.match(/\bdef\s+/g) || []).length,
    conditionalCount: (code.match(/\b(if|elif|else)\b/g) || []).length,
  };

  return {
    timeComplexity,
    spaceComplexity,
    confidence,
    loops,
    recursion: recursionInfos,
    dataStructures,
    patterns: patterns.map((p) => p.pattern),
    maxLoopDepth: effectiveMaxDepth,
    hasLogarithmicLoop,
    hasSorting,
    mlFeatures,
    warnings,
  };
}

// Needed for import in estimateFromFeatures
import { COMPLEXITY_ORDER } from '../types.js';
