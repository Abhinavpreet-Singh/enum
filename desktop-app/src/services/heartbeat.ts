/**
 * Heartbeat service — sends a ping to the backend every N seconds.
 * This lets the proctor dashboard track live/offline status and detects
 * admin force-end of the assessment.
 */
import desktopApi from "@/lib/api";

let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

export function startHeartbeat(
  attemptId: string,
  getState: () => { timeRemainingSeconds: number; currentQuestionIndex: number },
  options?: {
    intervalMs?: number;
    onForceEnd?: (reason?: string | null) => void;
  },
) {
  stopHeartbeat();

  const intervalMs = options?.intervalMs ?? 15_000;
  const onForceEnd = options?.onForceEnd;

  heartbeatInterval = setInterval(async () => {
    const { timeRemainingSeconds, currentQuestionIndex } = getState();
    try {
      const { data } = await desktopApi.heartbeat(attemptId, {
        timeRemaining: timeRemainingSeconds,
        currentQuestionIndex,
      });
      const payload = data?.data as
        | { forceEnd?: boolean; reason?: string | null }
        | undefined;
      if (payload?.forceEnd) {
        stopHeartbeat();
        onForceEnd?.(payload.reason ?? "assessment_ended");
      }
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
