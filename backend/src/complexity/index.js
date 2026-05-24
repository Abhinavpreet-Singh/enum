/**
 * @fileoverview Main orchestrator for the Complexity Analyzer system.
 *
 * This is the primary entry point that coordinates:
 * 1. Cache lookup (Redis)
 * 2. Static analysis (AST/heuristic)
 * 3. Runtime benchmarking (Docker sandbox)
 * 4. Hybrid estimation (combining static + runtime)
 * 5. AI explanation generation
 * 6. ML feature extraction and storage
 * 7. Cache storage
 *
 * Supports three modes:
 * - 'full': Static + Runtime + Explanation (default)
 * - 'static-only': Static + Explanation (fast, no Docker)
 * - 'benchmark-only': Runtime + Explanation (needs Docker)
 */

import { createHash } from 'crypto';
import { estimateComplexity } from './estimator/index.js';
import { generateExplanation } from './explanation/index.js';
import { extractFeatureVector, createTrainingSample } from './ml/feature-extractor.js';
import { classifyComplexity, addTrainingSample } from './ml/classifier.js';
import { getCachedResult, setCachedResult, pushMLTrainingData } from './cache/redis.js';
import { AnalysisMode, COMPLEXITY_ORDER } from './types.js';

/**
 * Run the complete complexity analysis pipeline.
 *
 * @param {import('./types.js').AnalysisRequest} request
 * @returns {Promise<import('./types.js').ComplexityAnalysisResponse>}
 */
export async function analyzeComplexity(request) {
  const startTime = performance.now();
  const { code, language, functionName, questionId, mode = AnalysisMode.FULL, userId } = request;

  // ---- Step 1: Check Cache ----
  const cached = await getCachedResult(code, language);
  if (cached) {
    return {
      ...cached,
      _fromCache: true,
      analysisTimeMs: Math.round(performance.now() - startTime),
    };
  }

  // ---- Step 2: Run Hybrid Estimator ----
  const hybridResult = await estimateComplexity({
    code,
    language,
    functionName,
    mode,
  });

  // ---- Step 3: ML Classification (supplementary signal) ----
  let mlPrediction = null;
  if (hybridResult.staticAnalysis) {
    const featureVector = extractFeatureVector(hybridResult.staticAnalysis);
    mlPrediction = classifyComplexity(featureVector);

    // If ML has high confidence and agrees with static, boost overall confidence
    if (mlPrediction && mlPrediction.confidence >= 0.8) {
      if (mlPrediction.prediction === hybridResult.timeComplexity) {
        hybridResult.confidence = Math.min(1, hybridResult.confidence + 0.05);
      }
    }
  }

  // ---- Step 4: Generate Explanation ----
  // TODO: If questionId is provided, look up the optimal complexity from the DB
  let optimalComplexity = null;
  // if (questionId) {
  //   const question = await Question.findById(questionId);
  //   if (question && question.optimalComplexity) {
  //     optimalComplexity = question.optimalComplexity;
  //   }
  // }

  const explanation = generateExplanation({
    hybridResult,
    optimalComplexity,
    constraintN: null,
  });

  // ---- Step 5: Build Response ----
  const analysisId = createHash('md5')
    .update(`${Date.now()}:${code.slice(0, 100)}`)
    .digest('hex')
    .slice(0, 16);

  const response = {
    analysisId,
    timeComplexity: hybridResult.timeComplexity,
    spaceComplexity: hybridResult.spaceComplexity,
    confidence: hybridResult.confidence,
    staticAnalysis: hybridResult.staticAnalysis,
    runtimeAnalysis: hybridResult.runtimeAnalysis,
    explanation,
    mlPrediction,
    agreementStatus: hybridResult.agreementStatus,
    analysisTimeMs: Math.round(performance.now() - startTime),
  };

  // ---- Step 6: Cache Result ----
  await setCachedResult(code, language, response);

  // ---- Step 7: Store ML Training Data (async, non-blocking) ----
  storeMLData(hybridResult, language, userId).catch((err) => {
    console.warn('[Orchestrator] ML data storage error (non-critical):', err.message);
  });

  return response;
}

/**
 * Store analysis result as ML training data if confidence is high enough.
 * This runs asynchronously and does not block the response.
 *
 * @param {import('./types.js').HybridAnalysisResult} hybridResult
 * @param {string} language
 * @param {string} [userId]
 */
async function storeMLData(hybridResult, language, userId) {
  // Only store high-confidence results as training data
  if (hybridResult.confidence < 0.7) return;
  if (hybridResult.agreementStatus === 'disagree') return;
  if (!hybridResult.staticAnalysis) return;

  const featureVector = extractFeatureVector(hybridResult.staticAnalysis);
  const label = COMPLEXITY_ORDER.indexOf(hybridResult.timeComplexity);

  if (label === -1) return;

  // Add to in-memory classifier
  addTrainingSample(featureVector, label);

  // Push to Redis queue for batch processing into MongoDB
  await pushMLTrainingData({
    features: featureVector,
    label,
    labelString: hybridResult.timeComplexity,
    language,
    timestamp: Date.now(),
    metadata: {
      staticConfidence: hybridResult.staticAnalysis.confidence,
      runtimeRSquared: hybridResult.runtimeAnalysis?.timeRegression?.rSquared || null,
      agreementStatus: hybridResult.agreementStatus,
    },
  });
}

// Re-export for convenience
export { initRedis, closeRedis } from './cache/redis.js';
export { initQueues, closeQueues, getQueueMetrics } from './cache/queue.js';
