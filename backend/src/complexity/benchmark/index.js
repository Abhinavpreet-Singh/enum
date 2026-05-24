/**
 * @fileoverview Benchmark engine orchestrator — coordinates Docker execution,
 * regression analysis, and memory profiling.
 *
 * Flow:
 * 1. Receive user code + language + function name
 * 2. Check if Docker is available (graceful fallback if not)
 * 3. Run benchmark across multiple input sizes
 * 4. Apply regression analysis to timing data
 * 5. Apply regression analysis to memory data
 * 6. Return structured RuntimeAnalysisResult
 */

import { runBenchmark, isDockerAvailable } from './runner.js';
import { fitComplexityCurve, fitMemoryCurve, generateChartData } from './regression.js';
import { ComplexityClass } from '../types.js';

/**
 * Run the complete benchmark engine pipeline.
 *
 * @param {Object} params
 * @param {string} params.code - User source code
 * @param {string} params.language - Programming language
 * @param {string} params.functionName - Entry function to benchmark
 * @param {boolean} [params.skipDockerCheck=false] - Skip Docker availability check
 * @param {import('../types.js').StaticAnalysisResult} [params.staticResult] - Static analysis result (to choose safe input sizes)
 * @returns {Promise<import('../types.js').RuntimeAnalysisResult>}
 */
export async function runBenchmarkEngine({
  code,
  language,
  functionName,
  skipDockerCheck = false,
  staticResult = null,
}) {
  const warnings = [];
  const startTime = performance.now();

  // Check Docker availability
  if (!skipDockerCheck) {
    const dockerReady = await isDockerAvailable();
    if (!dockerReady) {
      return {
        timeComplexity: ComplexityClass.UNKNOWN,
        spaceComplexity: ComplexityClass.UNKNOWN,
        confidence: 0,
        dataPoints: [],
        timeRegression: { bestFit: ComplexityClass.UNKNOWN, rSquared: 0, allFits: {}, coefficients: [0, 0] },
        spaceRegression: { bestFit: ComplexityClass.UNKNOWN, rSquared: 0, allFits: {}, coefficients: [0, 0] },
        maxInputSize: 0,
        hitTimeout: false,
        chartData: null,
        warnings: ['Docker is not available — benchmark skipped'],
        analysisTimeMs: Math.round(performance.now() - startTime),
      };
    }
  }

  // Determine if we should use reduced input sizes
  // (if static analysis detected exponential complexity)
  const useExponentialSafeSizes = staticResult &&
    (staticResult.timeComplexity === ComplexityClass.O_TWO_N ||
     staticResult.timeComplexity === ComplexityClass.O_N_FACTORIAL);

  // Run benchmark
  let dataPoints;
  try {
    dataPoints = await runBenchmark({
      code,
      language,
      functionName,
      useExponentialSafeSizes,
    });
  } catch (err) {
    warnings.push(`Benchmark execution error: ${err.message}`);
    return {
      timeComplexity: ComplexityClass.UNKNOWN,
      spaceComplexity: ComplexityClass.UNKNOWN,
      confidence: 0,
      dataPoints: [],
      timeRegression: { bestFit: ComplexityClass.UNKNOWN, rSquared: 0, allFits: {}, coefficients: [0, 0] },
      spaceRegression: { bestFit: ComplexityClass.UNKNOWN, rSquared: 0, allFits: {}, coefficients: [0, 0] },
      maxInputSize: 0,
      hitTimeout: false,
      chartData: null,
      warnings,
      analysisTimeMs: Math.round(performance.now() - startTime),
    };
  }

  // Filter out failed data points for regression
  const validDataPoints = dataPoints.filter(
    (dp) => dp.executionTimeMs > 0 && !dp.timedOut && !dp.error
  );
  const hitTimeout = dataPoints.some((dp) => dp.timedOut);

  if (hitTimeout) {
    warnings.push('Some input sizes caused timeout — results may be incomplete');
  }

  // Run regression analysis on timing data
  const timeRegression = fitComplexityCurve(validDataPoints);
  if (timeRegression.warning) {
    warnings.push(timeRegression.warning);
  }

  // Run regression on memory data
  const memoryDataPoints = validDataPoints
    .filter((dp) => dp.memoryUsageBytes > 0)
    .map((dp) => ({ inputSize: dp.inputSize, memoryUsageBytes: dp.memoryUsageBytes }));

  const spaceRegression = fitMemoryCurve(memoryDataPoints);

  // Compute confidence based on regression quality and data sufficiency
  let confidence = 0;
  if (validDataPoints.length >= 5) {
    confidence = timeRegression.rSquared * 0.8 + 0.2; // Base 0.2 + up to 0.8 from R²
  } else if (validDataPoints.length >= 3) {
    confidence = timeRegression.rSquared * 0.6 + 0.1;
  }

  // Generate chart data for visualization
  const chartData = validDataPoints.length >= 3
    ? generateChartData(validDataPoints)
    : null;

  const maxInputSize = validDataPoints.length > 0
    ? Math.max(...validDataPoints.map((dp) => dp.inputSize))
    : 0;

  return {
    timeComplexity: timeRegression.bestFit,
    spaceComplexity: spaceRegression.bestFit || ComplexityClass.UNKNOWN,
    confidence: Math.round(confidence * 100) / 100,
    dataPoints,
    timeRegression,
    spaceRegression,
    maxInputSize,
    hitTimeout,
    chartData,
    warnings,
    analysisTimeMs: Math.round(performance.now() - startTime),
  };
}
