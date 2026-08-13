"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Clock,
  Loader2,
  Minus,
  Plus,
  Search,
  Timer,
  X,
} from "lucide-react";
import type { CompetitionState } from "@/hooks/useQuestionCompetition";

export type RaceMode = "first_solve" | "timed";

export interface RaceSettingsDraft {
  excludeTopics: string[];
  questionCount: number;
  includedQuestionIds: string[];
  mode: RaceMode;
  durationSeconds: number | null;
}

export interface RaceCatalogQuestion {
  id: string;
  title: string;
  topic: string;
  level: string;
}

const DURATION_OPTIONS = [
  { seconds: 600, label: "10m" },
  { seconds: 900, label: "15m" },
  { seconds: 1800, label: "30m" },
  { seconds: 2700, label: "45m" },
  { seconds: 3600, label: "60m" },
];

function draftFromCompetition(competition: CompetitionState): RaceSettingsDraft {
  const settings = competition.settings;
  return {
    excludeTopics: settings?.excludeTopics ?? [],
    questionCount: settings?.questionCount ?? 1,
    includedQuestionIds: settings?.includedQuestionIds ?? [],
    mode: settings?.mode === "timed" ? "timed" : "first_solve",
    durationSeconds:
      settings?.mode === "timed"
        ? settings.durationSeconds ?? 900
        : settings?.durationSeconds ?? 900,
  };
}

function draftsEqual(a: RaceSettingsDraft, b: RaceSettingsDraft) {
  return (
    a.mode === b.mode &&
    a.questionCount === b.questionCount &&
    a.durationSeconds === b.durationSeconds &&
    a.excludeTopics.join("|") === b.excludeTopics.join("|") &&
    a.includedQuestionIds.join("|") === b.includedQuestionIds.join("|")
  );
}

interface RaceSettingsPanelProps {
  competition: CompetitionState;
  isHost: boolean;
  topics: string[];
  questions: RaceCatalogQuestion[];
  catalogLoading?: boolean;
  saving?: boolean;
  onSave: (draft: RaceSettingsDraft) => Promise<void> | void;
}

export default function RaceSettingsPanel({
  competition,
  isHost,
  topics,
  questions,
  catalogLoading = false,
  saving = false,
  onSave,
}: RaceSettingsPanelProps) {
  const serverDraft = useMemo(
    () => draftFromCompetition(competition),
    [competition],
  );
  const [draft, setDraft] = useState<RaceSettingsDraft>(serverDraft);
  const [search, setSearch] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    setDraft(serverDraft);
  }, [serverDraft]);

  const dirty = !draftsEqual(draft, serverDraft);

  const questionById = useMemo(() => {
    const map = new Map<string, RaceCatalogQuestion>();
    for (const q of questions) map.set(q.id, q);
    for (const q of competition.questions ?? []) {
      if (!map.has(q.id)) {
        map.set(q.id, {
          id: q.id,
          title: q.title,
          topic: q.topic,
          level: q.level,
        });
      }
    }
    return map;
  }, [questions, competition.questions]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return questions
      .filter((item) => {
        if (draft.includedQuestionIds.includes(item.id)) return false;
        return (
          item.title.toLowerCase().includes(q) ||
          item.topic.toLowerCase().includes(q) ||
          item.level.toLowerCase().includes(q)
        );
      })
      .slice(0, 6);
  }, [search, questions, draft.includedQuestionIds]);

  const randomSlots = Math.max(
    0,
    draft.questionCount - draft.includedQuestionIds.length,
  );

  async function handleSave() {
    if (!isHost || saving) return;
    if (draft.includedQuestionIds.length > draft.questionCount) {
      setLocalError("Specific questions cannot exceed the question count.");
      return;
    }
    setLocalError("");
    try {
      await onSave(draft);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1600);
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Could not save settings",
      );
    }
  }

  function toggleTopic(topic: string) {
    if (!isHost) return;
    setDraft((prev) => {
      const exists = prev.excludeTopics.includes(topic);
      return {
        ...prev,
        excludeTopics: exists
          ? prev.excludeTopics.filter((t) => t !== topic)
          : [...prev.excludeTopics, topic],
      };
    });
  }

  function setCount(next: number) {
    if (!isHost) return;
    const clamped = Math.min(5, Math.max(1, next));
    setDraft((prev) => ({
      ...prev,
      questionCount: clamped,
      includedQuestionIds: prev.includedQuestionIds.slice(0, clamped),
    }));
  }

  function addQuestion(id: string) {
    if (!isHost) return;
    setDraft((prev) => {
      if (prev.includedQuestionIds.includes(id)) return prev;
      if (prev.includedQuestionIds.length >= prev.questionCount) {
        setLocalError("Raise the question count to include more problems.");
        return prev;
      }
      setLocalError("");
      setSearch("");
      return {
        ...prev,
        includedQuestionIds: [...prev.includedQuestionIds, id],
      };
    });
  }

  function removeQuestion(id: string) {
    if (!isHost) return;
    setDraft((prev) => ({
      ...prev,
      includedQuestionIds: prev.includedQuestionIds.filter((qid) => qid !== id),
    }));
  }

  const modeLabel =
    draft.mode === "timed" ? "Timed race" : "First to finish";
  const durationLabel =
    DURATION_OPTIONS.find((d) => d.seconds === draft.durationSeconds)?.label ??
    (draft.durationSeconds ? `${Math.round(draft.durationSeconds / 60)}m` : "—");

  if (!isHost) {
    return (
      <section className="border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-black">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
            Race setup
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
            Host locked
          </span>
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <dt className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
              Mode
            </dt>
            <dd className="font-mono text-sm text-black dark:text-white">
              {modeLabel}
              {draft.mode === "timed" ? ` · ${durationLabel}` : ""}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
              Questions
            </dt>
            <dd className="font-mono text-sm text-black dark:text-white">
              {draft.questionCount}
              {draft.includedQuestionIds.length > 0
                ? ` · ${draft.includedQuestionIds.length} picked`
                : " · random"}
            </dd>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <dt className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
              Avoiding
            </dt>
            <dd className="font-mono text-sm text-black dark:text-white">
              {draft.excludeTopics.length > 0
                ? draft.excludeTopics.join(", ")
                : "No topics excluded"}
            </dd>
          </div>
          {draft.includedQuestionIds.length > 0 ? (
            <div className="space-y-2 sm:col-span-2">
              <dt className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
                Included problems
              </dt>
              <dd className="space-y-1.5">
                {draft.includedQuestionIds.map((id) => {
                  const q = questionById.get(id);
                  return (
                    <div
                      key={id}
                      className="truncate font-mono text-xs text-gray-700 dark:text-gray-300"
                    >
                      {q?.title ?? id}
                    </div>
                  );
                })}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>
    );
  }

  return (
    <section className="border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-black sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
            Race setup
          </h2>
          <p className="mt-1 font-mono text-xs text-gray-500 dark:text-gray-400">
            Configure before you start. Guests see a live summary.
          </p>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
          {saving ? "Saving…" : dirty ? "Unsaved" : savedFlash ? "Saved" : "Ready"}
        </div>
      </div>

      <div className="mt-5 space-y-6">
        {/* Mode */}
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
            Win condition
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                setDraft((prev) => ({
                  ...prev,
                  mode: "first_solve",
                  durationSeconds: null,
                }))
              }
              className={`inline-flex h-10 items-center justify-center gap-2 border font-mono text-xs transition-colors ${
                draft.mode === "first_solve"
                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-gray-200 text-gray-600 hover:border-black dark:border-white/10 dark:text-gray-400 dark:hover:border-white"
              }`}
            >
              <Check className="h-3.5 w-3.5" />
              First to finish
            </button>
            <button
              type="button"
              onClick={() =>
                setDraft((prev) => ({
                  ...prev,
                  mode: "timed",
                  durationSeconds: prev.durationSeconds || 900,
                }))
              }
              className={`inline-flex h-10 items-center justify-center gap-2 border font-mono text-xs transition-colors ${
                draft.mode === "timed"
                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-gray-200 text-gray-600 hover:border-black dark:border-white/10 dark:text-gray-400 dark:hover:border-white"
              }`}
            >
              <Timer className="h-3.5 w-3.5" />
              Timed
            </button>
          </div>
          {draft.mode === "timed" ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {DURATION_OPTIONS.map((option) => (
                <button
                  key={option.seconds}
                  type="button"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      durationSeconds: option.seconds,
                    }))
                  }
                  className={`inline-flex h-8 items-center gap-1.5 border px-3 font-mono text-[11px] transition-colors ${
                    draft.durationSeconds === option.seconds
                      ? "border-black text-black dark:border-white dark:text-white"
                      : "border-gray-200 text-gray-500 hover:border-gray-400 dark:border-white/10 dark:text-gray-400"
                  }`}
                >
                  <Clock className="h-3 w-3" />
                  {option.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
              First player to solve every race problem wins.
            </p>
          )}
          {draft.mode === "timed" ? (
            <p className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
              Most solves when time ends wins. Solving all early still wins.
            </p>
          ) : null}
        </div>

        {/* Question count */}
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
            How many questions
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCount(draft.questionCount - 1)}
              disabled={draft.questionCount <= 1}
              className="inline-flex h-9 w-9 items-center justify-center border border-gray-200 text-black disabled:opacity-40 dark:border-white/10 dark:text-white"
              aria-label="Fewer questions"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[2rem] text-center font-mono text-lg font-semibold text-black dark:text-white">
              {draft.questionCount}
            </span>
            <button
              type="button"
              onClick={() => setCount(draft.questionCount + 1)}
              disabled={draft.questionCount >= 5}
              className="inline-flex h-9 w-9 items-center justify-center border border-gray-200 text-black disabled:opacity-40 dark:border-white/10 dark:text-white"
              aria-label="More questions"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
              {randomSlots > 0
                ? `${randomSlots} random · ${draft.includedQuestionIds.length} picked`
                : "All picked by you"}
            </span>
          </div>
        </div>

        {/* Avoid topics */}
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
            Topics to avoid
          </p>
          {catalogLoading ? (
            <p className="font-mono text-xs text-gray-400">Loading topics…</p>
          ) : topics.length === 0 ? (
            <p className="font-mono text-xs text-gray-400">
              No topics found in the question bank.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {topics.map((topic) => {
                const active = draft.excludeTopics.includes(topic);
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => toggleTopic(topic)}
                    className={`border px-2.5 py-1 font-mono text-[11px] transition-colors ${
                      active
                        ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                        : "border-gray-200 text-gray-600 hover:border-gray-400 dark:border-white/10 dark:text-gray-400"
                    }`}
                  >
                    {topic}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Specific questions */}
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
            Particular questions
          </p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title or topic"
              className="h-10 w-full border border-gray-200 bg-transparent pl-9 pr-3 font-mono text-sm text-black outline-none placeholder:text-gray-400 focus:border-black dark:border-white/10 dark:text-white dark:focus:border-white"
            />
            {searchResults.length > 0 ? (
              <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto border border-gray-200 bg-white dark:border-white/10 dark:bg-black">
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addQuestion(item.id)}
                    className="flex w-full flex-col items-start gap-0.5 border-b border-gray-100 px-3 py-2 text-left last:border-b-0 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/[0.04]"
                  >
                    <span className="font-mono text-xs text-black dark:text-white">
                      {item.title}
                    </span>
                    <span className="font-mono text-[10px] text-gray-400">
                      {item.level}
                      {item.topic ? ` · ${item.topic}` : ""}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {draft.includedQuestionIds.length > 0 ? (
            <ul className="space-y-1.5 pt-1">
              {draft.includedQuestionIds.map((id) => {
                const q = questionById.get(id);
                return (
                  <li
                    key={id}
                    className="flex items-center justify-between gap-2 border border-gray-100 px-3 py-2 dark:border-white/10"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs text-black dark:text-white">
                        {q?.title ?? id}
                      </p>
                      <p className="font-mono text-[10px] text-gray-400">
                        {q?.level ?? ""}
                        {q?.topic ? ` · ${q.topic}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeQuestion(id)}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center text-gray-400 hover:text-black dark:hover:text-white"
                      aria-label="Remove question"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
              Optional. Leave empty to use only random problems.
            </p>
          )}
        </div>

        {(localError || dirty) && (
          <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
            {localError ? (
              <p className="font-mono text-xs text-red-600 dark:text-red-400">
                {localError}
              </p>
            ) : (
              <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
                Save to sync setup with the lobby.
              </p>
            )}
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!dirty || saving}
              className="inline-flex h-10 items-center justify-center gap-2 border border-black bg-black px-4 font-mono text-xs font-medium text-white transition-colors hover:bg-black/90 disabled:pointer-events-none disabled:opacity-40 dark:border-white dark:bg-white dark:text-black"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save setup"
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
