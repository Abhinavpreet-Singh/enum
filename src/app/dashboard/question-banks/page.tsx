"use client";

import { API_BASE_URL } from "@/lib/api-config";
import api, { isAxiosError } from "@/lib/api";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardPageShell, DashboardPageHeader } from "@/components/dashboard/dashboard-page-shell";
import {
  Plus, BookOpen, Trash2, Hash, Tag, ChevronRight, Pencil,
  ChevronLeft, X, Check, Code2, ListOrdered, AlignLeft,
  FileText, Database, Terminal, Search, Filter, Download, Sparkles, Network,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type QuestionType = "mcq" | "msq" | "coding" | "fill_blank" | "numerical" | "sql" | "linux" | "system_design";
type PlatformSource = "dsa" | "linux" | "system_design";
type Difficulty = "easy" | "medium" | "hard";
interface Option { text: string; isCorrect: boolean }
interface BankQuestion {
  id: string; bankId: string; type: QuestionType; title: string;
  description: string; difficulty: Difficulty; options: Option[] | null;
  correctAnswer: unknown; codeTemplate: string | null;
  testCases: { input: string; expectedOutput: string; isHidden: boolean }[];
  points: number; tags: string[]; technology: string; topic: string; createdAt: string;
}
interface QuestionBank {
  id: string; name: string; category: string; description: string; tags: string[];
  createdAt: string; questions?: BankQuestion[]; _count: { questions: number };
}

interface PlatformCatalogItem {
  id: string;
  source: PlatformSource;
  sourceLabel?: string;
  title: string;
  description: string;
  difficulty: string;
  topic: string;
}

const PLATFORM_TABS: { id: PlatformSource; label: string; description: string }[] = [
  { id: "dsa", label: "DSA Arena", description: "Coding problems from the DSA arena" },
  { id: "linux", label: "Linux Arena", description: "Shell challenges from the Linux arena" },
  { id: "system_design", label: "System Design", description: "Architecture scenarios from Enum" },
];

function platformSourceFromTags(tags: string[] = []): string | null {
  if (tags.includes("dsa")) return "DSA Arena";
  if (tags.includes("linux")) return "Linux Arena";
  if (tags.includes("system_design")) return "System Design";
  return null;
}

function friendlyCatalogError(message?: string): string {
  if (!message) return "Could not load questions from the Enum platform. Please try again.";
  if (message.includes("prisma") || message.includes("Invalid `")) {
    return "Could not load the question catalog right now. Please refresh or try again in a moment.";
  }
  return message;
}

const TAB_ICONS: Record<PlatformSource, typeof Code2> = {
  dsa: Code2,
  linux: Terminal,
  system_design: Network,
};

function SourceBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center border border-black/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-gray-600 dark:border-white/20 dark:text-gray-300">
      {label}
    </span>
  );
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

// ─── Constants ────────────────────────────────────────────────────────────────

const QUESTION_TYPES: { value: QuestionType; label: string; icon: typeof Code2; desc: string }[] = [
  { value: "mcq",        label: "MCQ",           icon: ListOrdered, desc: "Single correct answer" },
  { value: "msq",        label: "Multi-Select",  icon: Check,       desc: "Multiple correct answers" },
  { value: "coding",     label: "Coding",        icon: Code2,       desc: "Write & run code" },
  { value: "fill_blank", label: "Fill in Blank", icon: AlignLeft,   desc: "Complete the sentence" },
  { value: "numerical",  label: "Numerical",     icon: Hash,        desc: "Numeric answer" },
  { value: "sql",        label: "SQL",           icon: Database,    desc: "Database query" },
  { value: "linux",      label: "Linux / Shell", icon: Terminal,    desc: "Shell command" },
  { value: "system_design", label: "System Design", icon: Network, desc: "Architecture diagram" },
];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const LANGUAGES = ["javascript", "python", "java", "cpp", "c", "go", "rust", "typescript"];
const CATEGORIES = ["all","mcq","coding","sql","linux","frontend","backend","devops","system_design","incident"];

const panelBorder = "border border-black/20 dark:border-white/25";
const panelSurface = `${panelBorder} bg-white/80 backdrop-blur-[2px] dark:bg-black/75`;
const inputCls = "w-full border border-gray-300 dark:border-neutral-700 bg-white dark:bg-black px-3 py-2 font-mono text-xs text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors";
const labelCls = "block font-mono text-[10px] tracking-[0.2em] text-gray-500 dark:text-gray-400 uppercase mb-1.5";
const difficultyColor = (d: string) =>
  d === "easy" ? "text-emerald-600 dark:text-emerald-400 border-emerald-400/40"
  : d === "hard" ? "text-red-500 dark:text-red-400 border-red-400/40"
  : "text-amber-600 dark:text-amber-400 border-amber-400/40";
const typeIcon = (t: string) => QUESTION_TYPES.find(q => q.value === t)?.icon ?? FileText;

const btnGhostCls =
  `px-3 py-2 font-mono text-[10px] tracking-wider uppercase ${panelBorder} text-gray-600 dark:text-gray-300 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-colors disabled:opacity-40`;

const btnPrimaryCls =
  "inline-flex items-center justify-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-mono text-xs tracking-wider hover:opacity-90 disabled:opacity-50 transition-opacity";

function defaultQuestion(type: QuestionType) {
  return {
    type, title: "", description: "", difficulty: "medium" as Difficulty,
    points: 10, tags: [] as string[], technology: "", topic: "",
    options: type === "mcq" || type === "msq"
      ? [{ text: "", isCorrect: false }, { text: "", isCorrect: false },
         { text: "", isCorrect: false }, { text: "", isCorrect: false }]
      : null,
    correctAnswer: null as unknown,
    codeTemplate: (type === "coding" || type === "sql" || type === "linux") ? "" : null,
    codeLanguage: "javascript",
    testCases: (type === "coding" || type === "sql" || type === "linux")
      ? [{ input: "", expectedOutput: "", isHidden: false }] : [],
    blanks: type === "fill_blank" ? [""] : [] as string[],
    numericalAnswer: "", numericalTolerance: "0",
  };
}
type QuestionDraft = ReturnType<typeof defaultQuestion>;

// ─── Inner component (uses useSearchParams) ───────────────────────────────────

function QuestionBanksInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bankId = searchParams.get("bankId");
  const importParam = searchParams.get("import") as PlatformSource | null;

  // ── Bank list state ──
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("mcq");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ── Bank detail state ──
  const [bank, setBank] = useState<QuestionBank | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [filterType, setFilterType] = useState<"all" | QuestionType>("all");
  const [filterDiff, setFilterDiff] = useState<"all" | Difficulty>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<QuestionDraft>(defaultQuestion("mcq"));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [qDeleteConfirm, setQDeleteConfirm] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importSource, setImportSource] = useState<PlatformSource>("dsa");
  const [catalog, setCatalog] = useState<{
    dsa: PlatformCatalogItem[];
    linux: PlatformCatalogItem[];
    system_design: PlatformCatalogItem[];
    counts?: { dsa: number; linux: number; system_design: number };
  }>({ dsa: [], linux: [], system_design: [] });
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedImportIds, setSelectedImportIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [importSearch, setImportSearch] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState("");

  // ── Fetch bank list ──
  const fetchBanks = useCallback(() => {
    setListLoading(true);
    const params: Record<string, string> = {};
    if (categoryFilter !== "all") params.category = categoryFilter;
    api.get("/api/v1/question-banks", { params })
      .then(r => setBanks(r.data.data || []))
      .catch(() => setBanks([]))
      .finally(() => setListLoading(false));
  }, [categoryFilter]);

  useEffect(() => { fetchBanks(); }, [fetchBanks]);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError("");
    try {
      const res = await api.get("/api/v1/question-banks/catalog/platform");
      const data = res.data.data || {};
      setCatalog({
        dsa: data.dsa || [],
        linux: data.linux || [],
        system_design: data.system_design || [],
        counts: data.counts,
      });
    } catch (err) {
      const raw = isAxiosError(err) ? err.response?.data?.message : undefined;
      setCatalogError(friendlyCatalogError(raw));
      setCatalog({ dsa: [], linux: [], system_design: [] });
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!bankId) loadCatalog();
  }, [bankId, loadCatalog]);

  const openImport = (source: PlatformSource = "dsa") => {
    setImportSource(source);
    setShowImport(true);
    setSelectedImportIds(new Set());
    setImportError("");
    setImportSearch("");
    loadCatalog();
  };

  function catalogItemsForSource(source: PlatformSource) {
    const items = catalog[source] || [];
    const q = importSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.topic.toLowerCase().includes(q),
    );
  }

  function selectAllVisible() {
    setSelectedImportIds(new Set(catalogItemsForSource(importSource).map((i) => i.id)));
  }

  // ── Fetch bank detail when bankId param changes ──
  const fetchBank = useCallback(() => {
    if (!bankId) { setBank(null); return; }
    setDetailLoading(true);
    api.get(`/api/v1/question-banks/${bankId}`)
      .then(r => setBank(r.data.data))
      .catch(() => setBank(null))
      .finally(() => setDetailLoading(false));
  }, [bankId]);

  useEffect(() => { fetchBank(); }, [fetchBank]);

  useEffect(() => {
    if (!bankId || !importParam) return;
    if (!["dsa", "linux", "system_design"].includes(importParam)) return;
    if (detailLoading || !bank) return;
    openImport(importParam);
    router.replace(`/dashboard/question-banks?bankId=${bankId}`);
  }, [bankId, importParam, detailLoading, bank]);

  const openBank = (id: string) => {
    router.push(`/dashboard/question-banks?bankId=${id}`);
  };
  const closeBank = () => {
    router.push("/dashboard/question-banks");
    fetchBanks();
  };

  // ── Bank CRUD ──
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await api.post("/api/v1/question-banks", {
        name: newName.trim(), category: newCategory, description: newDescription,
      });
      setShowCreate(false);
      setNewName(""); setNewCategory("mcq"); setNewDescription("");
      fetchBanks();
      if (res.data?.data?.id) openBank(res.data.data.id);
    } catch (err) { console.error(err); }
    finally { setCreating(false); }
  };

  const handleDeleteBank = async (id: string) => {
    try {
      await api.delete(`/api/v1/question-banks/${id}`);
      setDeleteConfirm(null);
      fetchBanks();
    } catch (err) { console.error(err); }
  };

  // ── Question CRUD ──
  const openCreate = (type: QuestionType) => {
    setEditingId(null); setDraft(defaultQuestion(type)); setFormError(""); setModalOpen(true);
  };

  const openEdit = (q: BankQuestion) => {
    setEditingId(q.id); setFormError("");
    setDraft({
      type: q.type, title: q.title, description: q.description,
      difficulty: q.difficulty, points: q.points, tags: q.tags,
      technology: q.technology, topic: q.topic,
      options: q.options ? (q.options as Option[]) : null,
      correctAnswer: q.correctAnswer,
      codeTemplate: q.codeTemplate || "", codeLanguage: "javascript",
      testCases: q.testCases.length > 0
        ? q.testCases.map((tc) => ({ ...tc, isHidden: Boolean(tc.isHidden) }))
        : [{ input: "", expectedOutput: "", isHidden: false }],
      blanks: q.type === "fill_blank" && Array.isArray(q.correctAnswer) ? (q.correctAnswer as string[]) : [""],
      numericalAnswer: q.type === "numerical" && q.correctAnswer ? String((q.correctAnswer as { value: number }).value ?? "") : "",
      numericalTolerance: q.type === "numerical" && q.correctAnswer ? String((q.correctAnswer as { tolerance: number }).tolerance ?? "0") : "0",
    });
    setModalOpen(true);
  };

  const buildPayload = () => {
    const base = { type: draft.type, title: draft.title.trim(), description: draft.description.trim(), difficulty: draft.difficulty, points: draft.points, tags: draft.tags, technology: draft.technology.trim(), topic: draft.topic.trim() };
    if (draft.type === "mcq" || draft.type === "msq") return { ...base, options: draft.options, correctAnswer: draft.options?.filter(o => o.isCorrect).map(o => o.text) };
    if (draft.type === "coding" || draft.type === "sql" || draft.type === "linux") return { ...base, codeTemplate: draft.codeTemplate, testCases: draft.testCases, correctAnswer: null };
    if (draft.type === "fill_blank") return { ...base, correctAnswer: draft.blanks, options: null };
    if (draft.type === "numerical") return { ...base, correctAnswer: { value: parseFloat(draft.numericalAnswer || "0"), tolerance: parseFloat(draft.numericalTolerance || "0") }, options: null };
    return base;
  };

  const handleSave = async () => {
    if (!draft.title.trim()) { setFormError("Question title is required."); return; }
    if ((draft.type === "mcq" || draft.type === "msq") && draft.options?.every(o => !o.text.trim())) { setFormError("Add at least one option."); return; }
    setSaving(true); setFormError("");
    try {
      const payload = buildPayload();
      if (editingId) await api.put(`/api/v1/question-banks/${bankId}/questions/${editingId}`, payload);
      else await api.post(`/api/v1/question-banks/${bankId}/questions`, payload);
      setModalOpen(false); fetchBank();
    } catch (err) {
      if (isAxiosError(err)) setFormError(err.response?.data?.message || "Failed to save.");
      else setFormError("Unexpected error.");
    } finally { setSaving(false); }
  };

  const handleDeleteQ = async (id: string) => {
    try {
      await api.delete(`/api/v1/question-banks/${bankId}/questions/${id}`);
      setQDeleteConfirm(null); fetchBank();
    } catch { /* silent */ }
  };

  function toggleImportId(id: string) {
    setSelectedImportIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const handleImport = async () => {
    if (!bankId || selectedImportIds.size === 0) return;
    setImporting(true);
    setImportError("");
    try {
      await api.post(`/api/v1/question-banks/${bankId}/import`, {
        source: importSource,
        questionIds: Array.from(selectedImportIds),
      });
      setShowImport(false);
      setSelectedImportIds(new Set());
      fetchBank();
    } catch (err) {
      if (isAxiosError(err)) {
        setImportError(err.response?.data?.message || "Import failed.");
      } else {
        setImportError("Import failed.");
      }
    } finally {
      setImporting(false);
    }
  };

  const handleSeedSamples = async () => {
    setSeeding(true);
    setSeedMessage("");
    try {
      const res = await api.post("/api/v1/question-banks/seed-samples");
      const banks = res.data.data || [];
      const created = banks.filter((b: { skipped?: boolean }) => !b.skipped).length;
      const skipped = banks.filter((b: { skipped?: boolean }) => b.skipped).length;
      setSeedMessage(
        created > 0
          ? `Created ${created} sample bank${created === 1 ? "" : "s"}${skipped ? ` (${skipped} already existed)` : ""}.`
          : skipped > 0
          ? "Sample banks already exist — open them to use MCQs + coding questions."
          : "Sample banks ready.",
      );
      fetchBanks();
    } catch (err) {
      if (isAxiosError(err)) {
        setSeedMessage(err.response?.data?.message || "Could not create sample banks.");
      } else {
        setSeedMessage("Could not create sample banks.");
      }
    } finally {
      setSeeding(false);
    }
  };

  // ─── DETAIL VIEW ──────────────────────────────────────────────────────────

  if (bankId) {
    if (detailLoading) return (
      <DashboardPageShell maxWidth="full">
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-64 bg-black/5 dark:bg-white/5" />
          <div className={`${panelSurface} p-6 space-y-3`}>
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-black/5 dark:bg-white/5" />)}
          </div>
        </div>
      </DashboardPageShell>
    );

    if (!bank) return (
      <DashboardPageShell maxWidth="full">
        <div className={`${panelSurface} p-12 text-center`}>
          <p className="font-mono text-xs text-gray-400">Bank not found.</p>
          <button onClick={closeBank} className="mt-3 font-mono text-xs text-black dark:text-white underline">← Back</button>
        </div>
      </DashboardPageShell>
    );

    const questions = (bank.questions || []).filter(q => {
      if (filterType !== "all" && q.type !== filterType) return false;
      if (filterDiff !== "all" && q.difficulty !== filterDiff) return false;
      if (searchQ && !q.title.toLowerCase().includes(searchQ.toLowerCase())) return false;
      return true;
    });

    return (
      <DashboardPageShell maxWidth="full">
        <DashboardPageHeader
          breadcrumb={
            <button onClick={closeBank} className="flex items-center gap-1 font-mono text-xs text-gray-400 hover:text-black dark:hover:text-white transition-colors">
              <ChevronLeft className="w-3 h-3" /> Question Banks
            </button>
          }
          title={bank.name}
          description={bank.description || `${bank.category.toUpperCase().replace("_", " ")} · ${bank._count.questions} questions`}
        />

        {/* Add Question type buttons */}
        <div className="mb-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <p className={labelCls}>Add Question</p>
            <button
              type="button"
              onClick={() => openImport("dsa")}
              className={`inline-flex items-center gap-2 px-3 py-2 ${panelBorder} font-mono text-[10px] tracking-wider text-gray-600 dark:text-gray-300 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-colors`}
            >
              <Download className="w-3.5 h-3.5" />
              Import from Enum Platform
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUESTION_TYPES.map(({ value, label, icon: Icon }) => (
              <button key={value} onClick={() => openCreate(value)}
                className={`group flex items-center gap-2 px-3 py-2 ${panelBorder} hover:border-black dark:hover:border-white hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors`}>
                <Icon className="w-3.5 h-3.5 text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                <span className="font-mono text-[10px] tracking-wider text-gray-600 dark:text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors">+ {label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 ${panelBorder}`}>
            <Search className="w-3.5 h-3.5 text-gray-400" />
            <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search questions..."
              className="bg-transparent font-mono text-xs outline-none w-36 text-black dark:text-white placeholder:text-gray-400" />
          </div>
          <div className={`flex items-center gap-1 ${panelBorder} px-2`}>
            <Filter className="w-3 h-3 text-gray-400" />
            <select value={filterType} onChange={e => setFilterType(e.target.value as typeof filterType)}
              className="bg-transparent font-mono text-[10px] text-gray-500 dark:text-gray-400 outline-none py-1.5 pr-1 cursor-pointer">
              <option value="all">All Types</option>
              {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className={`flex items-center gap-1 ${panelBorder} px-2`}>
            <select value={filterDiff} onChange={e => setFilterDiff(e.target.value as typeof filterDiff)}
              className="bg-transparent font-mono text-[10px] text-gray-500 dark:text-gray-400 outline-none py-1.5 pr-1 cursor-pointer">
              <option value="all">All Levels</option>
              {DIFFICULTIES.map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
            </select>
          </div>
          <span className="font-mono text-[10px] text-gray-400 ml-auto">{questions.length} / {bank._count.questions} questions</span>
        </div>

        {/* Question list */}
        {questions.length === 0 ? (
          <div className={`${panelSurface} p-12 text-center`}>
            <FileText className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="font-mono text-sm font-bold text-black dark:text-white mb-1">No questions yet</p>
            <p className="font-mono text-xs text-gray-400">Use the buttons above to add questions, or import from the DSA / Linux arenas.</p>
          </div>
        ) : (
          <div className={`${panelSurface} overflow-hidden`}>
            {questions.map((q, idx) => {
              const Icon = typeIcon(q.type);
              return (
                <div key={q.id} className="flex items-start gap-4 p-4 border-b border-black/5 dark:border-white/5 last:border-b-0 hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors">
                  <span className="font-mono text-[10px] text-gray-300 dark:text-gray-700 w-5 text-right shrink-0 mt-0.5">{idx + 1}</span>
                  <div className={`shrink-0 w-7 h-7 flex items-center justify-center ${panelBorder}`}>
                    <Icon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-black dark:text-white leading-snug mb-1">{q.title}</p>
                    {q.description && <p className="font-mono text-[10px] text-gray-400 line-clamp-1 mb-1.5">{q.description}</p>}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[9px] tracking-wider uppercase text-gray-400">{q.type.replace("_", " ")}</span>
                      {platformSourceFromTags(q.tags) && (
                        <SourceBadge label={platformSourceFromTags(q.tags)!} />
                      )}
                      <span className={`border px-1.5 py-0.5 font-mono text-[9px] uppercase ${difficultyColor(q.difficulty)}`}>{q.difficulty}</span>
                      <span className="font-mono text-[9px] text-gray-400">{q.points}pts</span>
                      {q.topic && <span className="font-mono text-[9px] text-gray-400">· {q.topic}</span>}
                      {(q.options || []).length > 0 && <span className="font-mono text-[9px] text-gray-400">{(q.options || []).length} options</span>}
                      {q.testCases.length > 0 && <span className="font-mono text-[9px] text-gray-400">{q.testCases.length} test cases</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(q)} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 hover:text-black dark:hover:text-white transition-colors" title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setQDeleteConfirm(q.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Delete question confirm */}
        {qDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60">
            <div className={`${panelSurface} p-6 w-full max-w-sm mx-4 bg-white dark:bg-black shadow-2xl`}>
              <h3 className="font-mono text-xs font-bold text-black dark:text-white uppercase mb-2">Delete Question?</h3>
              <p className="font-mono text-xs text-gray-500 mb-5">This cannot be undone.</p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setQDeleteConfirm(null)} className={`px-4 py-2 font-mono text-xs ${panelBorder} text-gray-500 hover:border-black dark:hover:border-white transition-colors`}>Cancel</button>
                <button onClick={() => handleDeleteQ(qDeleteConfirm)} className="px-4 py-2 font-mono text-xs bg-red-600 text-white hover:bg-red-700 transition-colors">Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Question form drawer */}
        {modalOpen && (
          <QuestionModal draft={draft} setDraft={setDraft} editingId={editingId}
            saving={saving} error={formError} onSave={handleSave} onClose={() => setModalOpen(false)} />
        )}

        {showImport && (
          <PlatformImportModal
            importSource={importSource}
            setImportSource={setImportSource}
            catalog={catalog}
            catalogLoading={catalogLoading}
            catalogError={catalogError}
            importError={importError}
            importSearch={importSearch}
            setImportSearch={setImportSearch}
            selectedImportIds={selectedImportIds}
            toggleImportId={toggleImportId}
            selectAllVisible={selectAllVisible}
            clearSelection={() => setSelectedImportIds(new Set())}
            catalogItemsForSource={catalogItemsForSource}
            importing={importing}
            onClose={() => setShowImport(false)}
            onImport={handleImport}
          />
        )}
      </DashboardPageShell>
    );
  }

  // ─── LIST VIEW ────────────────────────────────────────────────────────────

  return (
    <DashboardPageShell maxWidth="full">
      <DashboardPageHeader breadcrumb="Company" title="Question Banks" description="Manage banks and import existing questions from DSA Arena, Linux Arena, and System Design on enum.live.">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSeedSamples}
            disabled={seeding}
            className={`inline-flex items-center gap-2 px-4 py-2 ${panelBorder} font-mono text-xs tracking-wider text-gray-700 dark:text-gray-200 hover:border-black dark:hover:border-white transition-colors disabled:opacity-50`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {seeding ? "Creating…" : "Create Sample Banks"}
          </button>
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-mono text-xs tracking-wider hover:opacity-90 transition-opacity">
            <Plus className="w-3.5 h-3.5" /> New Bank
          </button>
        </div>
      </DashboardPageHeader>

      {seedMessage && (
        <p className="mb-4 font-mono text-xs text-emerald-600 dark:text-emerald-400">{seedMessage}</p>
      )}

      {/* Enum platform library */}
      <div className={`${panelSurface} mb-5 overflow-hidden`}>
        <div className="border-b border-black/10 px-5 py-4 dark:border-white/10">
          <p className={labelCls}>Enum Platform Library</p>
          <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
            Reuse questions already on enum.live. Open a bank below, then import from DSA, Linux, or System Design.
          </p>
        </div>
        <div className="grid sm:grid-cols-3">
          {PLATFORM_TABS.map((tab, idx) => {
            const Icon = TAB_ICONS[tab.id];
            const count = catalogLoading ? "…" : (catalog.counts?.[tab.id] ?? catalog[tab.id].length);
            return (
              <div
                key={tab.id}
                className={`p-5 ${idx < PLATFORM_TABS.length - 1 ? "border-b sm:border-b-0 sm:border-r border-black/10 dark:border-white/10" : ""}`}
              >
                <div className={`mb-3 inline-flex h-8 w-8 items-center justify-center ${panelBorder}`}>
                  <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-gray-400">{tab.label}</p>
                <p className="mt-1 font-mono text-2xl font-bold text-black dark:text-white">{count}</p>
                <p className="mt-2 font-mono text-[10px] leading-relaxed text-gray-500">{tab.description}</p>
                {banks[0] ? (
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/question-banks?bankId=${banks[0].id}&import=${tab.id}`)}
                    className="mt-4 font-mono text-[10px] font-semibold uppercase tracking-wider text-black hover:underline dark:text-white"
                  >
                    Import into bank →
                  </button>
                ) : (
                  <p className="mt-4 font-mono text-[10px] text-gray-400">Create a bank first</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-0 mb-5 overflow-x-auto">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 font-mono text-[10px] tracking-wider border shrink-0 transition-colors ${categoryFilter === cat ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white" : "bg-transparent text-gray-500 border-gray-300 dark:border-neutral-700 hover:border-gray-500 dark:hover:border-neutral-400"}`}>
            {cat === "all" ? "ALL" : cat.toUpperCase().replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
          <form onSubmit={handleCreate} className={`${panelSurface} p-6 w-full max-w-md shadow-2xl mx-4 bg-white dark:bg-black`}>
            <h3 className="font-mono text-xs tracking-wider font-bold text-black dark:text-white uppercase mb-4">New Question Bank</h3>
            <div className="space-y-4">
              <div><label className={labelCls}>Name *</label><input autoFocus type="text" value={newName} onChange={e => setNewName(e.target.value)} className={inputCls} placeholder="e.g. JavaScript Basics" required /></div>
              <div><label className={labelCls}>Category</label>
                <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className={inputCls}>
                  {CATEGORIES.filter(c => c !== "all").map(c => <option key={c} value={c}>{c.toUpperCase().replace("_", " ")}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Description</label><textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} className={`${inputCls} min-h-[60px] resize-y`} placeholder="Optional description..." /></div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 font-mono text-xs border border-gray-300 dark:border-neutral-700 text-gray-600 dark:text-gray-400 hover:border-black dark:hover:border-white transition-colors">Cancel</button>
              <button type="submit" disabled={creating || !newName.trim()} className="px-4 py-2 font-mono text-xs bg-black dark:bg-white text-white dark:text-black hover:opacity-90 disabled:opacity-60 transition-opacity">{creating ? "Creating..." : "Create & Open →"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Delete bank confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60">
          <div className={`${panelSurface} p-6 w-full max-w-sm mx-4 bg-white dark:bg-black shadow-2xl`}>
            <h3 className="font-mono text-xs font-bold text-black dark:text-white uppercase mb-2">Delete Question Bank?</h3>
            <p className="font-mono text-xs text-gray-500 mb-5">All questions inside will be permanently deleted.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className={`px-4 py-2 font-mono text-xs ${panelBorder} text-gray-500 hover:border-black dark:hover:border-white transition-colors`}>Cancel</button>
              <button onClick={() => handleDeleteBank(deleteConfirm)} className="px-4 py-2 font-mono text-xs bg-red-600 text-white hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Bank grid */}
      {listLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`${panelSurface} p-5 animate-pulse`}>
              <div className="h-4 w-32 bg-black/5 dark:bg-white/5 mb-3 rounded" />
              <div className="h-3 w-20 bg-black/5 dark:bg-white/5 mb-2 rounded" />
              <div className="h-3 w-16 bg-black/5 dark:bg-white/5 rounded" />
            </div>
          ))}
        </div>
      ) : banks.length === 0 ? (
        <div className={`${panelSurface} p-12 text-center`}>
          <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <h3 className="font-mono text-sm font-bold text-black dark:text-white mb-1">No question banks yet</h3>
          <p className="font-mono text-xs text-gray-400 mb-4">{categoryFilter !== "all" ? `No ${categoryFilter} banks found.` : "Create your first question bank or generate sample banks with MCQs + coding questions."}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button onClick={handleSeedSamples} disabled={seeding} className={`inline-flex items-center gap-2 px-4 py-2 ${panelBorder} font-mono text-xs tracking-wider text-gray-700 dark:text-gray-200`}>
              <Sparkles className="w-3 h-3" /> {seeding ? "Creating…" : "Create Sample Banks"}
            </button>
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-mono text-xs tracking-wider">
              <Plus className="w-3 h-3" /> New Bank
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {banks.map(bank => (
            <div key={bank.id} className={`group ${panelSurface} flex flex-col transition-all duration-150 hover:border-black dark:hover:border-white hover:shadow-md`}>
              <button onClick={() => openBank(bank.id)} className="flex-1 p-5 text-left w-full">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-bold text-black dark:text-white leading-snug">{bank.name}</h3>
                </div>
                {bank.description && <p className="font-mono text-[10px] text-gray-400 mb-3 line-clamp-2">{bank.description}</p>}
                <div className="flex items-center gap-3 mb-3">
                  <span className="inline-flex items-center gap-1 border border-black/10 dark:border-white/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-gray-500">
                    <Tag className="w-2.5 h-2.5" />{bank.category.replace("_", " ")}
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-gray-400">
                    <Hash className="w-2.5 h-2.5" />{bank._count.questions} {bank._count.questions === 1 ? "question" : "questions"}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-black/5 dark:border-white/5">
                  <p className="font-mono text-[9px] text-gray-300 dark:text-gray-600">{new Date(bank.createdAt).toLocaleDateString()}</p>
                  <span className="flex items-center gap-1 font-mono text-[10px] font-semibold text-black dark:text-white group-hover:gap-2 transition-all">
                    <Pencil className="w-3 h-3" /> Add / Edit Questions <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </button>
              <div className="px-5 pb-3 flex justify-end">
                <button onClick={e => { e.stopPropagation(); setDeleteConfirm(bank.id); }}
                  className="flex items-center gap-1 font-mono text-[9px] text-gray-400 hover:text-red-500 transition-colors py-1">
                  <Trash2 className="w-3 h-3" /> Delete Bank
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardPageShell>
  );
}

// ─── Platform Import Modal ────────────────────────────────────────────────────

function PlatformImportModal({
  importSource,
  setImportSource,
  catalog,
  catalogLoading,
  catalogError,
  importError,
  importSearch,
  setImportSearch,
  selectedImportIds,
  toggleImportId,
  selectAllVisible,
  clearSelection,
  catalogItemsForSource,
  importing,
  onClose,
  onImport,
}: {
  importSource: PlatformSource;
  setImportSource: (s: PlatformSource) => void;
  catalog: {
    dsa: PlatformCatalogItem[];
    linux: PlatformCatalogItem[];
    system_design: PlatformCatalogItem[];
    counts?: { dsa: number; linux: number; system_design: number };
  };
  catalogLoading: boolean;
  catalogError: string;
  importError: string;
  importSearch: string;
  setImportSearch: (v: string) => void;
  selectedImportIds: Set<string>;
  toggleImportId: (id: string) => void;
  selectAllVisible: () => void;
  clearSelection: () => void;
  catalogItemsForSource: (source: PlatformSource) => PlatformCatalogItem[];
  importing: boolean;
  onClose: () => void;
  onImport: () => void;
}) {
  const items = catalogItemsForSource(importSource);
  const activeTab = PLATFORM_TABS.find((t) => t.id === importSource);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 dark:bg-black/70">
      <div className={`${panelSurface} flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden bg-white shadow-2xl dark:bg-black`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-black/10 px-6 py-5 dark:border-white/10">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-400">Enum Platform</p>
            <h3 className="mt-1 font-mono text-sm font-bold uppercase tracking-wider text-black dark:text-white">
              Import Questions
            </h3>
            <p className="mt-2 font-mono text-xs text-gray-500 dark:text-gray-400">
              Select from DSA Arena, Linux Arena, or System Design on enum.live.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 transition-colors hover:text-black dark:hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Source tabs — matches dashboard category filter style */}
        <div className="flex flex-wrap gap-0 border-b border-black/10 px-6 py-4 dark:border-white/10">
          {PLATFORM_TABS.map((tab) => {
            const Icon = TAB_ICONS[tab.id];
            const active = importSource === tab.id;
            const count = catalog.counts?.[tab.id] ?? catalog[tab.id].length;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setImportSource(tab.id); clearSelection(); setImportSearch(""); }}
                className={`flex items-center gap-2 border px-3 py-2 font-mono text-[10px] tracking-wider uppercase transition-colors ${
                  active
                    ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-gray-300 bg-transparent text-gray-500 hover:border-gray-500 dark:border-neutral-700 dark:text-gray-400 dark:hover:border-neutral-400"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                <span className={active ? "opacity-70" : "text-gray-400"}>({catalogLoading ? "…" : count})</span>
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-black/10 px-6 py-3 dark:border-white/10">
          <div className={`flex min-w-[220px] flex-1 items-center gap-2 px-3 py-2 ${panelBorder}`}>
            <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <input
              type="text"
              value={importSearch}
              onChange={(e) => setImportSearch(e.target.value)}
              placeholder="Search title or topic…"
              className="w-full bg-transparent font-mono text-xs text-black outline-none placeholder:text-gray-400 dark:text-white"
            />
          </div>
          <button type="button" onClick={selectAllVisible} disabled={items.length === 0} className={btnGhostCls}>
            Select all
          </button>
          <button type="button" onClick={clearSelection} disabled={selectedImportIds.size === 0} className={btnGhostCls}>
            Clear
          </button>
        </div>

        {/* List */}
        <div className="min-h-[300px] flex-1 overflow-y-auto px-6 py-4">
          {(catalogError || importError) && (
            <div className={`mb-4 ${panelBorder} border-red-300 bg-red-50 px-4 py-3 font-mono text-xs text-red-600 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300`}>
              {catalogError || importError}
            </div>
          )}

          {catalogLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="mb-4 h-6 w-6 animate-spin border-2 border-black/10 border-t-black dark:border-white/10 dark:border-t-white" />
              <p className="font-mono text-xs text-gray-400">Loading {activeTab?.label}…</p>
            </div>
          ) : items.length === 0 ? (
            <div className={`${panelSurface} flex flex-col items-center justify-center px-6 py-16 text-center`}>
              <FileText className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-700" />
              <p className="font-mono text-sm font-bold text-black dark:text-white">
                {importSearch ? "No matches found" : `No ${activeTab?.label} questions`}
              </p>
              <p className="mt-2 max-w-sm font-mono text-xs text-gray-400">
                {catalogError
                  ? "Resolve the error above and try again."
                  : "Questions appear here once they exist on the Enum platform."}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => {
                const selected = selectedImportIds.has(item.id);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => toggleImportId(item.id)}
                      className={`flex w-full items-start gap-3 p-4 text-left transition-colors ${panelBorder} ${
                        selected
                          ? "border-black bg-black/[0.03] dark:border-white dark:bg-white/[0.04]"
                          : "hover:border-black/40 dark:hover:border-white/40"
                      }`}
                    >
                      <SelectBox checked={selected} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-black dark:text-white">{item.title}</p>
                          <SourceBadge label={item.sourceLabel || activeTab?.label || "Enum"} />
                        </div>
                        {item.description ? (
                          <p className="mt-1 line-clamp-2 font-mono text-[10px] leading-relaxed text-gray-500 dark:text-gray-400">
                            {item.description}
                          </p>
                        ) : null}
                        <p className="mt-2 font-mono text-[9px] uppercase tracking-wider text-gray-400">
                          {item.difficulty} · {item.topic}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 border-t border-black/10 px-6 py-4 dark:border-white/10">
          <p className="font-mono text-xs text-gray-500">
            <span className="font-bold text-black dark:text-white">{selectedImportIds.size}</span>
            {" "}of {items.length} selected
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={btnGhostCls}>
              Cancel
            </button>
            <button
              type="button"
              onClick={onImport}
              disabled={importing || selectedImportIds.size === 0 || Boolean(catalogError)}
              className={btnPrimaryCls}
            >
              {importing ? "Importing…" : `Import ${selectedImportIds.size || ""} question${selectedImportIds.size === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Question Form Drawer ─────────────────────────────────────────────────────

function QuestionModal({ draft, setDraft, editingId, saving, error, onSave, onClose }: {
  draft: QuestionDraft; setDraft: (d: QuestionDraft) => void;
  editingId: string | null; saving: boolean; error: string;
  onSave: () => void; onClose: () => void;
}) {
  const set = (patch: Partial<QuestionDraft>) => setDraft({ ...draft, ...patch });
  const currentTypeInfo = QUESTION_TYPES.find(t => t.value === draft.type);
  const [tagInput, setTagInput] = useState("");
  const addTag = () => { const t = tagInput.trim(); if (t && !draft.tags.includes(t)) set({ tags: [...draft.tags, t] }); setTagInput(""); };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 dark:bg-black/60">
      <div className="w-full max-w-2xl h-full bg-white dark:bg-black border-l border-black/20 dark:border-white/25 flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10 shrink-0">
          <div>
            <h2 className="font-mono text-xs font-bold text-black dark:text-white uppercase tracking-wider">{editingId ? "Edit Question" : "New Question"}</h2>
            {currentTypeInfo && <p className="font-mono text-[10px] text-gray-400 mt-0.5">{currentTypeInfo.label} · {currentTypeInfo.desc}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"><X className="w-4 h-4 text-gray-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Type switcher */}
          {!editingId && (
            <div>
              <label className={labelCls}>Question Type</label>
              <div className="flex flex-wrap gap-1.5">
                {QUESTION_TYPES.map(({ value, label, icon: Icon }) => (
                  <button key={value} type="button"
                    onClick={() => setDraft({ ...draft, ...defaultQuestion(value), title: draft.title, description: draft.description, difficulty: draft.difficulty, points: draft.points })}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 border font-mono text-[10px] tracking-wider transition-colors ${draft.type === value ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white" : "border-gray-300 dark:border-neutral-700 text-gray-500 hover:border-gray-500 dark:hover:border-neutral-400"}`}>
                    <Icon className="w-3 h-3" /> {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div><label className={labelCls}>Question *</label><textarea value={draft.title} onChange={e => set({ title: e.target.value })} className={`${inputCls} min-h-[60px] resize-y`} placeholder="Enter your question here…" /></div>
          <div><label className={labelCls}>Description / Hint</label><textarea value={draft.description} onChange={e => set({ description: e.target.value })} className={`${inputCls} min-h-[48px] resize-y`} placeholder="Optional context or hint…" /></div>

          {/* MCQ / MSQ */}
          {(draft.type === "mcq" || draft.type === "msq") && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelCls}>Options {draft.type === "mcq" ? "(one correct)" : "(multiple correct)"}</label>
                <button type="button" onClick={() => set({ options: [...(draft.options || []), { text: "", isCorrect: false }] })} className="font-mono text-[10px] border border-black/20 dark:border-white/20 px-2 py-0.5 hover:border-black dark:hover:border-white transition-colors">+ Add Option</button>
              </div>
              <div className="space-y-2">
                {(draft.options || []).map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button type="button" onClick={() => { const opts = [...(draft.options || [])]; if (draft.type === "mcq") opts.forEach((o, j) => (o.isCorrect = j === i)); else opts[i] = { ...opts[i], isCorrect: !opts[i].isCorrect }; set({ options: opts }); }}
                      className={`w-5 h-5 border flex items-center justify-center shrink-0 transition-colors ${opt.isCorrect ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300 dark:border-neutral-600 hover:border-gray-500"}`}>
                      {opt.isCorrect && <Check className="w-3 h-3" />}
                    </button>
                    <input type="text" value={opt.text} onChange={e => { const opts = [...(draft.options || [])]; opts[i] = { ...opts[i], text: e.target.value }; set({ options: opts }); }} className={inputCls} placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                    {(draft.options || []).length > 2 && <button type="button" onClick={() => set({ options: (draft.options || []).filter((_, j) => j !== i) })} className="text-gray-400 hover:text-red-500 shrink-0"><X className="w-3.5 h-3.5" /></button>}
                  </div>
                ))}
              </div>
              <p className="font-mono text-[9px] text-gray-400 mt-2">Click the square to mark the correct answer{draft.type === "msq" ? "s" : ""}.</p>
            </div>
          )}

          {/* Coding / SQL / Linux */}
          {(draft.type === "coding" || draft.type === "sql" || draft.type === "linux") && (
            <>
              {draft.type === "coding" && <div><label className={labelCls}>Language</label><select value={draft.codeLanguage} onChange={e => set({ codeLanguage: e.target.value })} className={inputCls}>{LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}</select></div>}
              <div>
                <label className={labelCls}>{draft.type === "sql" ? "SQL Template / Schema" : draft.type === "linux" ? "Starting Shell State" : "Code Template / Starter"}</label>
                <textarea value={draft.codeTemplate || ""} onChange={e => set({ codeTemplate: e.target.value })} className={`${inputCls} min-h-[120px] resize-y font-mono`} placeholder={draft.type === "sql" ? "CREATE TABLE ...\n-- Write query below" : draft.type === "linux" ? "# /home/user\nls" : "function solution(args) {\n  // code here\n}"} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelCls}>Test Cases</label>
                  <button type="button" onClick={() => set({ testCases: [...draft.testCases, { input: "", expectedOutput: "", isHidden: draft.testCases.length > 0 }] })} className="font-mono text-[10px] border border-black/20 dark:border-white/20 px-2 py-0.5 hover:border-black dark:hover:border-white transition-colors">+ Add</button>
                </div>
                <div className="space-y-3">
                  {draft.testCases.map((tc, i) => (
                    <div key={i} className="border border-black/10 dark:border-white/10 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[9px] text-gray-400 uppercase">Test Case {i + 1}</span>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={tc.isHidden} onChange={e => { const tcs = [...draft.testCases]; tcs[i] = { ...tcs[i], isHidden: e.target.checked }; set({ testCases: tcs }); }} className="w-3 h-3" /><span className="font-mono text-[9px] text-gray-400">{tc.isHidden ? "Hidden (Submit only)" : "Sample (visible)"}</span></label>
                          {draft.testCases.length > 1 && <button type="button" onClick={() => set({ testCases: draft.testCases.filter((_, j) => j !== i) })}><X className="w-3 h-3 text-gray-400 hover:text-red-500" /></button>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className={labelCls}>Input</label><textarea value={tc.input} onChange={e => { const tcs = [...draft.testCases]; tcs[i] = { ...tcs[i], input: e.target.value }; set({ testCases: tcs }); }} className={`${inputCls} min-h-[48px] resize-none font-mono`} placeholder="stdin…" /></div>
                        <div><label className={labelCls}>Expected Output</label><textarea value={tc.expectedOutput} onChange={e => { const tcs = [...draft.testCases]; tcs[i] = { ...tcs[i], expectedOutput: e.target.value }; set({ testCases: tcs }); }} className={`${inputCls} min-h-[48px] resize-none font-mono`} placeholder="stdout…" /></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Fill in Blank */}
          {draft.type === "fill_blank" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelCls}>Correct Answers</label>
                <button type="button" onClick={() => set({ blanks: [...draft.blanks, ""] })} className="font-mono text-[10px] border border-black/20 dark:border-white/20 px-2 py-0.5 hover:border-black dark:hover:border-white transition-colors">+ Add Blank</button>
              </div>
              <p className="font-mono text-[9px] text-gray-400 mb-2">Use _____ in the question text. Enter each answer below.</p>
              <div className="space-y-2">
                {draft.blanks.map((b, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="font-mono text-[10px] text-gray-400 w-16 shrink-0">Blank {i + 1}</span>
                    <input type="text" value={b} onChange={e => { const bl = [...draft.blanks]; bl[i] = e.target.value; set({ blanks: bl }); }} className={inputCls} placeholder={`Answer ${i + 1}`} />
                    {draft.blanks.length > 1 && <button type="button" onClick={() => set({ blanks: draft.blanks.filter((_, j) => j !== i) })}><X className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" /></button>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Numerical */}
          {draft.type === "numerical" && (
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelCls}>Correct Answer</label><input type="number" value={draft.numericalAnswer} onChange={e => set({ numericalAnswer: e.target.value })} className={inputCls} placeholder="e.g. 42.5" step="any" /></div>
              <div>
                <label className={labelCls}>Tolerance (±)</label>
                <input type="number" value={draft.numericalTolerance} onChange={e => set({ numericalTolerance: e.target.value })} className={inputCls} placeholder="0" step="any" min="0" />
                <p className="font-mono text-[9px] text-gray-400 mt-1">Range: {Number(draft.numericalAnswer || 0) - Number(draft.numericalTolerance || 0)} to {Number(draft.numericalAnswer || 0) + Number(draft.numericalTolerance || 0)}</p>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="border-t border-black/10 dark:border-white/10 pt-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div><label className={labelCls}>Difficulty</label><select value={draft.difficulty} onChange={e => set({ difficulty: e.target.value as Difficulty })} className={inputCls}>{DIFFICULTIES.map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}</select></div>
              <div><label className={labelCls}>Points</label><input type="number" value={draft.points} onChange={e => set({ points: Number(e.target.value) })} className={inputCls} min={1} /></div>
              <div><label className={labelCls}>Topic</label><input type="text" value={draft.topic} onChange={e => set({ topic: e.target.value })} className={inputCls} placeholder="e.g. Arrays" /></div>
            </div>
            <div><label className={labelCls}>Technology</label><input type="text" value={draft.technology} onChange={e => set({ technology: e.target.value })} className={inputCls} placeholder="e.g. React, Python, SQL" /></div>
            <div>
              <label className={labelCls}>Tags</label>
              <div className="flex gap-2">
                <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} className={inputCls} placeholder="Type tag and press Enter" />
                <button type="button" onClick={addTag} className="px-3 border border-black/20 dark:border-white/20 font-mono text-xs hover:border-black dark:hover:border-white transition-colors shrink-0">Add</button>
              </div>
              {draft.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {draft.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-0.5 border border-black/15 dark:border-white/15 font-mono text-[9px] text-gray-600 dark:text-gray-400">
                      {tag}<button onClick={() => set({ tags: draft.tags.filter(t => t !== tag) })} className="hover:text-red-500 transition-colors"><X className="w-2.5 h-2.5" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-black/10 dark:border-white/10 shrink-0">
          {error && <p className="font-mono text-xs text-red-600 dark:text-red-400 mb-3 border border-red-400/30 bg-red-50 dark:bg-red-950/20 px-3 py-2">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={onClose} className={`px-4 py-2 font-mono text-xs border border-black/20 dark:border-white/25 text-gray-600 dark:text-gray-400 hover:border-black dark:hover:border-white transition-colors`}>Cancel</button>
            <button onClick={onSave} disabled={saving} className="px-4 py-2 font-mono text-xs bg-black dark:bg-white text-white dark:text-black hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center gap-2">
              {saving ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white dark:border-black/30 dark:border-t-black rounded-full animate-spin" /> Saving...</> : <><Check className="w-3 h-3" />{editingId ? "Save Changes" : "Add Question"}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page export (wraps in Suspense for useSearchParams) ──────────────────────

export default function QuestionBanksPage() {
  return (
    <Suspense fallback={<DashboardPageShell maxWidth="full"><div className="animate-pulse h-8 w-48 bg-black/5 dark:bg-white/5" /></DashboardPageShell>}>
      <QuestionBanksInner />
    </Suspense>
  );
}
