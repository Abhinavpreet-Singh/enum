/**
 * Heartbeat service — sends a ping to the backend every N seconds.
 * This lets the proctor dashboard track live/offline status.
 */
import desktopApi from "@/lib/api";

let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

export function startHeartbeat(
  attemptId: string,
  getState: () => { timeRemainingSeconds: number; currentQuestionIndex: number },
  intervalMs = 15_000,
) {
  stopHeartbeat();

  heartbeatInterval = setInterval(async () => {
    const { timeRemainingSeconds, currentQuestionIndex } = getState();
    try {
      await desktopApi.heartbeat(attemptId, {
        timeRemaining: timeRemainingSeconds,
        currentQuestionIndex,
      });
    } catch {
      // Heartbeat failures are non-fatal — the exam continues offline
    }
  }, intervalMs);
}

export function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}
