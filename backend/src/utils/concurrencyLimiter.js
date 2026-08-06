import { ApiError } from "./apiError.js";

/**
 * Bounded-concurrency gate for expensive, non-DB work (compiling and running
 * untrusted code).
 *
 * Without a gate, N concurrent requests spawn N compilers. `javac` alone peaks
 * around 200-400MB RSS and saturates a core, so on a 2 vCPU / 4GiB instance a
 * few dozen simultaneous runs exhaust memory and the OOM killer takes down the
 * Node process with it.
 *
 * Callers that cannot get a slot within `acquireTimeoutMs`, or that arrive when
 * the queue is already `maxQueue` deep, get a 503 instead. Shedding load is the
 * point: a fast, honest rejection keeps the instance alive for everyone else.
 */
export function createConcurrencyLimiter({
  limit,
  maxQueue,
  acquireTimeoutMs,
  name = "task",
} = {}) {
  const toPositiveInt = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
  };

  const maxConcurrent = Math.max(1, toPositiveInt(limit, 1));
  const maxQueueDepth = toPositiveInt(maxQueue, 64);
  const timeoutMs = toPositiveInt(acquireTimeoutMs, 20_000);

  let active = 0;
  const queue = [];

  const release = () => {
    active -= 1;
    const next = queue.shift();
    if (next) next();
  };

  const acquire = () =>
    new Promise((resolve, reject) => {
      if (active < maxConcurrent) {
        active += 1;
        resolve();
        return;
      }

      if (queue.length >= maxQueueDepth) {
        reject(
          new ApiError(
            503,
            `Server is at capacity for ${name} requests. Please retry in a moment.`,
          ),
        );
        return;
      }

      let settled = false;

      const timer = timeoutMs
        ? setTimeout(() => {
            if (settled) return;
            settled = true;
            const index = queue.indexOf(grant);
            if (index !== -1) queue.splice(index, 1);
            reject(
              new ApiError(
                503,
                `Timed out waiting for a ${name} slot. Please retry in a moment.`,
              ),
            );
          }, timeoutMs)
        : null;

      function grant() {
        if (settled) {
          // Timed out already: hand the slot straight to the next waiter.
          const next = queue.shift();
          if (next) next();
          return;
        }
        settled = true;
        if (timer) clearTimeout(timer);
        active += 1;
        resolve();
      }

      queue.push(grant);
    });

  return {
    async run(fn) {
      await acquire();
      try {
        return await fn();
      } finally {
        release();
      }
    },
    stats() {
      return { active, queued: queue.length, maxConcurrent, maxQueueDepth };
    },
  };
}
