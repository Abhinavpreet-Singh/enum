/**
 * Autosave service — persists candidate answers to the backend
 * every N seconds AND to localStorage as offline fallback.
 */
import desktopApi from "@/lib/api";
import type { Answer } from "@/types";

const LS_KEY = (attemptId: string) => `enum_exam_draft_${attemptId}`;

let autosaveInterval: ReturnType<typeof setInterval> | null = null;

export function startAutosave(
  attemptId: string,
  getAnswers: () => Answer[],
  intervalMs = 10_000,
) {
  stopAutosave();

  autosaveInterval = setInterval(async () => {
    const answers = getAnswers();
    // Always persist locally first (offline safety)
    persistLocal(attemptId, answers);
    try {
      await desktopApi.autosave(attemptId, answers);
    } catch {
      // Will be retried on next interval
    }
  }, intervalMs);
}

export function stopAutosave() {
  if (autosaveInterval) {
    clearInterval(autosaveInterval);
    autosaveInterval = null;
  }
}

export function persistLocal(attemptId: string, answers: Answer[]) {
  try {
    localStorage.setItem(
      LS_KEY(attemptId),
      JSON.stringify({ answers, savedAt: new Date().toISOString() }),
    );
  } catch {
    // localStorage unavailable in some sandboxed contexts
  }
}

export function loadLocalDraft(attemptId: string): Answer[] {
  try {
    const raw = localStorage.getItem(LS_KEY(attemptId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { answers: Answer[] };
    return parsed.answers ?? [];
  } catch {
    return [];
  }
}

export function clearLocalDraft(attemptId: string) {
  try {
    localStorage.removeItem(LS_KEY(attemptId));
  } catch {}
}
