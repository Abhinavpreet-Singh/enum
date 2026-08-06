import os from "os";
import { createConcurrencyLimiter } from "./concurrencyLimiter.js";

const cpuCount = Math.max(1, os.cpus()?.length || 1);

/**
 * Default to 2 slots per vCPU. Compiling and running untrusted code is CPU- and
 * memory-bound, so the useful ceiling is tied to the host, not to request volume.
 * On the 2 vCPU production instance this allows 4 concurrent executions.
 */
const DEFAULT_LIMIT = Math.max(2, cpuCount * 2);

export const codeExecutionGate = createConcurrencyLimiter({
  name: "code execution",
  limit: process.env.CODE_EXECUTION_CONCURRENCY ?? DEFAULT_LIMIT,
  maxQueue: process.env.CODE_EXECUTION_QUEUE_DEPTH ?? 128,
  acquireTimeoutMs: process.env.CODE_EXECUTION_QUEUE_TIMEOUT_MS ?? 20_000,
});
