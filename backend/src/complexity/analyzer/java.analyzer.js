/**
 * @fileoverview Java static complexity analyzer using regex/heuristic approach.
 *
 * DESIGN DECISION: Java AST parsing in Node.js via `java-parser` is possible
 * but adds ~2MB dependency and is slow for large files. Since our primary
 * accuracy comes from the benchmark engine, we use a fast heuristic approach
 * for the static analysis layer that handles 90%+ of competitive programming
 * patterns correctly.
 *
 * Java-specific features detected:
 * - Enhanced for loops (`for (Type x : collection)`)
 * - Stream API operations (.stream(), .map(), .filter())
 * - Collections framework usage (ArrayList, HashMap, TreeMap, PriorityQueue)
 * - Arrays.sort(), Collections.sort()
 * - Recursive method detection within class scope
 * - Generic type usage for space analysis
 */

import { ComplexityClass, COMPLEXITY_ORDER } from '../types.js';
import { detectPatterns } from './patterns.js';

// ============================================================
// Java-Specific Analysis
// ============================================================

/**
 * Analyze loops in Java code using brace-counting for depth tracking.
 *
 * @param {string} code
 * @returns {{loops: import('../types.js').LoopInfo[], maxDepth: number}}
 */
function analyzeLoops(code) {
  const loops = [];
  const lines = code.split('\n');
  let currentLoopDepth = 0;
  let maxDepth = 0;

  // Track brace depth relative to loop openings
  const loopBraceStack = []; // Stack of brace depths where loops start

  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('//') || line.startsWith('*')) continue;

    // Detect loop keywords
    const isForLoop = /^\s*for\s*\(/.test(lines[i]);
    const isWhileLoop = /^\s*while\s*\(/.test(lines[i]) && !/\bdo\b/.test(lines[i > 0 ? i - 1 : i]);
    const isDoWhile = /^\s*do\s*\{?/.test(lines[i]);
    const isEnhancedFor = /for\s*\(\s*\w+\s+\w+\s*:\s*/.test(lines[i]);

    if (isForLoop || isWhileLoop || isDoWhile) {
      currentLoopDepth++;
      maxDepth = Math.max(maxDepth, currentLoopDepth);
      loopBraceStack.push(braceDepth);

      let isLogarithmic = false;

      if (isForLoop) {
        // Check update expression for logarithmic patterns
        const forContent = lines[i];
        if (/\*=\s*\d+|\/=\s*\d+|>>=\s*\d+|<<=\s*\d+/.test(forContent)) {
          isLogarithmic = true;
        }
        // i = i * 2, i = i / 2
        if (/\w+\s*=\s*\w+\s*[\*/]\s*\d+/.test(forContent.split(';')[2] || '')) {
          isLogarithmic = true;
        }
      }

      if (isWhileLoop) {
        // Look ahead for logarithmic body
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
        type: isDoWhile ? 'do-while' : isEnhancedFor ? 'for-each' : isWhileLoop ? 'while' : 'for',
        isLogarithmic,
        isLinear: !isLogarithmic,
        line: i + 1,
      });
    }

    // Track braces for loop depth management
    for (const char of line) {
      if (char === '{') braceDepth++;
      if (char === '}') {
        braceDepth--;
        // Check if we've exited a loop's scope
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
 * Detect recursion in Java methods.
 *
 * @param {string} code
 * @returns {import('../types.js').RecursionInfo[]}
 */
function analyzeRecursion(code) {
  const recursions = [];

  // Match method declarations: returnType methodName(params) {
  const methodPattern = /(?:public|private|protected|static|\s)*\s+\w+(?:<[^>]+>)?\s+(\w+)\s*\([^)]*\)\s*\{/g;
  let match;

  while ((match = methodPattern.exec(code)) !== null) {
    const methodName = match[1];
    if (['main', 'toString', 'equals', 'hashCode', 'compareTo'].includes(methodName)) continue;

    const methodStart = match.index;
    // Find the method body by counting braces
    let braceCount = 0;
    let bodyStart = -1;
    let bodyEnd = -1;

    for (let i = methodStart; i < code.length; i++) {
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

    // Count recursive calls
    const callPattern = new RegExp(`\\b${methodName}\\s*\\(`, 'g');
    const calls = (body.match(callPattern) || []).length;

    if (calls > 0) {
      // Check for memoization
      const hasMemo = /\bmemo\b|\bcache\b|\bdp\b|\bMap\b.*\bcontainsKey\b/.test(body);

      // Check for tail recursion
      const isTail = new RegExp(`return\\s+${methodName}\\s*\\(`).test(body);

      const lineNum = code.slice(0, methodStart).split('\n').length;

      recursions.push({
        functionName: methodName,
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
 * Detect data structures in Java code.
 *
 * @param {string} code
 * @returns {import('../types.js').DataStructureInfo[]}
 */
function detectDataStructures(code) {
  const structures = [];

  // Collections
  if (/\bArrayList\b|\bLinkedList\b|\bVector\b/.test(code)) {
    structures.push({ type: 'array', spaceImpact: 'O(n)', line: 0 });
  }
  if (/\bHashMap\b|\bTreeMap\b|\bLinkedHashMap\b|\bHashtable\b/.test(code)) {
    structures.push({ type: 'map', spaceImpact: 'O(n)', line: 0 });
  }
  if (/\bHashSet\b|\bTreeSet\b|\bLinkedHashSet\b/.test(code)) {
    structures.push({ type: 'set', spaceImpact: 'O(n)', line: 0 });
  }
  if (/\bPriorityQueue\b|\bQueue\b|\bDeque\b|\bArrayDeque\b/.test(code)) {
    structures.push({ type: 'queue', spaceImpact: 'O(n)', line: 0 });
  }
  if (/\bStack\b/.test(code)) {
    structures.push({ type: 'stack', spaceImpact: 'O(n)', line: 0 });
  }

  // Arrays
  if (/new\s+\w+\s*\[.*\]\s*\[.*\]/.test(code)) {
    structures.push({ type: 'array', spaceImpact: 'O(n²)', line: 0 });
  } else if (/new\s+\w+\s*\[/.test(code)) {
    structures.push({ type: 'array', spaceImpact: 'O(n)', line: 0 });
  }

  // Stream operations (hidden iteration)
  if (/\.stream\s*\(\)/.test(code)) {
    structures.push({ type: 'stream', spaceImpact: 'O(n)', line: 0 });
  }

  return structures;
}

// ============================================================
// Public API
// ============================================================

/**
 * Analyze Java source code for time and space complexity.
 *
 * @param {string} code - Java source code
 * @returns {Promise<import('../types.js').StaticAnalysisResult>}
 */
export async function analyzeJava(code) {
  const warnings = [];

  const { loops, maxDepth } = analyzeLoops(code);
  const hasLogarithmicLoop = loops.some((l) => l.isLogarithmic);
  const recursionInfos = analyzeRecursion(code);
  const dataStructures = detectDataStructures(code);
  const patterns = detectPatterns(code);

  // Detect sorting
  const hasSorting = /Arrays\.sort\b|Collections\.sort\b|\.sort\s*\(/.test(code);

  // ---- Time Complexity Estimation ----
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

  // Stream operations add hidden O(n)
  if (/\.stream\s*\(\)/.test(code) && timeComplexity === ComplexityClass.O_1) {
    timeComplexity = ComplexityClass.O_N;
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
    hasBinarySearch: /\bArrays\.binarySearch\b/.test(code) || patterns.some((p) => p.pattern === 'binary-search') ? 1 : 0,
    hasTwoPointers: patterns.some((p) => p.pattern === 'two-pointers') ? 1 : 0,
    hasSlidingWindow: patterns.some((p) => p.pattern === 'sliding-window') ? 1 : 0,
    hasDivideAndConquer: patterns.some((p) => p.pattern === 'divide-and-conquer') ? 1 : 0,
    codeLineCount: code.split('\n').filter((l) => l.trim() && !l.trim().startsWith('//')).length,
    functionCount: (code.match(/\b(public|private|protected|static)\b.*\w+\s*\(/g) || []).length,
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
