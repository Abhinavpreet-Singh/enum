import axios from "axios";
import { isTauri } from "./tauri";

// Backend URL — read from env or fall back to production
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://enum-backend.onrender.com";

export const api = axios.create({
  baseURL: `${BACKEND_URL}/api/v1/desktop`,
  timeout: 15_000,
  // Exam auth uses Bearer token only — avoid web app cookies overriding it.
  withCredentials: false,
});

function getExamToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = sessionStorage.getItem("examToken");
  if (!token || token === "undefined" || token === "null") return null;
  return token;
}

// Attach stored exam JWT on every authenticated request
api.interceptors.request.use((config) => {
  const token = getExamToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle expired tokens
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401 && typeof window !== "undefined") {
      sessionStorage.removeItem("examToken");
    }
    return Promise.reject(err);
  },
);

// ─── Typed API helpers ────────────────────────────────────────────────────────

export const desktopApi = {
  /** Validate an assessment by test code (public) */
  getAssessmentByCode: (testCode: string) =>
    api.get<{ data: import("@/types").Assessment }>(`/assessment/${testCode}`),

  /** Candidate login — returns token + questions + settings */
  login: (body: {
    email?: string;
    rollNumber?: string;
    password: string;
    testCode: string;
  }) =>
    api.post<{
      accessToken: string;
      data: {
        candidate: import("@/types").CandidateInfo;
        assessment: import("@/types").Assessment;
        questions: import("@/types").ExamQuestion[];
      };
    }>("/login", body),

  /** Refresh questions for the active exam session */
  getQuestions: () =>
    api.get<{
      data: {
        assessment: import("@/types").Assessment;
        questions: import("@/types").ExamQuestion[];
      };
    }>("/questions"),

  /** Start or resume a candidate attempt */
  startAttempt: (assessmentId: string, rollNumber?: string) =>
    api.post<{ data: import("@/types").CandidateAttempt }>(
      "/attempt/start",
      {
        assessmentId,
        rollNumber,
        deviceInfo: { client: isTauri() ? "desktop" : "web" },
      },
    ),

  /** Send heartbeat */
  heartbeat: (
    attemptId: string,
    payload: { timeRemaining: number; currentQuestionIndex: number },
  ) => api.put(`/attempt/${attemptId}/heartbeat`, payload),

  /** Autosave answers */
  autosave: (
    attemptId: string,
    answers: import("@/types").Answer[],
    codeSubmissions?: unknown[],
  ) =>
    api.put(`/attempt/${attemptId}/autosave`, { answers, codeSubmissions }),

  /** Log a violation */
  logViolation: (
    attemptId: string,
    violation: Omit<import("@/types").Violation, "attemptId" | "id">,
  ) => api.post(`/attempt/${attemptId}/violation`, violation),

  /** Final submission */
  submit: (
    attemptId: string,
    answers: import("@/types").Answer[],
    codeSubmissions?: unknown[],
    reason?: "manual" | "auto" | "force" | "abandoned",
  ) =>
    api.post(`/attempt/${attemptId}/submit`, {
      answers,
      codeSubmissions,
      reason,
    }),

  /** Participant exits without finishing */
  exit: (
    attemptId: string,
    answers?: import("@/types").Answer[],
    codeSubmissions?: unknown[],
  ) =>
    api.post(`/attempt/${attemptId}/exit`, {
      answers,
      codeSubmissions,
    }),

  /** Fetch attempt details */
  getAttempt: (attemptId: string) =>
    api.get<{ data: import("@/types").CandidateAttempt }>(`/attempt/${attemptId}`),
};

export default desktopApi;
