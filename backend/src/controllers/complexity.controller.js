/**
 * @fileoverview Controller for the Complexity Analyzer API.
 *
 * Endpoints:
 * - POST /analyze — Run full complexity analysis
 * - GET /job/:jobId — Check async job status
 * - GET /health — Check analyzer subsystem health
 * - GET /ml/stats — Get ML classifier statistics
 *
 * DESIGN DECISIONS:
 * - Synchronous by default (simpler client integration).
 * - If Redis/Bull queues are available, supports async mode via job IDs.
 * - Rate limiting per user (10 requests/minute via Redis).
 * - Input validation before any processing.
 * - Comprehensive error handling with meaningful error messages.
 */

import { analyzeComplexity } from '../complexity/index.js';
import { checkRateLimit } from '../complexity/cache/redis.js';
import { getQueueMetrics, isQueueAvailable, getJobStatus } from '../complexity/cache/queue.js';
import { getTrainingDataSize, evaluateModel, exportTrainingDataCSV } from '../complexity/ml/classifier.js';
import { isDockerAvailable } from '../complexity/benchmark/runner.js';
import { isLanguageSupported } from '../complexity/analyzer/index.js';
import { AnalysisMode, Language } from '../complexity/types.js';

// ============================================================
// Input Validation
// ============================================================

const MAX_CODE_LENGTH = 50_000; // 50KB max code size
const SUPPORTED_LANGUAGES = Object.values(Language);
const VALID_MODES = Object.values(AnalysisMode);

/**
 * Validate the analysis request body.
 *
 * @param {Object} body - Request body
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateRequest(body) {
  const errors = [];

  if (!body.code || typeof body.code !== 'string') {
    errors.push('`code` is required and must be a string');
  } else if (body.code.length > MAX_CODE_LENGTH) {
    errors.push(`Code exceeds maximum length of ${MAX_CODE_LENGTH} characters`);
  } else if (body.code.trim().length === 0) {
    errors.push('Code cannot be empty');
  }

  if (!body.language || typeof body.language !== 'string') {
    errors.push('`language` is required');
  } else if (!SUPPORTED_LANGUAGES.includes(body.language.toLowerCase()) && body.language !== 'node' && body.language !== 'c') {
    errors.push(`Unsupported language: ${body.language}. Supported: ${SUPPORTED_LANGUAGES.join(', ')}`);
  }

  if (body.mode && !VALID_MODES.includes(body.mode)) {
    errors.push(`Invalid mode: ${body.mode}. Valid: ${VALID_MODES.join(', ')}`);
  }

  if (body.mode !== AnalysisMode.STATIC_ONLY && !body.functionName) {
    // functionName is required for benchmark mode
    // Try to auto-detect it
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Try to auto-detect the main function name from code.
 *
 * @param {string} code
 * @param {string} language
 * @returns {string | null}
 */
function autoDetectFunctionName(code, language) {
  const lang = language.toLowerCase();

  if (lang === 'javascript' || lang === 'node') {
    const match = code.match(/(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:function|\([^)]*\)\s*=>))/);
    return match ? (match[1] || match[2]) : null;
  }

  if (lang === 'python') {
    const match = code.match(/def\s+(\w+)\s*\(/);
    return match ? match[1] : null;
  }

  if (lang === 'java') {
    const methods = [...code.matchAll(/(?:public|private|static)\s+\w+\s+(\w+)\s*\(/g)];
    const nonMain = methods.find((m) => m[1] !== 'main');
    return nonMain ? nonMain[1] : (methods[0] ? methods[0][1] : null);
  }

  if (lang === 'cpp' || lang === 'c') {
    const match = code.match(/(?:int|void|bool|long|double|vector|string|auto)\s+(\w+)\s*\(/);
    if (match && match[1] !== 'main') return match[1];
    return null;
  }

  return null;
}

// ============================================================
// Controllers
// ============================================================

/**
 * POST /api/v1/complexity/analyze
 */
export const analyzeCodeComplexity = async (req, res) => {
  try {
    const { valid, errors } = validateRequest(req.body);
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    const { code, language, questionId, mode = AnalysisMode.FULL } = req.body;
    let { functionName } = req.body;
    const userId = req.user?.id || req.body.userId || 'anonymous';

    const rateLimit = await checkRateLimit(userId);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        message: `Rate limit exceeded. Try again in ${rateLimit.resetIn} seconds.`,
        remaining: rateLimit.remaining,
        resetIn: rateLimit.resetIn,
      });
    }

    if (!functionName) {
      functionName = autoDetectFunctionName(code, language);
    }

    let effectiveMode = mode;
    if (!functionName && mode !== AnalysisMode.STATIC_ONLY) {
      effectiveMode = AnalysisMode.STATIC_ONLY;
    }

    const result = await analyzeComplexity({
      code,
      language: language.toLowerCase(),
      functionName,
      questionId,
      mode: effectiveMode,
      userId,
    });

    res.set({
      'X-RateLimit-Remaining': rateLimit.remaining,
      'X-RateLimit-Reset': rateLimit.resetIn,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('[Complexity Controller] Analysis error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal error during complexity analysis',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

/**
 * GET /api/v1/complexity/job/:queueType/:jobId
 */
export const checkJobStatus = async (req, res) => {
  try {
    const { queueType, jobId } = req.params;

    if (!['static', 'benchmark'].includes(queueType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid queue type. Use "static" or "benchmark".',
      });
    }

    const status = await getJobStatus(queueType, jobId);

    if (!status) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: status,
    });
  } catch (err) {
    console.error('[Complexity Controller] Job status error:', err);
    return res.status(500).json({
      success: false,
      message: 'Error checking job status',
    });
  }
};

/**
 * GET /api/v1/complexity/health
 */
export const getAnalyzerHealth = async (req, res) => {
  try {
    const [dockerReady, queueMetrics] = await Promise.all([
      isDockerAvailable(),
      getQueueMetrics(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        status: 'operational',
        docker: {
          available: dockerReady,
        },
        queues: queueMetrics,
        ml: {
          trainingSamples: getTrainingDataSize(),
          classifierActive: getTrainingDataSize() >= 10,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: true,
      data: {
        status: 'degraded',
        error: err.message,
      },
    });
  }
};

/**
 * GET /api/v1/complexity/ml/stats
 */
export const getMLStats = async (req, res) => {
  try {
    const evaluation = evaluateModel();

    return res.status(200).json({
      success: true,
      data: {
        trainingSamples: getTrainingDataSize(),
        classifierActive: getTrainingDataSize() >= 10,
        evaluation,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Error getting ML stats',
    });
  }
};

/**
 * GET /api/v1/complexity/ml/export
 */
export const exportMLData = async (req, res) => {
  try {
    const csv = exportTrainingDataCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=complexity_training_data.csv');
    return res.send(csv);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Error exporting ML data',
    });
  }
};
