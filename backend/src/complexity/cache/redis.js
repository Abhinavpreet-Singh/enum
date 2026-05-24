/**
 * @fileoverview Redis client and caching layer for complexity analysis.
 *
 * DESIGN DECISIONS:
 * - Uses ioredis for cluster support, Lua scripting, and pipeline support.
 * - Graceful degradation: if Redis is unavailable, caching is skipped (not fatal).
 * - Cache key = SHA256(code + language) for O(1) lookup.
 * - TTL of 1 hour prevents stale results while reducing recomputation.
 * - Separate prefix namespaces prevent key collision with other Redis users.
 */

import { createHash } from 'crypto';

// ============================================================
// Configuration
// ============================================================

const CACHE_PREFIX = 'complexity:';
const CACHE_TTL_SECONDS = 3600; // 1 hour
const ML_DATA_PREFIX = 'ml:complexity:';
const RATE_LIMIT_PREFIX = 'ratelimit:complexity:';
const RATE_LIMIT_WINDOW = 60; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // per minute per user

/** @type {import('ioredis').default | null} */
let redisClient = null;
let isConnected = false;

// ============================================================
// Initialization
// ============================================================

/**
 * Initialize the Redis client. Called once at app startup.
 * If REDIS_URL is not set, caching is disabled gracefully.
 *
 * @param {string} [redisUrl] - Redis connection URL. Defaults to env var.
 * @returns {Promise<import('ioredis').default | null>}
 */
export async function initRedis(redisUrl) {
  const url = redisUrl || process.env.REDIS_URL || 'redis://127.0.0.1:6379';

  try {
    // Dynamic import so the app doesn't crash if ioredis is not installed
    const Redis = (await import('ioredis')).default;

    redisClient = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 5) return null; // Stop retrying after 5 attempts
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
      enableReadyCheck: true,
      connectTimeout: 5000,
    });

    redisClient.on('connect', () => {
      isConnected = true;
      console.log('[Complexity Cache] Redis connected');
    });

    redisClient.on('error', (err) => {
      isConnected = false;
      console.warn('[Complexity Cache] Redis error (non-fatal):', err.message);
    });

    redisClient.on('close', () => {
      isConnected = false;
    });

    await redisClient.connect();
    return redisClient;
  } catch (err) {
    console.warn('[Complexity Cache] Redis unavailable, caching disabled:', err.message);
    redisClient = null;
    isConnected = false;
    return null;
  }
}

/**
 * Get the active Redis client (or null if not connected).
 * @returns {import('ioredis').default | null}
 */
export function getRedisClient() {
  return isConnected ? redisClient : null;
}

// ============================================================
// Cache Key Generation
// ============================================================

/**
 * Generate a deterministic cache key from code + language.
 * Uses SHA-256 to produce a fixed-length key regardless of code size.
 *
 * @param {string} code - Source code
 * @param {string} language - Programming language
 * @returns {string} Cache key
 */
export function generateCacheKey(code, language) {
  const hash = createHash('sha256')
    .update(`${language}:${code}`)
    .digest('hex');
  return `${CACHE_PREFIX}${hash}`;
}

// ============================================================
// Cache Operations
// ============================================================

/**
 * Retrieve a cached complexity analysis result.
 *
 * @param {string} code - Source code
 * @param {string} language - Programming language
 * @returns {Promise<import('./types.js').ComplexityAnalysisResponse | null>}
 */
export async function getCachedResult(code, language) {
  if (!isConnected || !redisClient) return null;

  try {
    const key = generateCacheKey(code, language);
    const cached = await redisClient.get(key);
    if (!cached) return null;

    const result = JSON.parse(cached);
    result._fromCache = true;
    return result;
  } catch (err) {
    console.warn('[Complexity Cache] Read error:', err.message);
    return null;
  }
}

/**
 * Store a complexity analysis result in cache.
 *
 * @param {string} code - Source code
 * @param {string} language - Programming language
 * @param {import('./types.js').ComplexityAnalysisResponse} result - Analysis result
 * @param {number} [ttl] - TTL in seconds (defaults to 1 hour)
 * @returns {Promise<boolean>} Whether the cache write succeeded
 */
export async function setCachedResult(code, language, result, ttl = CACHE_TTL_SECONDS) {
  if (!isConnected || !redisClient) return false;

  try {
    const key = generateCacheKey(code, language);
    await redisClient.setex(key, ttl, JSON.stringify(result));
    return true;
  } catch (err) {
    console.warn('[Complexity Cache] Write error:', err.message);
    return false;
  }
}

/**
 * Invalidate a cached result (e.g., when analysis algorithm is updated).
 *
 * @param {string} code - Source code
 * @param {string} language - Programming language
 * @returns {Promise<boolean>}
 */
export async function invalidateCache(code, language) {
  if (!isConnected || !redisClient) return false;

  try {
    const key = generateCacheKey(code, language);
    await redisClient.del(key);
    return true;
  } catch (err) {
    console.warn('[Complexity Cache] Invalidation error:', err.message);
    return false;
  }
}

// ============================================================
// Rate Limiting
// ============================================================

/**
 * Check and apply rate limiting for a user.
 * Uses a sliding window counter in Redis.
 *
 * @param {string} userId - User identifier
 * @returns {Promise<{allowed: boolean, remaining: number, resetIn: number}>}
 */
export async function checkRateLimit(userId) {
  if (!isConnected || !redisClient) {
    // If Redis is down, allow the request (fail-open for usability)
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS, resetIn: 0 };
  }

  try {
    const key = `${RATE_LIMIT_PREFIX}${userId}`;
    const current = await redisClient.incr(key);

    if (current === 1) {
      // First request in window — set expiry
      await redisClient.expire(key, RATE_LIMIT_WINDOW);
    }

    const ttl = await redisClient.ttl(key);
    const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - current);

    return {
      allowed: current <= RATE_LIMIT_MAX_REQUESTS,
      remaining,
      resetIn: ttl > 0 ? ttl : RATE_LIMIT_WINDOW,
    };
  } catch (err) {
    console.warn('[Complexity Cache] Rate limit error:', err.message);
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS, resetIn: 0 };
  }
}

// ============================================================
// ML Data Storage
// ============================================================

/**
 * Store ML feature vectors in Redis for batch processing.
 * Uses a Redis list as a queue that can be drained by ML training jobs.
 *
 * @param {Object} featureData - Feature vector + label
 * @param {import('./types.js').MLFeatureVector} featureData.features - Feature vector
 * @param {string} featureData.actualComplexity - Verified complexity label
 * @param {string} featureData.language - Programming language
 * @param {number} featureData.timestamp - Unix timestamp
 * @returns {Promise<boolean>}
 */
export async function pushMLTrainingData(featureData) {
  if (!isConnected || !redisClient) return false;

  try {
    await redisClient.rpush(
      `${ML_DATA_PREFIX}queue`,
      JSON.stringify(featureData)
    );
    return true;
  } catch (err) {
    console.warn('[Complexity Cache] ML data push error:', err.message);
    return false;
  }
}

/**
 * Drain N items from the ML training data queue.
 *
 * @param {number} count - Number of items to drain
 * @returns {Promise<Object[]>}
 */
export async function drainMLTrainingData(count = 100) {
  if (!isConnected || !redisClient) return [];

  try {
    const key = `${ML_DATA_PREFIX}queue`;
    const pipeline = redisClient.pipeline();

    // Atomically read and remove using LRANGE + LTRIM
    pipeline.lrange(key, 0, count - 1);
    pipeline.ltrim(key, count, -1);

    const results = await pipeline.exec();
    const items = results[0][1] || [];

    return items.map((item) => {
      try {
        return JSON.parse(item);
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch (err) {
    console.warn('[Complexity Cache] ML data drain error:', err.message);
    return [];
  }
}

// ============================================================
// Cleanup
// ============================================================

/**
 * Gracefully close the Redis connection.
 */
export async function closeRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch {
      // Ignore close errors
    }
    redisClient = null;
    isConnected = false;
  }
}
