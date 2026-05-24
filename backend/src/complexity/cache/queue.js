/**
 * @fileoverview Job queue for async complexity analysis using Bull.
 *
 * DESIGN DECISIONS:
 * - Bull (backed by Redis) for reliable job processing with retries.
 * - Separate queues for static analysis (fast, high-priority) and
 *   benchmarks (slow, normal-priority) to prevent head-of-line blocking.
 * - Configurable concurrency per worker to utilize multi-core CPUs.
 * - Job results are stored in Redis for retrieval by polling or webhooks.
 * - Graceful degradation: if Redis/Bull unavailable, run analysis inline.
 */

/** @type {import('bull') | null} */
let Queue = null;

/** @type {import('bull').Queue | null} */
let staticQueue = null;

/** @type {import('bull').Queue | null} */
let benchmarkQueue = null;

/** @type {boolean} */
let queuesInitialized = false;

// ============================================================
// Configuration
// ============================================================

const STATIC_QUEUE_NAME = 'complexity:static';
const BENCHMARK_QUEUE_NAME = 'complexity:benchmark';

const DEFAULT_QUEUE_OPTIONS = {
  defaultJobOptions: {
    removeOnComplete: 100,  // Keep last 100 completed jobs for debugging
    removeOnFail: 50,       // Keep last 50 failed jobs
    attempts: 2,            // Retry once on failure
    backoff: { type: 'exponential', delay: 1000 },
    timeout: 30000,         // 30s job timeout for static, overridden for benchmark
  },
  settings: {
    stalledInterval: 30000, // Check for stalled jobs every 30s
    maxStalledCount: 2,     // Allow 2 stalls before failing
  },
};

// ============================================================
// Initialization
// ============================================================

/**
 * Initialize Bull job queues. Call once at app startup.
 *
 * @param {string} [redisUrl] - Redis URL. Defaults to env var.
 * @returns {Promise<boolean>} Whether queues were initialized successfully
 */
export async function initQueues(redisUrl) {
  const url = redisUrl || process.env.REDIS_URL || 'redis://127.0.0.1:6379';

  try {
    const BullModule = await import('bull');
    Queue = BullModule.default;

    staticQueue = new Queue(STATIC_QUEUE_NAME, url, {
      ...DEFAULT_QUEUE_OPTIONS,
    });

    benchmarkQueue = new Queue(BENCHMARK_QUEUE_NAME, url, {
      ...DEFAULT_QUEUE_OPTIONS,
      defaultJobOptions: {
        ...DEFAULT_QUEUE_OPTIONS.defaultJobOptions,
        timeout: 120000, // 2 minute timeout for benchmarks (many Docker runs)
      },
    });

    // Global error handlers
    staticQueue.on('error', (err) => {
      console.error('[Queue:static] Error:', err.message);
    });

    benchmarkQueue.on('error', (err) => {
      console.error('[Queue:benchmark] Error:', err.message);
    });

    // Logging
    staticQueue.on('completed', (job) => {
      console.log(`[Queue:static] Job ${job.id} completed`);
    });

    benchmarkQueue.on('completed', (job) => {
      console.log(`[Queue:benchmark] Job ${job.id} completed`);
    });

    queuesInitialized = true;
    console.log('[Complexity Queue] Bull queues initialized');
    return true;
  } catch (err) {
    console.warn('[Complexity Queue] Bull unavailable, will run inline:', err.message);
    queuesInitialized = false;
    return false;
  }
}

// ============================================================
// Job Submission
// ============================================================

/**
 * Enqueue a static analysis job.
 *
 * @param {import('../types.js').AnalysisRequest} request
 * @returns {Promise<{jobId: string} | null>} Job ID for polling, or null if queues unavailable
 */
export async function enqueueStaticAnalysis(request) {
  if (!queuesInitialized || !staticQueue) return null;

  try {
    const job = await staticQueue.add('analyze-static', request, {
      priority: 1, // High priority
    });
    return { jobId: job.id.toString() };
  } catch (err) {
    console.warn('[Queue] Failed to enqueue static analysis:', err.message);
    return null;
  }
}

/**
 * Enqueue a benchmark analysis job.
 *
 * @param {import('../types.js').AnalysisRequest} request
 * @returns {Promise<{jobId: string} | null>}
 */
export async function enqueueBenchmarkAnalysis(request) {
  if (!queuesInitialized || !benchmarkQueue) return null;

  try {
    const job = await benchmarkQueue.add('analyze-benchmark', request, {
      priority: 5, // Normal priority
    });
    return { jobId: job.id.toString() };
  } catch (err) {
    console.warn('[Queue] Failed to enqueue benchmark:', err.message);
    return null;
  }
}

/**
 * Get job status and result.
 *
 * @param {string} queueType - 'static' | 'benchmark'
 * @param {string} jobId - Job ID
 * @returns {Promise<{status: string, result: any} | null>}
 */
export async function getJobStatus(queueType, jobId) {
  const queue = queueType === 'static' ? staticQueue : benchmarkQueue;
  if (!queue) return null;

  try {
    const job = await queue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    return {
      status: state, // 'waiting' | 'active' | 'completed' | 'failed' | 'delayed'
      result: job.returnvalue || null,
      failedReason: job.failedReason || null,
      progress: job.progress() || 0,
    };
  } catch (err) {
    console.warn('[Queue] Job status error:', err.message);
    return null;
  }
}

// ============================================================
// Worker Registration
// ============================================================

/**
 * Register a processor function for static analysis jobs.
 * Called once during server startup to start processing.
 *
 * @param {function} processorFn - Async function that processes the analysis
 * @param {number} [concurrency=4] - Number of concurrent workers
 */
export function registerStaticWorker(processorFn, concurrency = 4) {
  if (!staticQueue) {
    console.warn('[Queue] Cannot register static worker: queue not initialized');
    return;
  }

  staticQueue.process('analyze-static', concurrency, async (job) => {
    try {
      job.progress(10);
      const result = await processorFn(job.data);
      job.progress(100);
      return result;
    } catch (err) {
      console.error('[Queue:static] Worker error:', err.message);
      throw err;
    }
  });

  console.log(`[Queue] Static analysis worker registered (concurrency: ${concurrency})`);
}

/**
 * Register a processor function for benchmark jobs.
 *
 * @param {function} processorFn - Async function that processes the benchmark
 * @param {number} [concurrency=2] - Concurrency (lower for Docker-intensive work)
 */
export function registerBenchmarkWorker(processorFn, concurrency = 2) {
  if (!benchmarkQueue) {
    console.warn('[Queue] Cannot register benchmark worker: queue not initialized');
    return;
  }

  benchmarkQueue.process('analyze-benchmark', concurrency, async (job) => {
    try {
      job.progress(5);
      const result = await processorFn(job.data);
      job.progress(100);
      return result;
    } catch (err) {
      console.error('[Queue:benchmark] Worker error:', err.message);
      throw err;
    }
  });

  console.log(`[Queue] Benchmark worker registered (concurrency: ${concurrency})`);
}

// ============================================================
// Health & Metrics
// ============================================================

/**
 * Get queue health metrics for monitoring.
 *
 * @returns {Promise<Object>}
 */
export async function getQueueMetrics() {
  if (!queuesInitialized) {
    return { available: false };
  }

  try {
    const [staticCounts, benchmarkCounts] = await Promise.all([
      staticQueue.getJobCounts(),
      benchmarkQueue.getJobCounts(),
    ]);

    return {
      available: true,
      static: staticCounts,
      benchmark: benchmarkCounts,
    };
  } catch (err) {
    return { available: false, error: err.message };
  }
}

/**
 * Check if queues are available and ready.
 * @returns {boolean}
 */
export function isQueueAvailable() {
  return queuesInitialized;
}

// ============================================================
// Cleanup
// ============================================================

/**
 * Gracefully close all queues.
 */
export async function closeQueues() {
  const closePromises = [];
  if (staticQueue) closePromises.push(staticQueue.close());
  if (benchmarkQueue) closePromises.push(benchmarkQueue.close());

  try {
    await Promise.all(closePromises);
  } catch {
    // Ignore close errors during shutdown
  }

  staticQueue = null;
  benchmarkQueue = null;
  queuesInitialized = false;
}
