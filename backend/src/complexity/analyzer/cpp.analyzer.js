/**
 * @fileoverview C/C++ static complexity analyzer using regex/heuristic approach.
 *
 * Detects:
 * - Traditional for/while/do-while loops with nesting depth
 * - STL container usage (vector, map, set, unordered_map, priority_queue)
 * - std::sort, std::binary_search, std::lower_bound
 * - Recursion within function bodies
 * - Pointer arithmetic patterns
 * - Template metaprogramming (flagged as indeterminate)
 */

import { ComplexityClass, COMPLEXITY_ORDER } from '../types.js';
import { detectPatterns } from './patterns.js';

// ============================================================
// C++ Specific Analysis
// ============================================================

/**
 * Analyze loops in C/C++ code using brace-counting.
 *
 * @param {string} code
 * @returns {{loops: import('../types.js').LoopInfo[], maxDepth: number}}
 */
function analyzeLoops(code) {
  const loops = [];
  const lines = code.split('\n');
  let currentLoopDepth = 0;
  let maxDepth = 0;
  const loopBraceStack = [];
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('//') || line.startsWith('*') || line.startsWith('#')) continue;

    const isForLoop = /^\s*for\s*\(/.test(lines[i]);
    const isWhileLoop = /^\s*while\s*\(/.test(lines[i]);
    const isDoWhile = /^\s*do\s*\{?/.test(lines[i]);
    const isRangeFor = /for\s*\(\s*(?:auto|const\s+auto|int|long|char|string)\s*&?\s*\w+\s*:/.test(lines[i]);

    if (isForLoop || isWhileLoop || isDoWhile) {
      currentLoopDepth++;
      maxDepth = Math.max(maxDepth, currentLoopDepth);
      loopBraceStack.push(braceDepth);

      let isLogarithmic = false;

      if (isForLoop) {
        const forContent = lines[i];
        if (/\*=\s*\d+|\/=\s*\d+|>>=\s*\d+|<<=\s*\d+/.test(forContent)) {
          isLogarithmic = true;
        }
        const updatePart = forContent.split(';')[2] || '';
        if (/\w+\s*=\s*\w+\s*[\*/]\s*\d+/.test(updatePart)) {
          isLogarithmic = true;
        }
      }

      if (isWhileLoop) {
        for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
          const bodyLine = lines[j].trim();
          if (/\w+\s*(\*|\/|>>|<<)=\s*\d+/.test(bodyLine)) {
            isLogarithmic = true;
            break;
          }
        }
      }

      loops.push({
        depth: currentLoopDepth,
        type: isDoWhile ? 'do-while' : isRangeFor ? 'range-for' : isWhileLoop ? 'while' : 'for',
        isLogarithmic,
        isLinear: !isLogarithmic,
        line: i + 1,
      });
    }

    // Track braces
    for (const char of line) {
      if (char === '{') braceDepth++;
      if (char === '}') {
        braceDepth--;
        while (loopBraceStack.length > 0 && braceDepth <= loopBraceStack[loopBraceStack.length - 1]) {
          loopBraceStack.pop();
          currentLoopDepth = Math.max(0, currentLoopDepth - 1);
        }
      }
    }
  }

  return { loops, maxDepth };
}

/**
 * Detect recursion in C/C++ functions.
 *
 * @param {string} code
 * @returns {import('../types.js').RecursionInfo[]}
 */
function analyzeRecursion(code) {
  const recursions = [];

  // Match function definitions: returnType functionName(params) {
  const funcPattern = /(?:int|long|void|bool|double|float|string|vector|auto|char)\s+(\w+)\s*\([^)]*\)\s*\{/g;
  let match;

  while ((match = funcPattern.exec(code)) !== null) {
    const funcName = match[1];
    if (['main', 'operator', 'sizeof'].includes(funcName)) continue;

    const funcStart = match.index;
    let braceCount = 0;
    let bodyStart = -1;
    let bodyEnd = -1;

    for (let i = funcStart; i < code.length; i++) {
      if (code[i] === '{') {
        if (bodyStart === -1) bodyStart = i;
        braceCount++;
      }
      if (code[i] === '}') {
        braceCount--;
        if (braceCount === 0 && bodyStart !== -1) {
          bodyEnd = i;
          break;
        }
      }
    }

    if (bodyStart === -1 || bodyEnd === -1) continue;
    const body = code.slice(bodyStart, bodyEnd + 1);

    const callPattern = new RegExp(`\\b${funcName}\\s*\\(`, 'g');
    const calls = (body.match(callPattern) || []).length;

    if (calls > 0) {
      const hasMemo = /\bmemo\b|\bcache\b|\bdp\b|\bunordered_map\b.*\bfind\b/.test(body);
      const isTail = new RegExp(`return\\s+${funcName}\\s*\\(`).test(body);
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
 * Detect STL data structures in C++ code.
 *
 * @param {string} code
 * @returns {import('../types.js').DataStructureInfo[]}
 */
function detectDataStructures(code) {
  const structures = [];

  if (/\bvector\b/.test(code)) {
    // Check for 2D vector
    if (/vector\s*<\s*vector\s*</.test(code)) {
      structures.push({ type: 'array', spaceImpact: 'O(n²)', line: 0 });
    } else {
      structures.push({ type: 'array', spaceImpact: 'O(n)', line: 0 });
    }
  }
  if (/\b(unordered_)?map\b/.test(code)) {
    structures.push({ type: 'map', spaceImpact: 'O(n)', line: 0 });
  }
  if (/\b(unordered_)?set\b/.test(code)) {
    structures.push({ type: 'set', spaceImpact: 'O(n)', line: 0 });
  }
  if (/\bpriority_queue\b/.test(code)) {
    structures.push({ type: 'heap', spaceImpact: 'O(n)', line: 0 });
  }
  if (/\bstack\b/.test(code)) {
    structures.push({ type: 'stack', spaceImpact: 'O(n)', line: 0 });
  }
  if (/\bqueue\b|\bdeque\b/.test(code)) {
    structures.push({ type: 'queue', spaceImpact: 'O(n)', line: 0 });
  }
  // Raw array allocation
  if (/new\s+\w+\s*\[/.test(code) || /\w+\s+\w+\s*\[\s*\w+\s*\]/.test(code)) {
    structures.push({ type: 'array', spaceImpact: 'O(n)', line: 0 });
  }

  return structures;
}

// ============================================================
// Public API
// ============================================================

/**
 * Analyze C/C++ source code for time and space complexity.
 *
 * @param {string} code - C or C++ source code
 * @returns {Promise<import('../types.js').StaticAnalysisResult>}
 */
export async function analyzeCpp(code) {
  const warnings = [];

  const { loops, maxDepth } = analyzeLoops(code);
  const hasLogarithmicLoop = loops.some((l) => l.isLogarithmic);
  const recursionInfos = analyzeRecursion(code);
  const dataStructures = detectDataStructures(code);
  const patterns = detectPatterns(code);

  const hasSorting = /\bstd::sort\b|sort\s*\(\s*\w+\.begin\(\)/.test(code) ||
    /\bsort\s*\(\s*\w+\s*,\s*\w+\s*\+/.test(code);

  let timeComplexity = ComplexityClass.O_1;
  let spaceComplexity = ComplexityClass.O_1;
  let confidence = 0.5;

  // Space
  if (dataStructures.some((ds) => ds.spaceImpact === 'O(n²)')) {
    spaceComplexity = ComplexityClass.O_N_SQUARED;
  } else if (dataStructures.some((ds) => ds.spaceImpact === 'O(n)')) {
    spaceComplexity = ComplexityClass.O_N;
  }

  // Recursion
  const primaryRec = recursionInfos[0];
  if (primaryRec) {
    if (primaryRec.hasMemoization) {
      timeComplexity = primaryRec.recursiveCalls <= 2 ? ComplexityClass.O_N : ComplexityClass.O_N_SQUARED;
      spaceComplexity = ComplexityClass.O_N;
      confidence = 0.7;
    } else if (primaryRec.recursiveCalls === 1) {
      timeComplexity = ComplexityClass.O_N;
      spaceComplexity = ComplexityClass.O_N;
      confidence = 0.65;
    } else if (primaryRec.recursiveCalls === 2) {
      timeComplexity = ComplexityClass.O_TWO_N;
      spaceComplexity = ComplexityClass.O_N;
      confidence = 0.65;
    } else {
      timeComplexity = ComplexityClass.O_TWO_N;
      confidence = 0.5;
    }
  }

  // Loops
  if (loops.length > 0 && !primaryRec) {
    if (maxDepth === 1) {
      timeComplexity = hasLogarithmicLoop ? ComplexityClass.O_LOG_N : ComplexityClass.O_N;
      confidence = 0.8;
    } else if (maxDepth === 2) {
      const innerLog = loops.some((l) => l.depth === 2 && l.isLogarithmic);
      timeComplexity = innerLog ? ComplexityClass.O_N_LOG_N : ComplexityClass.O_N_SQUARED;
      confidence = 0.8;
    } else if (maxDepth === 3) {
      timeComplexity = ComplexityClass.O_N_CUBED;
      confidence = 0.75;
    } else {
      timeComplexity = ComplexityClass.O_N_CUBED;
      confidence = 0.6;
    }
  }

  // Sorting
  if (hasSorting) {
    const sortIdx = COMPLEXITY_ORDER.indexOf(ComplexityClass.O_N_LOG_N);
    const currentIdx = COMPLEXITY_ORDER.indexOf(timeComplexity);
    if (currentIdx < sortIdx) {
      timeComplexity = ComplexityClass.O_N_LOG_N;
      confidence = Math.max(confidence, 0.8);
    }
  }

  // Binary search (STL)
  if (/\bstd::(binary_search|lower_bound|upper_bound)\b/.test(code)) {
    if (timeComplexity === ComplexityClass.O_1) {
      timeComplexity = ComplexityClass.O_LOG_N;
    }
    confidence = Math.max(confidence, 0.8);
  }

  // ML features
  const mlFeatures = {
    maxLoopDepth: maxDepth,
    totalLoops: loops.length,
    logarithmicLoops: loops.filter((l) => l.isLogarithmic).length,
    linearLoops: loops.filter((l) => l.isLinear).length,
    hasRecursion: recursionInfos.length > 0 ? 1 : 0,
    recursiveCallCount: recursionInfos.reduce((sum, r) => sum + r.recursiveCalls, 0),
    hasMemoization: recursionInfos.some((r) => r.hasMemoization) ? 1 : 0,
    hasSorting: hasSorting ? 1 : 0,
    hasHashMap: dataStructures.some((ds) => ds.type === 'map' || ds.type === 'set') ? 1 : 0,
    hasArray: dataStructures.some((ds) => ds.type === 'array') ? 1 : 0,
    hasBinarySearch: /\bstd::(binary_search|lower_bound|upper_bound)\b/.test(code) ? 1 : 0,
    hasTwoPointers: patterns.some((p) => p.pattern === 'two-pointers') ? 1 : 0,
    hasSlidingWindow: patterns.some((p) => p.pattern === 'sliding-window') ? 1 : 0,
    hasDivideAndConquer: patterns.some((p) => p.pattern === 'divide-and-conquer') ? 1 : 0,
    codeLineCount: code.split('\n').filter((l) => l.trim() && !l.trim().startsWith('//')).length,
    functionCount: (code.match(/\b\w+\s+\w+\s*\([^)]*\)\s*\{/g) || []).length,
    conditionalCount: (code.match(/\b(if|else|switch|case)\b/g) || []).length,
  };

  return {
    timeComplexity,
    spaceComplexity,
    confidence,
    loops,
    recursion: recursionInfos,
    dataStructures,
    patterns: patterns.map((p) => p.pattern),
    maxLoopDepth: maxDepth,
    hasLogarithmicLoop,
    hasSorting,
    mlFeatures,
    warnings,
  };
}
