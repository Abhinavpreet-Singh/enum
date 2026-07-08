"use client";

import { API_BASE_URL } from "@/lib/api-config";
import api from "@/lib/api";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, BookOpen, Search, Check } from "lucide-react";

const panelBorder = "border border-black/20 dark:border-white/25";
const panelSurface = `${panelBorder} bg-white/80 backdrop-blur-[2px] dark:bg-black/75`;
const inputCls =
  "w-full border border-gray-300 dark:border-neutral-700 bg-white dark:bg-black px-3 py-2 font-mono text-xs text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors";
const labelCls =
  "block font-mono text-[10px] tracking-[0.2em] text-gray-500 dark:text-gray-400 uppercase mb-1.5";
const btnGhostCls =
  `px-3 py-2 font-mono text-[10px] tracking-wider uppercase ${panelBorder} text-gray-600 dark:text-gray-300 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-colors disabled:opacity-40`;
const btnPrimaryCls =
  "inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-mono text-xs tracking-wider hover:opacity-90 disabled:opacity-50 transition-opacity";

interface BankQuestion {
  id: string;
  title: string;
  type: string;
  difficulty: string;
  points: number;
  tags?: string[];
}

function platformSourceFromTags(tags: string[] = []): string | null {
  if (tags.includes("dsa")) return "DSA Arena";
  if (tags.includes("linux")) return "Linux Arena";
  if (tags.includes("system_design")) return "System Design";
  return null;
}

function SelectBox({ checked, disabled }: { checked: boolean; disabled?: boolean }) {
  return (
    <span
      className={`grid h-4 w-4 shrink-0 place-items-center border transition-colors ${
        checked
          ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
          : "border-gray-300 bg-white dark:border-neutral-600 dark:bg-black"
      } ${disabled ? "opacity-40" : ""}`}
    >
      {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
    </span>
  );
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
  const [searchQ, setSearchQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const errors: string[] = [];

    const [qResult, banksResult] = await Promise.allSettled([
      api.get(`/api/v1/assessments/${testId}/questions`),
      api.get("/api/v1/question-banks"),
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
    api
      .get(`/api/v1/question-banks/${selectedBankId}`)
      .then((r) => {
        const qs: BankQuestion[] = r.data.data?.questions || [];
        const typeOrder: Record<string, number> = {
          mcq: 0, msq: 1, numerical: 2, fill_blank: 3, system_design: 4, coding: 5, sql: 6, linux: 7,
        };
        qs.sort((a, b) => (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99));
        setBankQuestions(qs);
      })
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

  const visibleQuestions = bankQuestions.filter((bq) => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return true;
    return (
      bq.title.toLowerCase().includes(q) ||
      bq.type.toLowerCase().includes(q) ||
      bq.difficulty.toLowerCase().includes(q) ||
      (platformSourceFromTags(bq.tags) || "").toLowerCase().includes(q)
    );
  });

  function toggleSelect(id: string) {
    if (alreadyAdded.has(id)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedIds(
      new Set(visibleQuestions.filter((bq) => !alreadyAdded.has(bq.id)).map((bq) => bq.id)),
    );
  }

  async function handleAddQuestions() {
    if (selectedIds.size === 0) return;
    setSaving(true);
    setError("");
    try {
      await api.post(`/api/v1/assessments/${testId}/questions`, {
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
      await api.delete(`/api/v1/assessments/${testId}/questions/${questionId}`);
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
      {error && (
        <div className={`${panelBorder} border-red-300 bg-red-50 px-4 py-3 font-mono text-xs text-red-600 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300`}>
          {error}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* In test */}
        <div className={`${panelSurface} p-5`}>
          <h2 className={`${labelCls} mb-4`}>
            In this test ({assessmentQuestions.length})
          </h2>
          {assessmentQuestions.length === 0 ? (
            <div className="py-10 text-center">
              <p className="font-mono text-xs text-gray-400">No questions yet.</p>
              <p className="mt-1 font-mono text-[10px] text-gray-400">Select from a bank on the right →</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {assessmentQuestions.map((q, i) => (
                <li key={q.id} className={`flex items-center gap-3 p-3 ${panelBorder}`}>
                  <span className="w-5 shrink-0 font-mono text-[10px] text-gray-400">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-black dark:text-white">
                      {q.bankQuestion?.title || "Question"}
                    </p>
                    <p className="font-mono text-[10px] text-gray-400">
                      {q.bankQuestion?.type} · {q.points} pts
                      {platformSourceFromTags(q.bankQuestion?.tags)
                        ? ` · ${platformSourceFromTags(q.bankQuestion?.tags)}`
                        : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(q.id)}
                    disabled={saving}
                    className="text-gray-400 transition-colors hover:text-red-500 disabled:opacity-50"
                    aria-label="Remove question"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add from bank */}
        <div className={`${panelSurface} p-5`}>
          <h2 className={`${labelCls} mb-4`}>Add from question bank</h2>

          {banks.length === 0 ? (
            <div className="py-8 text-center">
              <BookOpen className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-700" />
              <p className="font-mono text-xs text-gray-400 mb-3">Create a question bank first.</p>
              <p className="mb-4 font-mono text-[10px] text-gray-400">
                Use Create Sample Banks or import from the Enum platform library.
              </p>
              <Link
                href="/dashboard/question-banks"
                className="font-mono text-xs font-semibold uppercase tracking-wider text-black hover:underline dark:text-white"
              >
                Go to Question Banks →
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
                  setSearchQ("");
                }}
                className={`${inputCls} mb-4`}
              >
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b._count.questions})
                  </option>
                ))}
              </select>

              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className={`flex min-w-[160px] flex-1 items-center gap-2 px-3 py-2 ${panelBorder}`}>
                  <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <input
                    type="text"
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    placeholder="Search questions…"
                    className="w-full bg-transparent font-mono text-xs text-black outline-none placeholder:text-gray-400 dark:text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={selectAllVisible}
                  disabled={visibleQuestions.length === 0}
                  className={btnGhostCls}
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  disabled={selectedIds.size === 0}
                  className={btnGhostCls}
                >
                  Clear
                </button>
              </div>

              <ul className="mb-4 max-h-80 space-y-2 overflow-y-auto">
                {visibleQuestions.length === 0 ? (
                  <p className="py-6 text-center font-mono text-xs text-gray-400">
                    {searchQ ? "No matches for your search." : "This bank has no questions."}
                  </p>
                ) : (
                  visibleQuestions.map((bq) => {
                    const added = alreadyAdded.has(bq.id);
                    const selected = selectedIds.has(bq.id);
                    const source = platformSourceFromTags(bq.tags);
                    return (
                      <li key={bq.id}>
                        <button
                          type="button"
                          disabled={added}
                          onClick={() => toggleSelect(bq.id)}
                          className={`flex w-full items-center gap-3 p-3 text-left transition-colors ${panelBorder} ${
                            added
                              ? "cursor-not-allowed opacity-40"
                              : selected
                              ? "border-black bg-black/[0.03] dark:border-white dark:bg-white/[0.04]"
                              : "hover:border-black/40 dark:hover:border-white/40"
                          }`}
                        >
                          <SelectBox checked={selected} disabled={added} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-black dark:text-white">{bq.title}</p>
                            <p className="font-mono text-[10px] text-gray-400">
                              {bq.type} · {bq.difficulty} · {bq.points} pts
                              {source ? ` · ${source}` : ""}
                              {added ? " · already added" : ""}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>

              <div className="flex items-center justify-between gap-3 border-t border-black/10 pt-4 dark:border-white/10">
                <p className="font-mono text-xs text-gray-500">
                  <span className="font-bold text-black dark:text-white">{selectedIds.size}</span> selected
                </p>
                <button
                  type="button"
                  onClick={handleAddQuestions}
                  disabled={saving || selectedIds.size === 0}
                  className={btnPrimaryCls}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {saving ? "Adding…" : `Add ${selectedIds.size || ""} question${selectedIds.size === 1 ? "" : "s"}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
