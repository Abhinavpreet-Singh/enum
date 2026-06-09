"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import axios from "axios";
import { proxy } from "@/app/proxy";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Monitor,
  Camera,
  Mic,
  Cpu,
  Wifi,
  Eye,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

const panelBorder = "border border-black/20 dark:border-white/25";
const panelSurface = `${panelBorder} bg-white/80 backdrop-blur-[2px] dark:bg-black/75`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Violation {
  id: string;
  type: string;
  severity: "low" | "medium" | "high";
  description: string;
  timestamp: string;
  metadata: Record<string, unknown> | null;
}

export interface Question {
  aqId: string;
  order: number;
  points: number;
  type: string;
  title?: string;
  description?: string;
  options?: Array<{ text: string; isCorrect?: boolean }>;
  correctAnswer?: unknown;
  codeTemplate?: string;
  difficulty?: string;
}

export interface AttemptDetail {
  id: string;
  email: string;
  rollNumber: string | null;
  status: string;
  startedAt: string;
  submittedAt: string | null;
  totalScore: number;
  maxScore: number;
  suspicionLevel: "low" | "medium" | "high";
  answers: Array<{ aqId: string; value: unknown; savedAt?: string }>;
  codeSubmissions: Array<{ aqId: string; language: string; code: string }>;
  durationSeconds: number | null;
  passed: boolean;
}

export interface AssessmentInfo {
  id: string;
  title: string;
  passingScore: number;
  duration: number;
  settings: Record<string, boolean | string[]> | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function fmtDuration(s: number | null) {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec}s`;
}

const severityColor = (s: string) => {
  if (s === "high") return "text-red-600 dark:text-red-400 border-red-400/40 bg-red-50 dark:bg-red-950/20";
  if (s === "medium") return "text-amber-600 dark:text-amber-400 border-amber-400/40 bg-amber-50 dark:bg-amber-950/20";
  return "text-blue-600 dark:text-blue-400 border-blue-400/40 bg-blue-50 dark:bg-blue-950/20";
};

export const VIOLATION_LABELS: Record<string, string> = {
  tab_switch: "Tab Switch",
  fullscreen_exit: "Fullscreen Exit",
  window_resize: "Window Resize",
  copy_detected: "Copy Detected",
  paste_detected: "Paste Detected",
  devtools_opened: "DevTools Opened",
  vm_detected: "VM Detected",
  remote_desktop_detected: "Remote Desktop",
  multi_monitor: "Multiple Monitors",
  network_disconnect: "Network Disconnect",
  camera_disconnect: "Camera Disconnect",
  mic_disconnect: "Mic Disconnect",
  idle_timeout: "Idle Timeout",
  screen_share_ended: "Screen Share Ended",
  process_detected: "Suspicious Process",
  keyboard_shortcut: "Keyboard Shortcut",
  multi_face: "Multiple Faces",
};

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className={panelSurface + " p-4"}>
      <div className={`font-mono text-2xl font-bold leading-none mb-1 ${accent ?? "text-black dark:text-white"}`}>
        {value}
      </div>
      {sub && <div className={`font-mono text-[9px] mb-1 ${accent ?? "text-gray-500"}`}>{sub}</div>}
      <div className="font-mono text-[9px] text-gray-400 uppercase tracking-wider">{label}</div>
    </div>
  );
}

// ─── Violations tab ───────────────────────────────────────────────────────────

function ViolationsTab({ violations }: { violations: Violation[] }) {
  const grouped = violations.reduce<Record<string, Violation[]>>((acc, v) => {
    (acc[v.type] = acc[v.type] ?? []).push(v);
    return acc;
  }, {});

  if (violations.length === 0) {
    return (
      <div className={panelSurface + " p-10 text-center"}>
        <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
        <p className="font-mono text-xs text-gray-400">No violations recorded during this session.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {Object.entries(grouped).map(([type, items]) => (
          <div key={type} className={`border px-2 py-1 font-mono text-[9px] flex items-center gap-1.5 ${severityColor(items[0].severity)}`}>
            <AlertTriangle className="w-3 h-3" />
            {VIOLATION_LABELS[type] ?? type} × {items.length}
          </div>
        ))}
      </div>
      <div className={panelSurface}>
        <div className="p-3 border-b border-black/10 dark:border-white/10">
          <span className="font-mono text-[9px] uppercase text-gray-400 tracking-wider">
            Violation Timeline — {violations.length} event{violations.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="divide-y divide-black/5 dark:divide-white/5">
          {violations.map((v) => (
            <div key={v.id} className="px-4 py-3 flex items-start gap-3">
              <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                v.severity === "high" ? "bg-red-500" : v.severity === "medium" ? "bg-amber-500" : "bg-blue-500"
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-semibold text-black dark:text-white">
                    {VIOLATION_LABELS[v.type] ?? v.type}
                  </span>
                  <span className={`border px-1.5 py-0.5 font-mono text-[8px] uppercase ${severityColor(v.severity)}`}>
                    {v.severity}
                  </span>
                </div>
                {v.description && (
                  <p className="font-mono text-[10px] text-gray-500 mt-0.5">{v.description}</p>
                )}
                {v.metadata && Object.keys(v.metadata).length > 0 && (
                  <pre className="font-mono text-[9px] text-gray-400 mt-1 bg-gray-50 dark:bg-white/5 px-2 py-1 overflow-x-auto">
                    {JSON.stringify(v.metadata, null, 2)}
                  </pre>
                )}
              </div>
              <span className="font-mono text-[9px] text-gray-400 shrink-0 whitespace-nowrap">
                {fmtDate(v.timestamp)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Answers tab ──────────────────────────────────────────────────────────────

function AnswersTab({
  questions,
  answers,
  codeSubmissions,
  onSwitchTab,
}: {
  questions: Question[];
  answers: AttemptDetail["answers"];
  codeSubmissions: AttemptDetail["codeSubmissions"];
  onSwitchTab: (t: Tab) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const answerMap = Object.fromEntries(answers.map((a) => [a.aqId, a.value]));
  const codeMap = Object.fromEntries(codeSubmissions.map((c) => [c.aqId, c]));

  if (questions.length === 0) {
    return (
      <div className={panelSurface + " p-10 text-center"}>
        <p className="font-mono text-xs text-gray-400">No questions found for this assessment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {questions.map((q, i) => {
        const candidateAnswer = answerMap[q.aqId];
        const codeSubmission = codeMap[q.aqId];
        const isExp = expanded === q.aqId;

        let isCorrect: boolean | null = null;
        if (q.type === "mcq" && q.options) {
          const correctIdx = q.options.findIndex((o) => o.isCorrect);
          isCorrect = candidateAnswer === correctIdx;
        } else if (q.type === "msq" && q.options) {
          const correctIdxs = q.options.map((o, i) => (o.isCorrect ? i : -1)).filter((i) => i !== -1);
          const candidateIdxs = Array.isArray(candidateAnswer) ? candidateAnswer : [];
          isCorrect = correctIdxs.length === candidateIdxs.length && correctIdxs.every((i) => candidateIdxs.includes(i));
        } else if (q.type === "numerical") {
          const correct = (q.correctAnswer as { answer?: string })?.answer ?? "";
          isCorrect = String(candidateAnswer ?? "").trim() === String(correct).trim();
        }

        const answered = candidateAnswer !== undefined || !!codeSubmission;

        return (
          <div key={q.aqId} className={panelSurface}>
            <button
              className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-black/1 dark:hover:bg-white/1"
              onClick={() => setExpanded(isExp ? null : q.aqId)}
            >
              <span className="font-mono text-[9px] text-gray-400 w-5 shrink-0">Q{i + 1}</span>
              <span className="flex-1 font-mono text-xs text-black dark:text-white truncate">
                {q.title ?? `${q.type} question`}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`border px-1.5 py-0.5 font-mono text-[8px] uppercase ${
                  q.difficulty === "hard" ? "text-red-500 border-red-400/40"
                  : q.difficulty === "easy" ? "text-emerald-500 border-emerald-400/40"
                  : "text-amber-500 border-amber-400/40"
                }`}>{q.difficulty ?? q.type}</span>
                <span className="font-mono text-[9px] text-gray-400">{q.points} pts</span>
                {!answered ? (
                  <span className="font-mono text-[9px] text-gray-300 dark:text-gray-600">—</span>
                ) : isCorrect !== null ? (
                  isCorrect
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    : <XCircle className="w-3.5 h-3.5 text-red-500" />
                ) : (
                  <span className="font-mono text-[8px] border border-blue-400/40 text-blue-500 px-1">CODE</span>
                )}
                {isExp ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
              </div>
            </button>

            {isExp && (
              <div className="px-4 pb-4 border-t border-black/5 dark:border-white/5 pt-3 space-y-3">
                {q.description && <p className="font-mono text-[10px] text-gray-500">{q.description}</p>}

                {/* MCQ / MSQ */}
                {(q.type === "mcq" || q.type === "msq") && q.options && (
                  <div className="space-y-1.5">
                    <div className="font-mono text-[9px] text-gray-400 uppercase">Options</div>
                    {q.options.map((opt, oi) => {
                      const isSelected = q.type === "mcq"
                        ? candidateAnswer === oi
                        : Array.isArray(candidateAnswer) && candidateAnswer.includes(oi);
                      return (
                        <div key={oi} className={`flex items-center gap-2 px-3 py-2 font-mono text-[10px] border ${
                          opt.isCorrect
                            ? "border-emerald-400/40 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300"
                            : isSelected
                            ? "border-red-400/40 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300"
                            : "border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-300"
                        }`}>
                          <span className="w-3 h-3 rounded-sm border border-current flex items-center justify-center text-[8px]">
                            {isSelected ? "✓" : ""}
                          </span>
                          <span className="flex-1">{opt.text}</span>
                          {opt.isCorrect && <span className="text-[8px] text-emerald-600 dark:text-emerald-400">Correct</span>}
                          {isSelected && !opt.isCorrect && <span className="text-[8px] text-red-500">Selected</span>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Numerical */}
                {q.type === "numerical" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="font-mono text-[9px] text-gray-400 uppercase mb-1">Candidate&apos;s Answer</div>
                      <div className={`font-mono text-sm px-3 py-2 border ${
                        isCorrect === true ? "border-emerald-400/40 text-emerald-600 dark:text-emerald-400"
                        : isCorrect === false ? "border-red-400/40 text-red-600 dark:text-red-400"
                        : "border-black/10 dark:border-white/10 text-gray-500"
                      }`}>
                        {candidateAnswer !== undefined ? String(candidateAnswer) : "Not answered"}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] text-gray-400 uppercase mb-1">Correct Answer</div>
                      <div className="font-mono text-sm px-3 py-2 border border-emerald-400/40 text-emerald-600 dark:text-emerald-400">
                        {String((q.correctAnswer as { answer?: string })?.answer ?? "—")}
                      </div>
                    </div>
                  </div>
                )}

                {/* Coding */}
                {q.type === "coding" && (
                  codeSubmission ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] text-gray-400 uppercase">Language:</span>
                        <span className="font-mono text-[9px] text-black dark:text-white">{codeSubmission.language}</span>
                      </div>
                      <pre className="bg-gray-50 dark:bg-white/5 border border-black/10 dark:border-white/10 p-3 font-mono text-[10px] text-gray-700 dark:text-gray-300 overflow-x-auto max-h-64">
                        {codeSubmission.code}
                      </pre>
                    </div>
                  ) : (
                    <p className="font-mono text-[10px] text-gray-400">No code submitted.</p>
                  )
                )}

                {!answered && q.type !== "coding" && (
                  <p className="font-mono text-[10px] text-gray-400 italic">Not answered.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Proctoring tab ───────────────────────────────────────────────────────────

function ProctoringTab({ settings }: { settings: AssessmentInfo["settings"] }) {
  if (!settings) {
    return (
      <div className={panelSurface + " p-10 text-center"}>
        <p className="font-mono text-xs text-gray-400">No proctoring settings for this test.</p>
      </div>
    );
  }

  const sections = [
    {
      label: "Device Restrictions", Icon: Monitor,
      keys: [["lockScreen","Lock Screen"],["disableAltTab","Disable Alt+Tab"],["disableWinKey","Disable Win Key"],["disableTaskSwitch","Disable Task Switch"],["disableMultiMonitor","Block Multi-Monitor"],["forceFullscreen","Force Fullscreen"],["requireDesktopApp","Require Desktop App"]],
    },
    {
      label: "Screen Monitoring", Icon: Eye,
      keys: [["requireScreenShare","Require Screen Share"],["recordScreen","Record Screen"],["periodicScreenshots","Periodic Screenshots"],["liveMonitoring","Live Monitoring"]],
    },
    {
      label: "Webcam", Icon: Camera,
      keys: [["requireWebcam","Require Webcam"],["recordWebcam","Record Webcam"],["faceDetection","Face Detection"],["multipleFaceDetection","Multiple Face Detection"],["phoneDetection","Phone Detection"],["eyeTracking","Eye Tracking"]],
    },
    {
      label: "Audio", Icon: Mic,
      keys: [["requireMicrophone","Require Microphone"],["recordAudio","Record Audio"],["voiceDetection","Voice Detection"]],
    },
    {
      label: "Anti-Cheating", Icon: ShieldAlert,
      keys: [["copyPasteDetection","Copy-Paste Detection"],["typingPatternAnalysis","Typing Pattern Analysis"],["aiDetection","AI Detection"],["devToolsDetection","DevTools Detection"],["vmDetection","VM Detection"],["remoteDesktopDetection","Remote Desktop Detection"]],
    },
    {
      label: "Network", Icon: Wifi,
      keys: [["allowInternet","Allow Internet"],["allowExternalSites","Allow External Sites"]],
    },
  ] as const;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sections.map(({ label, Icon, keys }) => {
        const enabled = keys.filter(([k]) => settings[k as string] === true);
        return (
          <div key={label} className={panelSurface + " p-4"}>
            <div className="flex items-center gap-2 mb-3">
              <Icon className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-mono text-[9px] uppercase text-gray-400 tracking-wider">{label}</span>
              {enabled.length > 0 && (
                <span className="ml-auto font-mono text-[9px] text-emerald-500">{enabled.length} active</span>
              )}
            </div>
            <div className="space-y-1.5">
              {keys.map(([k, displayName]) => {
                const on = settings[k as string] === true;
                return (
                  <div key={k} className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-gray-600 dark:text-gray-300">{displayName}</span>
                    <span className={`font-mono text-[9px] font-semibold ${on ? "text-emerald-500" : "text-gray-300 dark:text-gray-600"}`}>
                      {on ? "ON" : "OFF"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Tab = "overview" | "violations" | "answers" | "proctoring";

interface BreadcrumbItem { label: string; href: string }

interface Props {
  attemptId: string;
  breadcrumbs: BreadcrumbItem[];
}

export function CandidateDetailView({ attemptId, breadcrumbs }: Props) {
  const [data, setData] = useState<{
    attempt: AttemptDetail;
    assessment: AssessmentInfo;
    questions: Question[];
    violations: Violation[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const load = useCallback(async () => {
    try {
      const { data: res } = await axios.get(
        `${proxy}/api/v1/organization-dashboard/attempts/${attemptId}`,
        { withCredentials: true },
      );
      setData(res.data);
    } catch {
      setError("Failed to load candidate details.");
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="font-mono text-xs text-gray-400 animate-pulse">Loading candidate details…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="font-mono text-xs text-red-500">{error || "No data."}</p>
      </div>
    );
  }

  const { attempt, assessment, questions, violations } = data;
  const scorePercent = attempt.maxScore > 0 ? Math.round((attempt.totalScore / attempt.maxScore) * 100) : null;
  const highV = violations.filter((v) => v.severity === "high").length;
  const medV = violations.filter((v) => v.severity === "medium").length;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "violations", label: "Violations", count: violations.length },
    { id: "answers", label: "Answers", count: questions.length },
    { id: "proctoring", label: "Proctoring" },
  ];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 mb-5 font-mono text-[10px] text-gray-400 flex-wrap">
        {breadcrumbs.map((b, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-3 h-3" />}
            <Link href={b.href} className="hover:text-black dark:hover:text-white transition-colors truncate max-w-[140px]">
              {b.label}
            </Link>
          </span>
        ))}
        <ChevronRight className="w-3 h-3" />
        <span className="text-black dark:text-white truncate max-w-[180px]">{attempt.email}</span>
      </div>

      {/* Candidate header */}
      <div className={panelSurface + " p-5 mb-5"}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-base font-bold text-black dark:text-white">{attempt.email}</h1>
            {attempt.rollNumber && <p className="font-mono text-[10px] text-gray-400">{attempt.rollNumber}</p>}
            <div className="flex flex-wrap gap-3 mt-2">
              <span className="font-mono text-[9px] text-gray-400">Started: {fmtDate(attempt.startedAt)}</span>
              {attempt.submittedAt && (
                <span className="font-mono text-[9px] text-gray-400">Submitted: {fmtDate(attempt.submittedAt)}</span>
              )}
              <span className="font-mono text-[9px] text-gray-400">Test: {assessment.title}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`border px-3 py-1 font-mono text-[10px] uppercase font-semibold ${
              attempt.status === "submitted" || attempt.status === "auto_submitted"
                ? attempt.passed
                  ? "border-emerald-400/40 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20"
                  : "border-red-400/40 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20"
                : "border-amber-400/40 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20"
            }`}>
              {attempt.status === "submitted" || attempt.status === "auto_submitted"
                ? attempt.passed ? "Passed" : "Failed"
                : attempt.status.replace("_", " ")}
            </span>
            <span className={`border px-3 py-1 font-mono text-[10px] uppercase ${
              attempt.suspicionLevel === "high" ? "border-red-400/40 text-red-600 dark:text-red-400"
              : attempt.suspicionLevel === "medium" ? "border-amber-400/40 text-amber-600 dark:text-amber-400"
              : "border-emerald-400/40 text-emerald-600 dark:text-emerald-400"
            }`}>
              {attempt.suspicionLevel} risk
            </span>
          </div>
        </div>
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard
          label="Score"
          value={scorePercent !== null ? `${scorePercent}%` : "—"}
          sub={attempt.maxScore > 0 ? `${attempt.totalScore} / ${attempt.maxScore} pts` : undefined}
          accent={scorePercent === null ? undefined : scorePercent >= assessment.passingScore ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}
        />
        <StatCard
          label="Time Taken"
          value={fmtDuration(attempt.durationSeconds)}
          sub={`of ${assessment.duration}m allowed`}
        />
        <StatCard
          label="Violations"
          value={String(violations.length)}
          sub={highV > 0 ? `${highV} high · ${medV} medium` : medV > 0 ? `${medV} medium` : violations.length > 0 ? "all low severity" : "clean session"}
          accent={highV > 0 ? "text-red-600 dark:text-red-400" : medV > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}
        />
        <StatCard
          label="Suspicion Level"
          value={attempt.suspicionLevel.charAt(0).toUpperCase() + attempt.suspicionLevel.slice(1)}
          sub={`passing threshold: ${assessment.passingScore}%`}
          accent={attempt.suspicionLevel === "high" ? "text-red-600 dark:text-red-400" : attempt.suspicionLevel === "medium" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-black/10 dark:border-white/10 mb-5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 font-mono text-[10px] uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === t.id
                ? "border-black dark:border-white text-black dark:text-white"
                : "border-transparent text-gray-400 hover:text-black dark:hover:text-white"
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="ml-1.5 font-mono text-[8px] text-gray-400">({t.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* Timeline */}
          <div className={panelSurface + " p-4"}>
            <div className="font-mono text-[9px] uppercase text-gray-400 tracking-wider mb-4">Exam Timeline</div>
            <div className="relative pl-5">
              <div className="absolute left-1.5 top-0 bottom-0 w-px bg-black/10 dark:bg-white/10" />
              {[
                { label: "Exam started", time: attempt.startedAt, color: "bg-black dark:bg-white" },
                ...violations.slice(0, 8).map((v) => ({
                  label: `${VIOLATION_LABELS[v.type] ?? v.type} detected`,
                  time: v.timestamp,
                  color: v.severity === "high" ? "bg-red-500" : v.severity === "medium" ? "bg-amber-500" : "bg-blue-500",
                })),
                ...(violations.length > 8 ? [{ label: `… and ${violations.length - 8} more violations`, time: "", color: "bg-gray-400" }] : []),
                ...(attempt.submittedAt ? [{
                  label: attempt.status === "auto_submitted" ? "Auto-submitted (timer expired)" : "Submitted by candidate",
                  time: attempt.submittedAt,
                  color: "bg-emerald-500",
                }] : []),
              ].map((ev, i) => (
                <div key={i} className="flex items-start gap-3 mb-3 relative">
                  <div className={`w-2 h-2 rounded-full mt-0.5 shrink-0 -ml-[19px] ${ev.color}`} />
                  <div className="flex-1">
                    <span className="font-mono text-[10px] text-black dark:text-white">{ev.label}</span>
                    {ev.time && <span className="font-mono text-[9px] text-gray-400 ml-2">{fmtDate(ev.time)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Violation summary chips */}
          {violations.length > 0 && (
            <div className={panelSurface + " p-4"}>
              <div className="font-mono text-[9px] uppercase text-gray-400 tracking-wider mb-3">Violation Summary</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(violations.reduce<Record<string, number>>((acc, v) => {
                  acc[v.type] = (acc[v.type] ?? 0) + 1; return acc;
                }, {})).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-1.5 border border-black/10 dark:border-white/10 px-3 py-1.5">
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                    <span className="font-mono text-[10px] text-black dark:text-white">{VIOLATION_LABELS[type] ?? type}</span>
                    <span className="font-mono text-[10px] text-gray-400">×{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Code submissions */}
          {attempt.codeSubmissions.length > 0 && (
            <div className={panelSurface + " p-4"}>
              <div className="font-mono text-[9px] uppercase text-gray-400 tracking-wider mb-3">Code Submissions</div>
              <div className="space-y-2">
                {attempt.codeSubmissions.map((cs, i) => (
                  <div key={i} className="flex items-center gap-3 border border-black/5 dark:border-white/5 px-3 py-2">
                    <Cpu className="w-3 h-3 text-gray-400" />
                    <span className="font-mono text-[10px] text-black dark:text-white">{cs.language}</span>
                    <span className="font-mono text-[9px] text-gray-400">{cs.code?.split("\n").length ?? 0} lines</span>
                    <button
                      onClick={() => setActiveTab("answers")}
                      className="ml-auto font-mono text-[9px] text-gray-400 hover:text-black dark:hover:text-white flex items-center gap-1"
                    >
                      View <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick answers summary */}
          <div className={panelSurface + " p-4"}>
            <div className="font-mono text-[9px] uppercase text-gray-400 tracking-wider mb-3">Answers Summary</div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-mono text-xs text-black dark:text-white">
                  {questions.filter((q) => {
                    const ans = attempt.answers.find((a) => a.aqId === q.aqId)?.value;
                    if (q.type === "mcq" && q.options) return ans === q.options.findIndex((o) => o.isCorrect);
                    return false;
                  }).length} correct
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-red-500" />
                <span className="font-mono text-xs text-black dark:text-white">
                  {questions.filter((q) => {
                    if (!["mcq","msq","numerical"].includes(q.type)) return false;
                    return !attempt.answers.find((a) => a.aqId === q.aqId);
                  }).length} unanswered
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-mono text-xs text-black dark:text-white">
                  {questions.length} total questions
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "violations" && <ViolationsTab violations={violations} />}

      {activeTab === "answers" && (
        <AnswersTab
          questions={questions}
          answers={attempt.answers}
          codeSubmissions={attempt.codeSubmissions}
          onSwitchTab={setActiveTab}
        />
      )}

      {activeTab === "proctoring" && <ProctoringTab settings={assessment.settings} />}
    </div>
  );
}
