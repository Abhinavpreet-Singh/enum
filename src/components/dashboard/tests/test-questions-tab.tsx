"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { proxy } from "@/app/proxy";
import { Plus, Trash2, BookOpen } from "lucide-react";

const panelBorder = "border border-black/20 dark:border-white/25";
const panelSurface = `${panelBorder} bg-white/80 backdrop-blur-[2px] dark:bg-black/75`;
const inputCls =
  "w-full border border-gray-300 dark:border-neutral-700 bg-white dark:bg-black px-3 py-2 font-mono text-xs text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors";
const labelCls =
  "block font-mono text-[10px] tracking-[0.2em] text-gray-500 dark:text-gray-400 uppercase mb-1.5";

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
  _count: { questions: number };
}

interface AssessmentQuestionRow {
  id: string;
  order: number;
  points: number;
  bankQuestion?: BankQuestion | null;
}

export default function TestQuestionsTab({ testId }: { testId: string }) {
  const [assessmentQuestions, setAssessmentQuestions] = useState<AssessmentQuestionRow[]>([]);
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const errors: string[] = [];

    const [qResult, banksResult] = await Promise.allSettled([
      axios.get(`${proxy}/api/v1/assessments/${testId}/questions`),
      axios.get(`${proxy}/api/v1/question-banks`),
    ]);

    if (qResult.status === "fulfilled") {
      setAssessmentQuestions(qResult.value.data.data || []);
    } else {
      errors.push("Could not load test questions.");
    }

    if (banksResult.status === "fulfilled") {
      const bankList: QuestionBank[] = banksResult.value.data.data || [];
      setBanks(bankList);
      setSelectedBankId((prev) => prev || bankList[0]?.id || "");
    } else {
      const msg =
        (banksResult.reason as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Could not load question banks.";
      errors.push(msg);
      setBanks([]);
    }

    if (errors.length) setError(errors.join(" "));
    setLoading(false);
  }, [testId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedBankId) {
      setBankQuestions([]);
      return;
    }
    axios
      .get(`${proxy}/api/v1/question-banks/${selectedBankId}`)
      .then((r) => setBankQuestions(r.data.data?.questions || []))
      .catch((err: unknown) => {
        setBankQuestions([]);
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Could not load bank questions.";
        setError((prev) => prev || msg);
      });
  }, [selectedBankId]);

  const alreadyAdded = new Set(
    assessmentQuestions.map((q) => q.bankQuestion?.id).filter(Boolean) as string[],
  );

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAddQuestions() {
    if (selectedIds.size === 0) return;
    setSaving(true);
    setError("");
    try {
      await axios.post(`${proxy}/api/v1/assessments/${testId}/questions`, {
        bankQuestionIds: Array.from(selectedIds),
      });
      setSelectedIds(new Set());
      await load();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to add questions.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(questionId: string) {
    setSaving(true);
    try {
      await axios.delete(`${proxy}/api/v1/assessments/${testId}/questions/${questionId}`);
      await load();
    } catch {
      setError("Failed to remove question.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className={`${panelSurface} p-8 animate-pulse h-48`} />;
  }

  return (
    <div className="space-y-4">
      {error && <p className="font-mono text-xs text-red-500">{error}</p>}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className={`${panelSurface} p-5`}>
          <h2 className="font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase mb-4">
            In this test ({assessmentQuestions.length})
          </h2>
          {assessmentQuestions.length === 0 ? (
            <p className="font-mono text-xs text-gray-400 py-6 text-center">
              No questions yet. Add from a question bank on the right.
            </p>
          ) : (
            <ul className="space-y-2">
              {assessmentQuestions.map((q, i) => (
                <li key={q.id} className={`flex items-center gap-3 p-3 ${panelBorder}`}>
                  <span className="font-mono text-[10px] text-gray-400 w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-black dark:text-white truncate">
                      {q.bankQuestion?.title || "Question"}
                    </p>
                    <p className="font-mono text-[10px] text-gray-400">
                      {q.bankQuestion?.type} · {q.points} pts
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(q.id)}
                    disabled={saving}
                    className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={`${panelSurface} p-5`}>
          <h2 className="font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase mb-4">
            Add from question bank
          </h2>

          {banks.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
              <p className="font-mono text-xs text-gray-400 mb-3">Create a question bank first.</p>
              <Link
                href="/dashboard/question-banks"
                className="font-mono text-xs text-black dark:text-white hover:underline"
              >
                Go to Question Banks
              </Link>
            </div>
          ) : (
            <>
              <label className={labelCls}>Question bank</label>
              <select
                value={selectedBankId}
                onChange={(e) => {
                  setSelectedBankId(e.target.value);
                  setSelectedIds(new Set());
                }}
                className={`${inputCls} mb-4`}
              >
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b._count.questions})
                  </option>
                ))}
              </select>

              <ul className="space-y-2 max-h-80 overflow-y-auto mb-4">
                {bankQuestions.length === 0 ? (
                  <p className="font-mono text-xs text-gray-400 py-4 text-center">This bank has no questions.</p>
                ) : (
                  bankQuestions.map((bq) => {
                    const added = alreadyAdded.has(bq.id);
                    const selected = selectedIds.has(bq.id);
                    return (
                      <li key={bq.id}>
                        <label
                          className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${panelBorder} ${
                            added
                              ? "opacity-40 cursor-not-allowed"
                              : selected
                              ? "border-black dark:border-white"
                              : "hover:border-gray-500"
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={added}
                            checked={selected}
                            onChange={() => toggleSelect(bq.id)}
                            className="accent-black dark:accent-white"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-black dark:text-white truncate">{bq.title}</p>
                            <p className="font-mono text-[10px] text-gray-400">
                              {bq.type} · {bq.difficulty} · {bq.points} pts
                              {added ? " · already added" : ""}
                            </p>
                          </div>
                        </label>
                      </li>
                    );
                  })
                )}
              </ul>

              <button
                type="button"
                onClick={handleAddQuestions}
                disabled={saving || selectedIds.size === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-mono text-xs tracking-wider hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <Plus className="w-3.5 h-3.5" />
                {saving ? "Adding…" : `Add ${selectedIds.size || ""} question${selectedIds.size === 1 ? "" : "s"}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
