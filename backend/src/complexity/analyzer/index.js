/**
 * @fileoverview Static analyzer orchestrator — routes to the correct
 * language-specific analyzer and normalizes the output.
 */

import { Language } from '../types.js';
import { analyzeJavaScript } from './javascript.analyzer.js';
import { analyzePython } from './python.analyzer.js';
import { analyzeJava } from './java.analyzer.js';
import { analyzeCpp } from './cpp.analyzer.js';

/**
 * Language → analyzer function mapping.
 * @type {Object.<string, function(string): Promise<import('../types.js').StaticAnalysisResult>>}
 */
const ANALYZERS = {
  [Language.JAVASCRIPT]: analyzeJavaScript,
  node: analyzeJavaScript,
  [Language.PYTHON]: analyzePython,
  [Language.JAVA]: analyzeJava,
  [Language.CPP]: analyzeCpp,
  [Language.C]: analyzeCpp,
};

/**
 * Run static analysis on source code for the given language.
 *
 * @param {string} code - Source code
 * @param {string} language - Programming language
 * @returns {Promise<import('../types.js').StaticAnalysisResult>}
 * @throws {Error} If the language is not supported
 */
export async function runStaticAnalysis(code, language) {
  const analyzer = ANALYZERS[language.toLowerCase()];

  if (!analyzer) {
    throw new Error(
      `Unsupported language for static analysis: ${language}. ` +
      `Supported: ${Object.keys(ANALYZERS).join(', ')}`
    );
  }

  const startTime = performance.now();

  try {
    const result = await analyzer(code);
    result.analysisTimeMs = Math.round(performance.now() - startTime);
    return result;
  } catch (err) {
    // Graceful degradation — return partial result on analyzer failure
    console.error(`[Static Analyzer] Error for ${language}:`, err.message);

    return {
      timeComplexity: 'Unknown',
      spaceComplexity: 'Unknown',
      confidence: 0,
      loops: [],
      recursion: [],
      dataStructures: [],
      patterns: [],
      maxLoopDepth: 0,
      hasLogarithmicLoop: false,
      hasSorting: false,
      mlFeatures: {},
      warnings: [`Analyzer error: ${err.message}`],
      analysisTimeMs: Math.round(performance.now() - startTime),
    };
  }
}

/**
 * Check if a language is supported for static analysis.
 *
 * @param {string} language
 * @returns {boolean}
 */
export function isLanguageSupported(language) {
  return !!ANALYZERS[language.toLowerCase()];
}
