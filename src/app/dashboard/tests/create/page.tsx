"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { proxy } from "@/app/proxy";
import { DashboardPageShell, DashboardPageHeader } from "@/components/dashboard/dashboard-page-shell";
import { ChevronLeft, ChevronRight, Check, Save } from "lucide-react";

const panelBorder = "border border-black/20 dark:border-white/25";
const panelSurface = `${panelBorder} bg-white/80 backdrop-blur-[2px] dark:bg-black/75`;
const inputCls = "w-full border border-gray-300 dark:border-neutral-700 bg-white dark:bg-black px-3 py-2 font-mono text-xs text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors";
const labelCls = "block font-mono text-[10px] tracking-[0.2em] text-gray-500 dark:text-gray-400 uppercase mb-1.5";
const toggleCls = (on: boolean) =>
  `relative inline-flex h-5 w-9 items-center rounded-full border transition-colors cursor-pointer ${
    on ? "bg-black dark:bg-white border-black dark:border-white" : "bg-gray-200 dark:bg-neutral-800 border-gray-300 dark:border-neutral-700"
  }`;
const toggleDot = (on: boolean) =>
  `inline-block h-3.5 w-3.5 rounded-full transition-transform ${
    on ? "translate-x-4 bg-white dark:bg-black" : "translate-x-0.5 bg-gray-400 dark:bg-neutral-500"
  }`;

const STEPS = ["Basic Info", "Questions", "Security", "Review"];

const SECURITY_GROUPS = [
  {
    label: "Device Restrictions",
    fields: [
      { key: "lockScreen", label: "Lock Screen" },
      { key: "disableAltTab", label: "Disable Alt+Tab" },
      { key: "disableWinKey", label: "Disable Windows Key" },
      { key: "disableTaskSwitch", label: "Disable Task Switching" },
      { key: "disableMultiMonitor", label: "Disable Multiple Monitors" },
      { key: "forceFullscreen", label: "Force Fullscreen" },
      { key: "requireDesktopApp", label: "Require Desktop App" },
    ],
  },
  {
    label: "Screen Monitoring",
    fields: [
      { key: "requireScreenShare", label: "Require Screen Sharing" },
      { key: "recordScreen", label: "Record Screen" },
      { key: "periodicScreenshots", label: "Periodic Screenshots" },
      { key: "liveMonitoring", label: "Live Monitoring" },
    ],
  },
  {
    label: "Webcam Monitoring",
    fields: [
      { key: "requireWebcam", label: "Require Webcam" },
      { key: "recordWebcam", label: "Record Webcam" },
      { key: "faceDetection", label: "Face Detection" },
      { key: "multipleFaceDetection", label: "Multiple Face Detection" },
      { key: "phoneDetection", label: "Phone Detection" },
      { key: "eyeTracking", label: "Eye Tracking" },
    ],
  },
  {
    label: "Audio Monitoring",
    fields: [
      { key: "requireMicrophone", label: "Require Microphone" },
      { key: "recordAudio", label: "Record Audio" },
      { key: "voiceDetection", label: "Voice Detection" },
    ],
  },
  {
    label: "Anti-Cheating",
    fields: [
      { key: "copyPasteDetection", label: "Copy/Paste Detection" },
      { key: "typingPatternAnalysis", label: "Typing Pattern Analysis" },
      { key: "aiDetection", label: "AI Detection" },
      { key: "devToolsDetection", label: "DevTools Detection" },
      { key: "vmDetection", label: "Virtual Machine Detection" },
      { key: "remoteDesktopDetection", label: "Remote Desktop Detection" },
    ],
  },
  {
    label: "Network Controls",
    fields: [
      { key: "allowInternet", label: "Allow Internet Access" },
      { key: "allowExternalSites", label: "Allow External Websites" },
    ],
  },
];

interface QuestionBank {
  id: string;
  name: string;
  category: string;
  _count: { questions: number };
}

export default function CreateTestPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Basic Info
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [passingScore, setPassingScore] = useState(60);

  // Step 2: Questions
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);

  // Step 3: Security
  const [settings, setSettings] = useState<Record<string, boolean>>({
    copyPasteDetection: true,
    devToolsDetection: true,
  });

  useEffect(() => {
    axios
      .get(`${proxy}/api/v1/question-banks`)
      .then((res) => setBanks(res.data.data || []))
      .catch(() => {});
  }, []);

  const toggleSetting = (key: string) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleBank = (id: string) => {
    setSelectedBanks((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (publish: boolean) => {
    setIsSubmitting(true);
    setError("");
    try {
      const payload = {
        title,
        description,
        duration,
        startDate: startDate || null,
        endDate: endDate || null,
        maxAttempts,
        passingScore,
        settings,
      };
      const res = await axios.post(`${proxy}/api/v1/assessments`, payload);

      if (publish && res.data.data?.id) {
        await axios.put(`${proxy}/api/v1/assessments/${res.data.data.id}/publish`);
      }
      router.push("/dashboard/tests");
    } catch (err) {
      setIsSubmitting(false);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Failed to create test.");
      } else {
        setError("An unexpected error occurred.");
      }
    }
  };

  const canNext = () => {
    if (step === 0) return title.trim().length > 0;
    return true;
  };

  return (
    <DashboardPageShell maxWidth="7xl">
      <DashboardPageHeader breadcrumb="Tests" title="Create Test" description="Set up a new assessment in four steps." />

      {/* Step Indicator */}
      <div className="flex items-center gap-0 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <button
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className={`flex items-center gap-2 px-4 py-2 font-mono text-[10px] tracking-wider border transition-colors ${
                i === step
                  ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white"
                  : i < step
                    ? "bg-transparent text-black dark:text-white border-black/20 dark:border-white/25 hover:border-black dark:hover:border-white"
                    : "bg-transparent text-gray-400 border-gray-200 dark:border-neutral-800 cursor-not-allowed"
              }`}
            >
              <span className={`w-4 h-4 flex items-center justify-center text-[9px] font-bold ${
                i < step ? "bg-emerald-500 text-white" : ""
              }`}>
                {i < step ? <Check className="w-3 h-3" /> : i + 1}
              </span>
              {s.toUpperCase()}
            </button>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 border border-red-400/40 bg-red-50 dark:bg-red-950/20 px-4 py-2 font-mono text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Step Content */}
      <div className={`${panelSurface} p-6`}>
        {/* Step 1: Basic Info */}
        {step === 0 && (
          <div className="space-y-4 max-w-2xl">
            <div>
              <label className={labelCls}>Assessment Name *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Frontend Developer Assessment" />
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputCls} min-h-[80px] resize-y`} placeholder="Describe what this assessment evaluates..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Duration (minutes)</label>
                <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={inputCls} min={1} />
              </div>
              <div>
                <label className={labelCls}>Passing Score (%)</label>
                <input type="number" value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} className={inputCls} min={0} max={100} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Start Date</label>
                <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>End Date</label>
                <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Max Attempts</label>
              <input type="number" value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))} className={`${inputCls} w-32`} min={1} />
            </div>
          </div>
        )}

        {/* Step 2: Questions */}
        {step === 1 && (
          <div>
            <p className="font-mono text-xs text-gray-500 dark:text-gray-400 mb-4">
              Select question banks to include in this assessment. Individual question selection will be available after creation.
            </p>
            {banks.length === 0 ? (
              <div className="text-center py-12">
                <p className="font-mono text-xs text-gray-400 mb-2">No question banks available.</p>
                <a href="/dashboard/question-banks" className="font-mono text-xs text-black dark:text-white underline">
                  Create a question bank first
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {banks.map((bank) => {
                  const selected = selectedBanks.includes(bank.id);
                  return (
                    <button
                      key={bank.id}
                      onClick={() => toggleBank(bank.id)}
                      className={`text-left p-4 ${panelBorder} transition-colors ${
                        selected
                          ? "border-black dark:border-white bg-black/[0.03] dark:bg-white/[0.03]"
                          : "hover:border-gray-400 dark:hover:border-neutral-500"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-black dark:text-white">{bank.name}</p>
                        <div className={`w-4 h-4 border flex items-center justify-center ${
                          selected ? "bg-black dark:bg-white border-black dark:border-white" : "border-gray-300 dark:border-neutral-700"
                        }`}>
                          {selected && <Check className="w-3 h-3 text-white dark:text-black" />}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-[9px] tracking-wider text-gray-400 uppercase border border-gray-200 dark:border-neutral-700 px-1.5 py-0.5">{bank.category}</span>
                        <span className="font-mono text-[10px] text-gray-400">{bank._count.questions} questions</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Security */}
        {step === 2 && (
          <div className="space-y-6">
            {SECURITY_GROUPS.map((group) => (
              <div key={group.label}>
                <h3 className="font-mono text-[10px] tracking-[0.3em] text-gray-400 uppercase mb-3 border-b border-black/10 dark:border-white/10 pb-2">
                  {group.label}
                </h3>
                <div className="space-y-2">
                  {group.fields.map((field) => (
                    <div key={field.key} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-black dark:text-white">{field.label}</span>
                      <button
                        onClick={() => toggleSetting(field.key)}
                        className={toggleCls(!!settings[field.key])}
                      >
                        <span className={toggleDot(!!settings[field.key])} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 4: Review */}
        {step === 3 && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className={labelCls}>Assessment Details</h3>
              <div className="space-y-2 mt-2">
                <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                  <span className="font-mono text-xs text-gray-500">Title</span>
                  <span className="text-sm font-semibold text-black dark:text-white">{title}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                  <span className="font-mono text-xs text-gray-500">Duration</span>
                  <span className="text-sm text-black dark:text-white">{duration} min</span>
                </div>
                <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                  <span className="font-mono text-xs text-gray-500">Passing Score</span>
                  <span className="text-sm text-black dark:text-white">{passingScore}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                  <span className="font-mono text-xs text-gray-500">Max Attempts</span>
                  <span className="text-sm text-black dark:text-white">{maxAttempts}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                  <span className="font-mono text-xs text-gray-500">Question Banks</span>
                  <span className="text-sm text-black dark:text-white">{selectedBanks.length} selected</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className={labelCls}>Security Settings Enabled</h3>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {Object.entries(settings)
                  .filter(([, v]) => v)
                  .map(([k]) => (
                    <span key={k} className="border border-black/15 dark:border-white/15 px-2 py-0.5 font-mono text-[9px] text-black/70 dark:text-white/70">
                      {k.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                  ))}
                {Object.values(settings).every((v) => !v) && (
                  <span className="font-mono text-xs text-gray-400">None enabled</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-5">
        <button
          onClick={() => step > 0 && setStep(step - 1)}
          disabled={step === 0}
          className="flex items-center gap-2 px-4 py-2 font-mono text-xs tracking-wider border border-black/20 dark:border-white/25 text-gray-600 dark:text-gray-400 hover:border-black dark:hover:border-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Previous
        </button>

        <div className="flex gap-2">
          {step === 3 ? (
            <>
              <button
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 font-mono text-xs tracking-wider border border-black/20 dark:border-white/25 text-black dark:text-white hover:border-black dark:hover:border-white disabled:opacity-60 transition-colors"
              >
                <Save className="w-3.5 h-3.5" /> Save as Draft
              </button>
              <button
                onClick={() => handleSubmit(true)}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 font-mono text-xs tracking-wider bg-black dark:bg-white text-white dark:text-black hover:opacity-90 disabled:opacity-60 transition-opacity"
              >
                <Check className="w-3.5 h-3.5" /> Publish
              </button>
            </>
          ) : (
            <button
              onClick={() => canNext() && setStep(step + 1)}
              disabled={!canNext()}
              className="flex items-center gap-2 px-4 py-2 font-mono text-xs tracking-wider bg-black dark:bg-white text-white dark:text-black hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </DashboardPageShell>
  );
}
