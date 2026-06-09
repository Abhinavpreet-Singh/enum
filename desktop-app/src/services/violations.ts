/**
 * Violation reporter — batches violations and sends them to the backend.
 * Uses a local queue so violations aren't lost when offline.
 */
import desktopApi from "@/lib/api";
import type { ViolationSeverity, ViolationType } from "@/types";

interface PendingViolation {
  type: ViolationType;
  description: string;
  severity: ViolationSeverity;
  metadata?: Record<string, unknown>;
  localTimestamp: string;
}

let attemptId: string | null = null;
let queue: PendingViolation[] = [];
let flushInterval: ReturnType<typeof setInterval> | null = null;
let onViolationLogged: ((v: PendingViolation) => void) | null = null;

export function initViolationReporter(
  aid: string,
  callback?: (v: PendingViolation) => void,
) {
  attemptId = aid;
  onViolationLogged = callback ?? null;
  stopViolationReporter();

  flushInterval = setInterval(flushQueue, 5_000);
}

export function reportViolation(
  type: ViolationType,
  description: string,
  severity: ViolationSeverity = "low",
  metadata?: Record<string, unknown>,
) {
  const v: PendingViolation = {
    type,
    description,
    severity,
    metadata,
    localTimestamp: new Date().toISOString(),
  };
  queue.push(v);
  onViolationLogged?.(v);
  // Flush immediately for high-severity
  if (severity === "high") flushQueue();
}

async function flushQueue() {
  if (!attemptId || queue.length === 0) return;
  const toSend = [...queue];
  queue = [];

  for (const v of toSend) {
    try {
      await desktopApi.logViolation(attemptId, v);
    } catch {
      // Re-queue on failure (network offline)
      queue.unshift(v);
      break;
    }
  }
}

export async function flushAll() {
  await flushQueue();
}

export function stopViolationReporter() {
  if (flushInterval) {
    clearInterval(flushInterval);
    flushInterval = null;
  }
  queue = [];
}
