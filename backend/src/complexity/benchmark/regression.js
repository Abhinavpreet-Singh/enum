/**
 * @fileoverview Regression analysis for complexity curve fitting.
 *
 * DESIGN DECISION: Pure JavaScript implementation with no external dependencies.
 * Uses ordinary least squares (OLS) regression against linearized complexity models.
 * Each complexity class is represented as y = a*f(n) + b where f(n) is the
 * transformation function, and we find the best fit using R² goodness-of-fit.
 *
 * Mathematical approach:
 * - For each model, transform x = f(n), then fit y = a*x + b using OLS.
 * - R² = 1 - SS_res / SS_tot measures how well the model explains variance.
 * - The model with highest R² is selected as the best fit.
 *
 * Edge cases handled:
 * - Insufficient data points (< 3)
 * - Constant time functions
 * - Exploding values (2^n overflow protection)
 * - Noisy data (warm-up removal, outlier filtering)
 */

import { ComplexityClass } from '../types.js';

// ============================================================
// Transformation Functions
// ============================================================

/**
 * Maps each complexity class to its transformation function f(n).
 * For model y = a*f(n) + b, we transform x_i = f(n_i) and fit linearly.
 */
const COMPLEXITY_MODELS = {
  [ComplexityClass.O_1]: {
    transform: (_n) => 1,
    label: 'O(1)',
  },
  [ComplexityClass.O_LOG_N]: {
    transform: (n) => Math.log2(Math.max(n, 1)),
    label: 'O(log n)',
  },
  [ComplexityClass.O_N]: {
    transform: (n) => n,
    label: 'O(n)',
  },
  [ComplexityClass.O_N_LOG_N]: {
    transform: (n) => n * Math.log2(Math.max(n, 1)),
    label: 'O(n log n)',
  },
  [ComplexityClass.O_N_SQUARED]: {
    transform: (n) => n * n,
    label: 'O(n²)',
  },
  [ComplexityClass.O_N_CUBED]: {
    transform: (n) => n * n * n,
    label: 'O(n³)',
  },
  [ComplexityClass.O_TWO_N]: {
    // Clamp to prevent Infinity; if n > 30, 2^n is astronomical
    transform: (n) => (n > 30 ? Number.MAX_SAFE_INTEGER : Math.pow(2, n)),
    label: 'O(2^n)',
  },
};

// ============================================================
// Core Regression
// ============================================================

/**
 * Perform ordinary least squares linear regression: y = a*x + b.
 *
 * @param {number[]} x - Independent variable values
 * @param {number[]} y - Dependent variable values (observed)
 * @returns {{a: number, b: number, rSquared: number}} Fitted parameters and R²
 */
function linearRegression(x, y) {
  const n = x.length;
  if (n < 2) return { a: 0, b: 0, rSquared: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
  }

  const denominator = n * sumX2 - sumX * sumX;

  // If all x values are the same, the fit is degenerate
  if (Math.abs(denominator) < 1e-12) {
    const meanY = sumY / n;
    return { a: 0, b: meanY, rSquared: 0 };
  }

  const a = (n * sumXY - sumX * sumY) / denominator;
  const b = (sumY - a * sumX) / n;

  // Compute R² = 1 - SS_res / SS_tot
  const meanY = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    const predicted = a * x[i] + b;
    ssRes += (y[i] - predicted) ** 2;
    ssTot += (y[i] - meanY) ** 2;
  }

  // If data is constant (ssTot ≈ 0), R² is undefined; treat as perfect fit for O(1)
  const rSquared = ssTot < 1e-12 ? 1 : Math.max(0, 1 - ssRes / ssTot);

  return { a, b, rSquared };
}

// ============================================================
// Data Preprocessing
// ============================================================

/**
 * Remove the first data point (warm-up) and filter outliers using IQR method.
 *
 * @param {Array<{inputSize: number, executionTimeMs: number}>} dataPoints
 * @returns {Array<{inputSize: number, executionTimeMs: number}>}
 */
function preprocessData(dataPoints) {
  if (dataPoints.length <= 3) return dataPoints;

  // Remove first data point (JIT warm-up / cold cache effect)
  let cleaned = dataPoints.slice(1);

  // Remove timed-out data points
  cleaned = cleaned.filter((dp) => !dp.timedOut && isFinite(dp.executionTimeMs));

  if (cleaned.length < 3) return cleaned;

  // IQR-based outlier removal on execution times
  const times = cleaned.map((dp) => dp.executionTimeMs).sort((a, b) => a - b);
  const q1 = times[Math.floor(times.length * 0.25)];
  const q3 = times[Math.floor(times.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 3 * iqr; // More lenient upper bound (expect growth)

  return cleaned.filter(
    (dp) => dp.executionTimeMs >= lowerBound && dp.executionTimeMs <= upperBound
  );
}

// ============================================================
// Public API
// ============================================================

/**
 * Fit benchmark data to complexity models and determine the best fit.
 *
 * @param {Array<{inputSize: number, executionTimeMs: number, memoryUsageBytes?: number, timedOut?: boolean}>} rawDataPoints
 * @returns {import('../types.js').RegressionResult}
 */
export function fitComplexityCurve(rawDataPoints) {
  const dataPoints = preprocessData(rawDataPoints);

  if (dataPoints.length < 3) {
    return {
      bestFit: ComplexityClass.UNKNOWN,
      rSquared: 0,
      allFits: {},
      coefficients: [0, 0],
      warning: 'Insufficient data points for reliable regression (need ≥ 3)',
    };
  }

  const n = dataPoints.map((dp) => dp.inputSize);
  const y = dataPoints.map((dp) => dp.executionTimeMs);

  // Special case: if all times are roughly constant, it's O(1)
  const meanY = y.reduce((a, b) => a + b, 0) / y.length;
  const maxDeviation = Math.max(...y.map((v) => Math.abs(v - meanY)));
  if (maxDeviation < meanY * 0.15 && meanY > 0) {
    return {
      bestFit: ComplexityClass.O_1,
      rSquared: 0.95,
      allFits: { [ComplexityClass.O_1]: 0.95 },
      coefficients: [0, meanY],
      warning: null,
    };
  }

  /** @type {Object.<string, number>} */
  const allFits = {};
  let bestFit = ComplexityClass.UNKNOWN;
  let bestR2 = -Infinity;
  let bestCoeffs = [0, 0];

  for (const [complexityClass, model] of Object.entries(COMPLEXITY_MODELS)) {
    // Transform input sizes using the model's function
    const x = n.map(model.transform);

    // Skip models that produce Infinity or NaN
    if (x.some((v) => !isFinite(v))) {
      allFits[complexityClass] = -1;
      continue;
    }

    const { a, b, rSquared } = linearRegression(x, y);
    allFits[complexityClass] = Math.round(rSquared * 10000) / 10000;

    // Only consider models with positive slope (time should increase with input)
    // Exception: O(1) where slope should be ~0
    if (complexityClass === ComplexityClass.O_1 || a >= -1e-6) {
      if (rSquared > bestR2) {
        bestR2 = rSquared;
        bestFit = complexityClass;
        bestCoeffs = [a, b];
      }
    }
  }

  // Apply Occam's razor: if two models are very close in R², prefer the simpler one
  const SIMPLICITY_PENALTY = 0.02; // 2% penalty per complexity level
  const orderedClasses = Object.keys(COMPLEXITY_MODELS);

  for (const cls of orderedClasses) {
    if (allFits[cls] === undefined || allFits[cls] < 0) continue;
    const simplicity = orderedClasses.indexOf(cls);
    const bestSimplicity = orderedClasses.indexOf(bestFit);

    // If a simpler model is within penalty threshold, prefer it
    if (simplicity < bestSimplicity) {
      const adjusted = allFits[cls] + SIMPLICITY_PENALTY * (bestSimplicity - simplicity);
      if (adjusted >= bestR2) {
        bestFit = cls;
        bestR2 = allFits[cls];
      }
    }
  }

  return {
    bestFit,
    rSquared: Math.round(bestR2 * 10000) / 10000,
    allFits,
    coefficients: bestCoeffs,
    warning: bestR2 < 0.7 ? 'Low R² — results may be unreliable due to noisy data' : null,
  };
}

/**
 * Fit memory data to complexity models.
 * Same approach as time regression but on memory data points.
 *
 * @param {Array<{inputSize: number, memoryUsageBytes: number}>} rawDataPoints
 * @returns {import('../types.js').RegressionResult}
 */
export function fitMemoryCurve(rawDataPoints) {
  // Filter out zero/negative memory readings
  const valid = rawDataPoints.filter(
    (dp) => dp.memoryUsageBytes > 0 && isFinite(dp.memoryUsageBytes)
  );

  if (valid.length < 3) {
    return {
      bestFit: ComplexityClass.UNKNOWN,
      rSquared: 0,
      allFits: {},
      coefficients: [0, 0],
      warning: 'Insufficient memory data points',
    };
  }

  // Reuse time regression by remapping memory to executionTimeMs field
  const remapped = valid.map((dp) => ({
    inputSize: dp.inputSize,
    executionTimeMs: dp.memoryUsageBytes,
  }));

  return fitComplexityCurve(remapped);
}

/**
 * Generate chart-friendly data for complexity growth visualization.
 * Returns predicted values for each complexity model alongside actual data.
 *
 * @param {Array<{inputSize: number, executionTimeMs: number}>} dataPoints - Actual measurements
 * @returns {Object} Chart data with actual and predicted series
 */
export function generateChartData(dataPoints) {
  const actual = dataPoints.map((dp) => ({
    n: dp.inputSize,
    time: dp.executionTimeMs,
  }));

  const maxN = Math.max(...dataPoints.map((dp) => dp.inputSize));
  const chartPoints = [];
  for (let n = 1; n <= maxN; n = Math.ceil(n * 1.5)) {
    chartPoints.push(n);
  }

  const predicted = {};
  for (const [cls, model] of Object.entries(COMPLEXITY_MODELS)) {
    if (cls === ComplexityClass.O_TWO_N) continue; // Skip exponential for chart (too large)

    const x = dataPoints.map((dp) => model.transform(dp.inputSize));
    const y = dataPoints.map((dp) => dp.executionTimeMs);
    const { a, b } = linearRegression(x, y);

    predicted[cls] = chartPoints.map((n) => ({
      n,
      time: Math.max(0, a * model.transform(n) + b),
    }));
  }

  return { actual, predicted, chartPoints };
}
