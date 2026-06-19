import { create } from "zustand";
import type {
  Answer,
  Assessment,
  CandidateInfo,
  ExamQuestion,
  ExamState,
} from "@/types";

interface ExamActions {
  // Auth
  setAuth: (token: string, candidate: CandidateInfo) => void;
  clearAuth: () => void;
  // Assessment setup
  setAssessment: (assessment: Assessment, questions: ExamQuestion[]) => void;
  setQuestions: (questions: ExamQuestion[]) => void;
  setAttemptId: (id: string) => void;
  // Answer management
  saveAnswer: (answer: Answer) => void;
  clearAnswer: (aqId: string) => void;
  // Navigation
  setCurrentQuestion: (index: number) => void;
  // Timer
  setTimeRemaining: (seconds: number) => void;
  tickTimer: () => void;
  // Status
  setExamStatus: (status: ExamState["examStatus"]) => void;
  incrementViolation: () => void;
  reset: () => void;
}

const initialState: ExamState = {
  accessToken: null,
  candidate: null,
  assessment: null,
  questions: [],
  attemptId: null,
  answers: [],
  currentQuestionIndex: 0,
  timeRemainingSeconds: 0,
  examStatus: "idle",
  violationCount: 0,
  suspicionLevel: "low",
};

export const useExamStore = create<ExamState & ExamActions>((set) => ({
  ...initialState,

  setAuth: (token, candidate) =>
    set({ accessToken: token, candidate }),

  clearAuth: () =>
    set({ accessToken: null, candidate: null }),

  setAssessment: (assessment, questions) =>
    set({
      assessment,
      questions,
      timeRemainingSeconds: assessment.duration * 60,
    }),

  setQuestions: (questions) => set({ questions }),

  setAttemptId: (id) => set({ attemptId: id }),

  saveAnswer: (answer) =>
    set((state) => {
      const existing = state.answers.findIndex((a) => a.aqId === answer.aqId);
      if (existing >= 0) {
        const updated = [...state.answers];
        updated[existing] = answer;
        return { answers: updated };
      }
      return { answers: [...state.answers, answer] };
    }),

  clearAnswer: (aqId) =>
    set((state) => ({
      answers: state.answers.filter((answer) => answer.aqId !== aqId),
    })),

  setCurrentQuestion: (index) => set({ currentQuestionIndex: index }),

  setTimeRemaining: (seconds) => set({ timeRemainingSeconds: seconds }),

  tickTimer: () =>
    set((state) => ({
      timeRemainingSeconds: Math.max(0, state.timeRemainingSeconds - 1),
    })),

  setExamStatus: (status) => set({ examStatus: status }),

  incrementViolation: () =>
    set((state) => {
      const count = state.violationCount + 1;
      const level: ExamState["suspicionLevel"] =
        count >= 10 ? "high" : count >= 5 ? "medium" : "low";
      return { violationCount: count, suspicionLevel: level };
    }),

  reset: () => set(initialState),
}));
