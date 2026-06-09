// ─── Assessment & Settings ────────────────────────────────────────────────────

export interface AssessmentSettings {
  id: string;
  assessmentId: string;
  // Device
  lockScreen: boolean;
  disableAltTab: boolean;
  disableWinKey: boolean;
  disableTaskSwitch: boolean;
  disableMultiMonitor: boolean;
  forceFullscreen: boolean;
  requireDesktopApp: boolean;
  // Screen
  requireScreenShare: boolean;
  recordScreen: boolean;
  periodicScreenshots: boolean;
  liveMonitoring: boolean;
  // Webcam
  requireWebcam: boolean;
  recordWebcam: boolean;
  faceDetection: boolean;
  multipleFaceDetection: boolean;
  phoneDetection: boolean;
  eyeTracking: boolean;
  // Audio
  requireMicrophone: boolean;
  recordAudio: boolean;
  voiceDetection: boolean;
  // Anti-cheating
  copyPasteDetection: boolean;
  typingPatternAnalysis: boolean;
  aiDetection: boolean;
  devToolsDetection: boolean;
  vmDetection: boolean;
  remoteDesktopDetection: boolean;
  // Network
  allowInternet: boolean;
  allowExternalSites: boolean;
  whitelistDomains: string[];
}

export interface Assessment {
  id: string;
  title: string;
  description: string;
  duration: number; // minutes
  passingScore: number;
  totalQuestions: number;
  accessType: string;
  requireDesktopApp: boolean;
  organization: { name: string; logo: string };
  settings: AssessmentSettings | null;
}

// ─── Questions ────────────────────────────────────────────────────────────────

export type QuestionType =
  | "mcq"
  | "msq"
  | "numerical"
  | "coding"
  | "sql"
  | "linux"
  | "system_design"
  | "incident"
  | "simulation";

export interface QuestionOption {
  text: string;
}

export interface ExamQuestion {
  aqId: string;
  order: number;
  points: number;
  required: boolean;
  type: QuestionType;
  title?: string;
  description?: string;
  difficulty?: string;
  options?: QuestionOption[];
  codeTemplate?: string;
  testCases?: { input: string; expectedOutput?: string }[];
  // Judge harness metadata (coding questions only)
  functionName?: string | null;
  parameterTypes?: string[];
  returnType?: string | null;
  tags?: string[];
  technology?: string;
  topic?: string;
  simulationId?: string;
}

// ─── Candidate Attempt ────────────────────────────────────────────────────────

export interface CandidateInfo {
  id: string;
  email: string;
  displayName: string;
}

export interface Answer {
  aqId: string;
  value: unknown; // number | number[] | string | object
  savedAt: string;
}

export interface CandidateAttempt {
  id: string;
  assessmentId: string;
  userId: string;
  email: string;
  status: "in_progress" | "submitted" | "auto_submitted" | "flagged";
  startedAt: string;
  submittedAt?: string;
  totalScore: number;
  maxScore: number;
  answers: Answer[];
  codeSubmissions: unknown[];
  suspicionLevel: "low" | "medium" | "high";
}

// ─── Violations ───────────────────────────────────────────────────────────────

export type ViolationType =
  | "tab_switch"
  | "fullscreen_exit"
  | "window_resize"
  | "copy_detected"
  | "paste_detected"
  | "devtools_opened"
  | "vm_detected"
  | "remote_desktop_detected"
  | "multi_monitor"
  | "network_disconnect"
  | "camera_disconnect"
  | "mic_disconnect"
  | "idle_timeout"
  | "screen_share_ended"
  | "process_detected"
  | "keyboard_shortcut";

export type ViolationSeverity = "low" | "medium" | "high";

export interface Violation {
  id?: string;
  attemptId: string;
  type: ViolationType;
  description: string;
  severity: ViolationSeverity;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

// ─── System Check ─────────────────────────────────────────────────────────────

export interface SystemCheckItem {
  id: string;
  label: string;
  status: "pending" | "checking" | "pass" | "fail" | "warn";
  message?: string;
  required: boolean;
}

export interface SystemCheckResult {
  items: SystemCheckItem[];
  canProceed: boolean;
}

// ─── Exam Store State ─────────────────────────────────────────────────────────

export interface ExamState {
  // Auth
  accessToken: string | null;
  candidate: CandidateInfo | null;
  // Assessment
  assessment: Assessment | null;
  questions: ExamQuestion[];
  attemptId: string | null;
  // Progress
  answers: Answer[];
  currentQuestionIndex: number;
  timeRemainingSeconds: number;
  // Status
  examStatus: "idle" | "pre_check" | "in_progress" | "submitted";
  violationCount: number;
  suspicionLevel: "low" | "medium" | "high";
}
