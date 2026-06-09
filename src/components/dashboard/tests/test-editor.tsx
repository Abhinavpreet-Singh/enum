"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { proxy } from "@/app/proxy";
import { DashboardPageShell, DashboardPageHeader } from "@/components/dashboard/dashboard-page-shell";
import { TestLinkCopy } from "@/components/dashboard/organization/test-link-copy";
import { ChevronLeft, CheckCircle, Save } from "lucide-react";
import TestQuestionsTab from "./test-questions-tab";
import {
  type TestEditorTab,
  type AssessmentSettingsForm,
  defaultAssessmentSettings,
} from "./test-editor-types";

const panelBorder = "border border-black/20 dark:border-white/25";
const panelSurface = `${panelBorder} bg-white/80 backdrop-blur-[2px] dark:bg-black/75`;
const inputCls =
  "w-full border border-gray-300 dark:border-neutral-700 bg-white dark:bg-black px-3 py-2 font-mono text-xs text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors";
const labelCls =
  "block font-mono text-[10px] tracking-[0.2em] text-gray-500 dark:text-gray-400 uppercase mb-1.5";

interface CreatedAssessment {
  id: string;
  title: string;
  testCode: string;
  status: string;
  duration: number;
}

interface Assessment {
  id: string;
  title: string;
  description: string;
  duration: number;
  passingScore: number;
  maxAttempts: number;
  testCode: string;
  status: string;
  settings?: Partial<AssessmentSettingsForm> | null;
  accessType?: string;
  accessPassword?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

interface TestEditorProps {
  mode: "create" | "edit";
  assessmentId?: string;
  initialTab?: TestEditorTab;
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
        checked ? "bg-black dark:bg-white" : "bg-gray-200 dark:bg-neutral-700"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow transition-transform ${
          checked
            ? "translate-x-4 bg-white dark:bg-black"
            : "translate-x-0 bg-white dark:bg-neutral-400"
        }`}
      />
    </button>
  );
}

function SettingRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-black/5 dark:border-white/5 last:border-0">
      <div className="min-w-0">
        <p className="font-mono text-xs text-black dark:text-white">{label}</p>
        {description && (
          <p className="font-mono text-[10px] text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h4 className="font-mono text-[10px] tracking-[0.2em] text-gray-500 dark:text-gray-400 uppercase mb-1 mt-5 first:mt-0">
      {title}
    </h4>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TestEditor({ mode, assessmentId, initialTab }: TestEditorProps) {
  const router = useRouter();
  const isEdit = mode === "edit";

  // General
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [passingScore, setPassingScore] = useState(60);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [testCode, setTestCode] = useState("");
  const [status, setStatus] = useState("draft");

  // Access
  const [accessType, setAccessType] = useState<"public" | "invite_only" | "password">("public");
  const [accessPassword, setAccessPassword] = useState("");

  // Security
  const [settings, setSettings] = useState<AssessmentSettingsForm>(defaultAssessmentSettings());

  // UI state — in create mode the Questions tab auto-creates then redirects to edit
  const [activeTab, setActiveTab] = useState<TestEditorTab>(initialTab ?? "general");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedAssessment | null>(null);

  const tabs: TestEditorTab[] = ["general", "questions", "security", "access"];

  const tabLabels: Record<TestEditorTab, string> = {
    general: "General",
    questions: "Questions",
    security: "Security",
    access: "Access",
  };

  function setSetting<K extends keyof AssessmentSettingsForm>(
    key: K,
    value: AssessmentSettingsForm[K],
  ) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  const loadAssessment = useCallback(async () => {
    if (!assessmentId) return;
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${proxy}/api/v1/assessments/${assessmentId}`);
      const data = res.data.data as Assessment;
      setTitle(data.title);
      setDescription(data.description || "");
      setDuration(data.duration);
      setPassingScore(data.passingScore);
      setMaxAttempts(data.maxAttempts);
      setTestCode(data.testCode);
      setStatus(data.status);
      setAccessType((data.accessType as "public" | "invite_only" | "password") || "public");
      setAccessPassword(data.accessPassword || "");
      setStartDate(
        data.startDate ? new Date(data.startDate).toISOString().slice(0, 16) : "",
      );
      setEndDate(data.endDate ? new Date(data.endDate).toISOString().slice(0, 16) : "");
      if (data.settings) {
        setSettings({ ...defaultAssessmentSettings(), ...data.settings });
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to load test.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    if (isEdit) loadAssessment();
  }, [isEdit, loadAssessment]);

  const buildPayload = () => ({
    title: title.trim(),
    description: description.trim(),
    duration,
    passingScore,
    maxAttempts,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    accessType,
    accessPassword: accessType === "password" ? accessPassword : undefined,
    settings,
  });

  async function handleCreate(
    e: React.FormEvent | null,
    opts: { redirectToQuestions?: boolean } = {},
  ) {
    e?.preventDefault();
    if (!title.trim()) {
      setError("Test title is required.");
      setActiveTab("general");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await axios.post(`${proxy}/api/v1/assessments`, buildPayload());
      const assessment = res.data.data as CreatedAssessment;
      if (opts.redirectToQuestions) {
        // Go straight to the edit page with the Questions tab open
        router.push(`/dashboard/tests/${assessment.id}?tab=questions`);
      } else {
        setCreated(assessment);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to create test. Please try again.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  /**
   * Handle tab clicks.
   * In create mode, clicking "Questions" auto-creates the test (if title is set)
   * and redirects to the edit page with the Questions tab preselected.
   */
  function handleTabClick(tab: TestEditorTab) {
    if (!isEdit && tab === "questions") {
      if (!title.trim()) {
        setError("Enter a test title first before adding questions.");
        setActiveTab("general");
        return;
      }
      // Auto-create then redirect
      handleCreate(null, { redirectToQuestions: true });
      return;
    }
    setActiveTab(tab);
  }

  async function handleSaveEdit() {
    if (!assessmentId || !title.trim()) {
      setError("Test title is required.");
      setActiveTab("general");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await axios.put(`${proxy}/api/v1/assessments/${assessmentId}`, buildPayload());
      router.push("/dashboard/tests");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to save test.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  // ─── Loading / success states ─────────────────────────────────────────────

  if (isEdit && loading) {
    return (
      <DashboardPageShell maxWidth="6xl">
        <div className="font-mono text-xs text-gray-400">Loading test…</div>
      </DashboardPageShell>
    );
  }

  if (created) {
    return (
      <DashboardPageShell maxWidth="6xl">
        <div className={`${panelSurface} p-8 text-center max-w-lg mx-auto`}>
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="font-mono text-lg font-bold text-black dark:text-white mb-1">
            Test Created
          </h2>
          <p className="font-mono text-xs text-gray-400 mb-6">
            Share this link or code with candidates so they can join via the ENUM desktop app.
          </p>
          <p className="text-sm font-semibold text-black dark:text-white mb-4">
            {created.title}
          </p>
          <TestLinkCopy testCode={created.testCode} />
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <Link
              href={`/dashboard/tests/${created.id}`}
              className="px-4 py-2 font-mono text-xs tracking-wider bg-black dark:bg-white text-white dark:text-black hover:opacity-90 transition-opacity"
            >
              Add Questions
            </Link>
            <Link
              href="/dashboard/tests"
              className={`px-4 py-2 font-mono text-xs tracking-wider ${panelBorder} text-gray-600 dark:text-gray-300 hover:border-black dark:hover:border-white transition-colors`}
            >
              View All Tests
            </Link>
          </div>
        </div>
      </DashboardPageShell>
    );
  }

  // ─── Shared breadcrumb ────────────────────────────────────────────────────

  const breadcrumb = (
    <Link
      href="/dashboard/tests"
      className="inline-flex items-center gap-1 hover:text-black dark:hover:text-white transition-colors"
    >
      <ChevronLeft className="w-3 h-3" /> Tests
    </Link>
  );

  // ─── Tab content renderers ────────────────────────────────────────────────

  const renderGeneralTab = () => (
    <div className={`${panelSurface} p-6 space-y-5`}>
      <div>
        <label className={labelCls}>Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputCls}
          placeholder="e.g. Backend Engineering Assessment"
          autoFocus={!isEdit}
        />
      </div>

      <div>
        <label className={labelCls}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${inputCls} min-h-[80px] resize-y`}
          placeholder="Optional instructions or context for candidates…"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Duration (min)</label>
          <input
            type="number"
            min={5}
            max={480}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Passing Score (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={passingScore}
            onChange={(e) => setPassingScore(Number(e.target.value))}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Max Attempts</label>
          <input
            type="number"
            min={1}
            max={10}
            value={maxAttempts}
            onChange={(e) => setMaxAttempts(Number(e.target.value))}
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Start Date &amp; Time</label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>End Date &amp; Time</label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      {isEdit && testCode && (
        <div className="pt-1">
          <TestLinkCopy testCode={testCode} />
        </div>
      )}

      {isEdit && (
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSaveEdit}
            disabled={saving || !title.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 font-mono text-xs tracking-wider bg-black dark:bg-white text-white dark:text-black hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <span className="font-mono text-[10px] text-gray-400 uppercase">{status}</span>
        </div>
      )}
    </div>
  );

  const renderSecurityTab = () => (
    <div className={`${panelSurface} p-6`}>
      <p className="font-mono text-[10px] text-gray-400 mb-5">
        Configure proctoring and security restrictions for this assessment. These settings apply
        when candidates use the ENUM Desktop App.
      </p>

      <SectionHeader title="Device &amp; OS" />
      <SettingRow
        label="Lock Screen"
        description="Prevent candidates from accessing other apps or the OS"
        checked={settings.lockScreen}
        onChange={(v) => setSetting("lockScreen", v)}
      />
      <SettingRow
        label="Disable Alt+Tab"
        description="Block window switching via keyboard shortcuts"
        checked={settings.disableAltTab}
        onChange={(v) => setSetting("disableAltTab", v)}
      />
      <SettingRow
        label="Disable Windows Key"
        checked={settings.disableWinKey}
        onChange={(v) => setSetting("disableWinKey", v)}
      />
      <SettingRow
        label="Disable Task Switching"
        description="Prevent all methods of switching to other windows"
        checked={settings.disableTaskSwitch}
        onChange={(v) => setSetting("disableTaskSwitch", v)}
      />
      <SettingRow
        label="Disable Multiple Monitors"
        description="Require single-monitor setup"
        checked={settings.disableMultiMonitor}
        onChange={(v) => setSetting("disableMultiMonitor", v)}
      />
      <SettingRow
        label="Force Fullscreen"
        description="Exam window must remain fullscreen"
        checked={settings.forceFullscreen}
        onChange={(v) => setSetting("forceFullscreen", v)}
      />
      <SettingRow
        label="Require Desktop App"
        description="Candidates must use the ENUM desktop client"
        checked={settings.requireDesktopApp}
        onChange={(v) => setSetting("requireDesktopApp", v)}
      />

      <SectionHeader title="Screen Monitoring" />
      <SettingRow
        label="Require Screen Share"
        checked={settings.requireScreenShare}
        onChange={(v) => setSetting("requireScreenShare", v)}
      />
      <SettingRow
        label="Record Screen"
        description="Capture continuous screen recording"
        checked={settings.recordScreen}
        onChange={(v) => setSetting("recordScreen", v)}
      />
      <SettingRow
        label="Periodic Screenshots"
        checked={settings.periodicScreenshots}
        onChange={(v) => setSetting("periodicScreenshots", v)}
      />
      <SettingRow
        label="Live Monitoring"
        description="Enable real-time proctor view"
        checked={settings.liveMonitoring}
        onChange={(v) => setSetting("liveMonitoring", v)}
      />

      <SectionHeader title="Webcam" />
      <SettingRow
        label="Require Webcam"
        checked={settings.requireWebcam}
        onChange={(v) => setSetting("requireWebcam", v)}
      />
      <SettingRow
        label="Record Webcam"
        description="Capture continuous webcam video"
        checked={settings.recordWebcam}
        onChange={(v) => setSetting("recordWebcam", v)}
      />
      <SettingRow
        label="Face Detection"
        description="Alert if no face is detected"
        checked={settings.faceDetection}
        onChange={(v) => setSetting("faceDetection", v)}
      />
      <SettingRow
        label="Multiple Face Detection"
        description="Alert if more than one face appears"
        checked={settings.multipleFaceDetection}
        onChange={(v) => setSetting("multipleFaceDetection", v)}
      />
      <SettingRow
        label="Phone Detection"
        description="Alert if a mobile phone is visible"
        checked={settings.phoneDetection}
        onChange={(v) => setSetting("phoneDetection", v)}
      />
      <SettingRow
        label="Eye Tracking"
        description="Monitor gaze direction for suspicious behaviour"
        checked={settings.eyeTracking}
        onChange={(v) => setSetting("eyeTracking", v)}
      />

      <SectionHeader title="Audio" />
      <SettingRow
        label="Require Microphone"
        checked={settings.requireMicrophone}
        onChange={(v) => setSetting("requireMicrophone", v)}
      />
      <SettingRow
        label="Record Audio"
        checked={settings.recordAudio}
        onChange={(v) => setSetting("recordAudio", v)}
      />
      <SettingRow
        label="Voice Detection"
        description="Alert on background voices"
        checked={settings.voiceDetection}
        onChange={(v) => setSetting("voiceDetection", v)}
      />

      <SectionHeader title="Anti-Cheating" />
      <SettingRow
        label="Copy-Paste Detection"
        description="Log clipboard activity"
        checked={settings.copyPasteDetection}
        onChange={(v) => setSetting("copyPasteDetection", v)}
      />
      <SettingRow
        label="Typing Pattern Analysis"
        checked={settings.typingPatternAnalysis}
        onChange={(v) => setSetting("typingPatternAnalysis", v)}
      />
      <SettingRow
        label="AI Content Detection"
        description="Flag AI-generated responses"
        checked={settings.aiDetection}
        onChange={(v) => setSetting("aiDetection", v)}
      />
      <SettingRow
        label="Developer Tools Detection"
        description="Block and alert on DevTools open"
        checked={settings.devToolsDetection}
        onChange={(v) => setSetting("devToolsDetection", v)}
      />
      <SettingRow
        label="VM Detection"
        description="Flag virtual machine environments"
        checked={settings.vmDetection}
        onChange={(v) => setSetting("vmDetection", v)}
      />
      <SettingRow
        label="Remote Desktop Detection"
        description="Alert if a remote desktop tool is detected"
        checked={settings.remoteDesktopDetection}
        onChange={(v) => setSetting("remoteDesktopDetection", v)}
      />

      <SectionHeader title="Network" />
      <SettingRow
        label="Allow Internet Access"
        description="Candidates can browse during the exam"
        checked={settings.allowInternet}
        onChange={(v) => setSetting("allowInternet", v)}
      />
      <SettingRow
        label="Allow External Sites"
        description="Only relevant if internet access is enabled"
        checked={settings.allowExternalSites}
        onChange={(v) => setSetting("allowExternalSites", v)}
      />

      {isEdit && (
        <div className="flex items-center gap-3 pt-6 mt-2 border-t border-black/10 dark:border-white/10">
          <button
            type="button"
            onClick={handleSaveEdit}
            disabled={saving || !title.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 font-mono text-xs tracking-wider bg-black dark:bg-white text-white dark:text-black hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );

  const renderAccessTab = () => (
    <div className={`${panelSurface} p-6 space-y-5`}>
      <div>
        <label className={labelCls}>Access Type</label>
        <div className="space-y-2 mt-1">
          {(["public", "invite_only", "password"] as const).map((type) => (
            <label
              key={type}
              className={`flex items-start gap-3 p-3 cursor-pointer ${panelBorder} transition-colors ${
                accessType === type
                  ? "border-black dark:border-white"
                  : "hover:border-gray-400 dark:hover:border-gray-500"
              }`}
            >
              <input
                type="radio"
                name="accessType"
                value={type}
                checked={accessType === type}
                onChange={() => setAccessType(type)}
                className="mt-0.5 accent-black dark:accent-white"
              />
              <div>
                <p className="font-mono text-xs text-black dark:text-white">
                  {type === "public"
                    ? "Public"
                    : type === "invite_only"
                    ? "Invite Only"
                    : "Password Protected"}
                </p>
                <p className="font-mono text-[10px] text-gray-400 mt-0.5">
                  {type === "public"
                    ? "Anyone with the test code can join"
                    : type === "invite_only"
                    ? "Only invited candidates can join"
                    : "Candidates must enter a password to join"}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {accessType === "password" && (
        <div>
          <label className={labelCls}>Access Password</label>
          <input
            type="text"
            value={accessPassword}
            onChange={(e) => setAccessPassword(e.target.value)}
            className={inputCls}
            placeholder="Enter a password for candidates"
          />
        </div>
      )}

      {isEdit && (
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSaveEdit}
            disabled={saving || !title.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 font-mono text-xs tracking-wider bg-black dark:bg-white text-white dark:text-black hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <DashboardPageShell maxWidth="6xl">
      <DashboardPageHeader
        breadcrumb={breadcrumb}
        title={isEdit ? "Edit Test" : "Create Test"}
        description={
          isEdit
            ? "Update assessment details, questions and proctoring settings."
            : "Configure your new assessment. A unique test link will be generated on creation."
        }
      />

      {error && (
        <p className="font-mono text-xs text-red-500 mb-4">{error}</p>
      )}

      {/* ── Tab Bar ── */}
      <div className="flex items-center gap-0 border-b border-black/10 dark:border-white/10 mb-5">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => handleTabClick(tab)}
            className={`px-4 py-2.5 font-mono text-[10px] tracking-[0.15em] uppercase transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-black dark:border-white text-black dark:text-white"
                : "border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <form onSubmit={(e) => { if (!isEdit) handleCreate(e); else e.preventDefault(); }}>
        {activeTab === "general" && renderGeneralTab()}

        {activeTab === "questions" && (isEdit ? (
          assessmentId && <TestQuestionsTab testId={assessmentId} />
        ) : (
          /* Create mode: Questions tab shows a prompt to save & continue */
          <div className={`${panelSurface} p-10 text-center`}>
            <p className="font-mono text-xs text-gray-500 mb-4">
              Save your test details first, then you can add questions.
            </p>
            <button
              type="button"
              disabled={saving || !title.trim()}
              onClick={() => handleCreate(null, { redirectToQuestions: true })}
              className="px-5 py-2.5 font-mono text-xs tracking-wider bg-black dark:bg-white text-white dark:text-black hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving ? "Creating…" : "Create Test & Add Questions"}
            </button>
          </div>
        ))}

        {activeTab === "security" && renderSecurityTab()}
        {activeTab === "access" && renderAccessTab()}

        {/* Create mode footer (visible on all tabs except "questions" which has its own button) */}
        {!isEdit && activeTab !== "questions" && (
          <div className="flex items-center gap-3 mt-5">
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="px-5 py-2.5 font-mono text-xs tracking-wider bg-black dark:bg-white text-white dark:text-black hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving ? "Creating…" : "Create Test"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard/tests")}
              className={`px-5 py-2.5 font-mono text-xs tracking-wider ${panelBorder} text-gray-500 hover:border-black dark:hover:border-white transition-colors`}
            >
              Cancel
            </button>
          </div>
        )}
      </form>
    </DashboardPageShell>
  );
}

