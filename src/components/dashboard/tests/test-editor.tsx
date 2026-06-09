"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { proxy } from "@/app/proxy";
import { DashboardPageShell, DashboardPageHeader } from "@/components/dashboard/dashboard-page-shell";
import { TestLinkCopy } from "@/components/dashboard/organization/test-link-copy";
import { ChevronLeft, CheckCircle, Plus, Trash2, Save } from "lucide-react";

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

interface AssessmentQuestion {
  id: string;
  order: number;
  points: number;
  bankQuestion?: {
    id: string;
    title: string;
    type: string;
    difficulty: string;
    points: number;
  } | null;
}

interface BankQuestion {
  id: string;
  title: string;
  type: string;
  difficulty: string;
  points: number;
}

interface QuestionBank {
  id: string;
  name: string;
  questions?: BankQuestion[];
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
}

interface TestEditorProps {
  mode: "create" | "edit";
  assessmentId?: string;
}

export default function TestEditor({ mode, assessmentId }: TestEditorProps) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [passingScore, setPassingScore] = useState(60);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [testCode, setTestCode] = useState("");
  const [status, setStatus] = useState("draft");

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedAssessment | null>(null);

  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [addingQuestions, setAddingQuestions] = useState(false);

  const loadAssessment = useCallback(async () => {
    if (!assessmentId) return;
    setLoading(true);
    setError("");
    try {
      const [assessmentRes, questionsRes] = await Promise.all([
        axios.get(`${proxy}/api/v1/assessments/${assessmentId}`),
        axios.get(`${proxy}/api/v1/assessments/${assessmentId}/questions`),
      ]);
      const data = assessmentRes.data.data as Assessment;
      setTitle(data.title);
      setDescription(data.description || "");
      setDuration(data.duration);
      setPassingScore(data.passingScore);
      setMaxAttempts(data.maxAttempts);
      setTestCode(data.testCode);
      setStatus(data.status);
      setQuestions(questionsRes.data.data || []);
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

  useEffect(() => {
    if (!isEdit) return;
    axios
      .get(`${proxy}/api/v1/question-banks`)
      .then((res) => setBanks(res.data.data || []))
      .catch(() => setBanks([]));
  }, [isEdit]);

  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);

  useEffect(() => {
    if (!selectedBankId) {
      setBankQuestions([]);
      setSelectedQuestionIds([]);
      return;
    }
    setSelectedQuestionIds([]);
    axios
      .get(`${proxy}/api/v1/question-banks/${selectedBankId}`)
      .then((res) => setBankQuestions((res.data.data as QuestionBank)?.questions || []))
      .catch(() => setBankQuestions([]));
  }, [selectedBankId]);

  const existingBankQuestionIds = new Set(
    questions.map((q) => q.bankQuestion?.id).filter(Boolean) as string[],
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Test title is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await axios.post(`${proxy}/api/v1/assessments`, {
        title: title.trim(),
        description: description.trim(),
        duration,
        passingScore,
        maxAttempts,
      });
      setCreated(res.data.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to create test. Please try again.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit() {
    if (!assessmentId || !title.trim()) {
      setError("Test title is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await axios.put(`${proxy}/api/v1/assessments/${assessmentId}`, {
        title: title.trim(),
        description: description.trim(),
        duration,
        passingScore,
        maxAttempts,
      });
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

  async function handleAddQuestions() {
    if (!assessmentId || selectedQuestionIds.length === 0) return;
    setAddingQuestions(true);
    setError("");
    try {
      await axios.post(`${proxy}/api/v1/assessments/${assessmentId}/questions`, {
        bankQuestionIds: selectedQuestionIds,
      });
      setSelectedQuestionIds([]);
      await loadAssessment();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to add questions.";
      setError(msg);
    } finally {
      setAddingQuestions(false);
    }
  }

  async function handleRemoveQuestion(questionId: string) {
    if (!assessmentId) return;
    setError("");
    try {
      await axios.delete(`${proxy}/api/v1/assessments/${assessmentId}/questions/${questionId}`);
      await loadAssessment();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to remove question.";
      setError(msg);
    }
  }

  function toggleQuestionSelection(id: string) {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id],
    );
  }

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
          <h2 className="font-mono text-lg font-bold text-black dark:text-white mb-1">Test Created</h2>
          <p className="font-mono text-xs text-gray-400 mb-6">
            Share this link or code with candidates so they can join via the ENUM desktop app.
          </p>
          <p className="text-sm font-semibold text-black dark:text-white mb-4">{created.title}</p>
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

  const breadcrumb = (
    <Link
      href="/dashboard/tests"
      className="inline-flex items-center gap-1 hover:text-black dark:hover:text-white transition-colors"
    >
      <ChevronLeft className="w-3 h-3" /> Tests
    </Link>
  );

  if (isEdit) {
    return (
      <DashboardPageShell maxWidth="6xl">
        <DashboardPageHeader
          breadcrumb={breadcrumb}
          title="Edit Test"
          description="Update assessment details and manage questions."
        />

        {error && <p className="font-mono text-xs text-red-500 mb-4">{error}</p>}

        <div className="space-y-5">
          <div className={`${panelSurface} p-6 max-w-2xl space-y-5`}>
            <div>
              <label className={labelCls}>Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${inputCls} min-h-[80px] resize-y`}
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
          </div>

          {testCode && <TestLinkCopy testCode={testCode} />}

          <div className={`${panelSurface} p-6`}>
            <h3 className="font-mono text-xs font-bold text-black dark:text-white uppercase mb-4">
              Questions ({questions.length})
            </h3>
            {questions.length === 0 ? (
              <p className="font-mono text-xs text-gray-400 mb-4">No questions added yet.</p>
            ) : (
              <div className="space-y-2 mb-6">
                {questions.map((q, i) => (
                  <div
                    key={q.id}
                    className={`flex items-center justify-between gap-3 p-3 ${panelBorder}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-black dark:text-white truncate">
                        {i + 1}. {q.bankQuestion?.title ?? "Question"}
                      </p>
                      <p className="font-mono text-[10px] text-gray-400">
                        {q.bankQuestion?.type} · {q.bankQuestion?.difficulty} · {q.points} pts
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(q.id)}
                      className={`shrink-0 p-1.5 ${panelBorder} text-gray-400 hover:text-red-500 hover:border-red-400 transition-colors`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-black/10 dark:border-white/10 pt-5 space-y-3">
              <h4 className={labelCls}>Add from Question Bank</h4>
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className={inputCls}
              >
                <option value="">Select a question bank…</option>
                {banks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name}
                  </option>
                ))}
              </select>
              {selectedBankId && bankQuestions.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {bankQuestions
                    .filter((bq) => !existingBankQuestionIds.has(bq.id))
                    .map((bq) => (
                      <label
                        key={bq.id}
                        className={`flex items-center gap-3 p-2 cursor-pointer ${panelBorder} hover:border-black dark:hover:border-white transition-colors`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedQuestionIds.includes(bq.id)}
                          onChange={() => toggleQuestionSelection(bq.id)}
                          className="shrink-0"
                        />
                        <span className="text-sm text-black dark:text-white truncate">{bq.title}</span>
                        <span className="font-mono text-[10px] text-gray-400 shrink-0">{bq.type}</span>
                      </label>
                    ))}
                </div>
              )}
              {selectedBankId && bankQuestions.length === 0 && (
                <p className="font-mono text-xs text-gray-400">This bank has no questions.</p>
              )}
              <button
                type="button"
                onClick={handleAddQuestions}
                disabled={addingQuestions || selectedQuestionIds.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 font-mono text-xs tracking-wider bg-black dark:bg-white text-white dark:text-black hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <Plus className="w-3.5 h-3.5" />
                {addingQuestions ? "Adding…" : `Add ${selectedQuestionIds.length || ""} Question${selectedQuestionIds.length === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
        </div>
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell maxWidth="6xl">
      <DashboardPageHeader
        breadcrumb={breadcrumb}
        title="Create Test"
        description="Set up a new assessment. A unique test link will be generated automatically."
      />

      <form onSubmit={handleCreate} className={`${panelSurface} p-6 max-w-2xl space-y-5`}>
        <div>
          <label className={labelCls}>Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputCls}
            placeholder="e.g. Backend Engineering Assessment"
            autoFocus
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

        {error && <p className="font-mono text-xs text-red-500">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
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
      </form>
    </DashboardPageShell>
  );
}
