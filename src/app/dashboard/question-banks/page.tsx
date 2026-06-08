"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { proxy } from "@/app/proxy";
import { DashboardPageShell, DashboardPageHeader } from "@/components/dashboard/dashboard-page-shell";
import {
  Plus, BookOpen, Trash2, Hash, Tag, ChevronRight, Pencil,
  ChevronLeft, X, Check, Code2, ListOrdered, AlignLeft,
  FileText, Database, Terminal, Search, Filter,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type QuestionType = "mcq" | "msq" | "coding" | "fill_blank" | "numerical" | "sql" | "linux";
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

// ─── Constants ────────────────────────────────────────────────────────────────

const QUESTION_TYPES: { value: QuestionType; label: string; icon: typeof Code2; desc: string }[] = [
  { value: "mcq",        label: "MCQ",           icon: ListOrdered, desc: "Single correct answer" },
  { value: "msq",        label: "Multi-Select",  icon: Check,       desc: "Multiple correct answers" },
  { value: "coding",     label: "Coding",        icon: Code2,       desc: "Write & run code" },
  { value: "fill_blank", label: "Fill in Blank", icon: AlignLeft,   desc: "Complete the sentence" },
  { value: "numerical",  label: "Numerical",     icon: Hash,        desc: "Numeric answer" },
  { value: "sql",        label: "SQL",           icon: Database,    desc: "Database query" },
  { value: "linux",      label: "Linux / Shell", icon: Terminal,    desc: "Shell command" },
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
const typeIcon = (t: QuestionType) => QUESTION_TYPES.find(q => q.value === t)?.icon ?? FileText;

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

  // ── Fetch bank list ──
  const fetchBanks = useCallback(() => {
    setListLoading(true);
    const params: Record<string, string> = {};
    if (categoryFilter !== "all") params.category = categoryFilter;
    axios.get(`${proxy}/api/v1/question-banks`, { params })
      .then(r => setBanks(r.data.data || []))
      .catch(() => setBanks([]))
      .finally(() => setListLoading(false));
  }, [categoryFilter]);

  useEffect(() => { fetchBanks(); }, [fetchBanks]);

  // ── Fetch bank detail when bankId param changes ──
  const fetchBank = useCallback(() => {
    if (!bankId) { setBank(null); return; }
    setDetailLoading(true);
    axios.get(`${proxy}/api/v1/question-banks/${bankId}`)
      .then(r => setBank(r.data.data))
      .catch(() => setBank(null))
      .finally(() => setDetailLoading(false));
  }, [bankId]);

  useEffect(() => { fetchBank(); }, [fetchBank]);

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
      const res = await axios.post(`${proxy}/api/v1/question-banks`, {
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
      await axios.delete(`${proxy}/api/v1/question-banks/${id}`);
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
      testCases: q.testCases.length > 0 ? q.testCases : [{ input: "", expectedOutput: "", isHidden: false }],
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
      if (editingId) await axios.put(`${proxy}/api/v1/question-banks/${bankId}/questions/${editingId}`, payload);
      else await axios.post(`${proxy}/api/v1/question-banks/${bankId}/questions`, payload);
      setModalOpen(false); fetchBank();
    } catch (err) {
      if (axios.isAxiosError(err)) setFormError(err.response?.data?.message || "Failed to save.");
      else setFormError("Unexpected error.");
    } finally { setSaving(false); }
  };

  const handleDeleteQ = async (id: string) => {
    try {
      await axios.delete(`${proxy}/api/v1/question-banks/${bankId}/questions/${id}`);
      setQDeleteConfirm(null); fetchBank();
    } catch { /* silent */ }
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
          <p className={`${labelCls} mb-3`}>Add Question</p>
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
            <p className="font-mono text-xs text-gray-400">Use the buttons above to add your first question.</p>
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
      </DashboardPageShell>
    );
  }

  // ─── LIST VIEW ────────────────────────────────────────────────────────────

  return (
    <DashboardPageShell maxWidth="full">
      <DashboardPageHeader breadcrumb="Company" title="Question Banks" description="Click any bank to add and manage questions inside it.">
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-mono text-xs tracking-wider hover:opacity-90 transition-opacity">
          <Plus className="w-3.5 h-3.5" /> New Bank
        </button>
      </DashboardPageHeader>

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
          <p className="font-mono text-xs text-gray-400 mb-4">{categoryFilter !== "all" ? `No ${categoryFilter} banks found.` : "Create your first question bank to start adding questions."}</p>
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-mono text-xs tracking-wider">
            <Plus className="w-3 h-3" /> New Bank
          </button>
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
                  <button type="button" onClick={() => set({ testCases: [...draft.testCases, { input: "", expectedOutput: "", isHidden: false }] })} className="font-mono text-[10px] border border-black/20 dark:border-white/20 px-2 py-0.5 hover:border-black dark:hover:border-white transition-colors">+ Add</button>
                </div>
                <div className="space-y-3">
                  {draft.testCases.map((tc, i) => (
                    <div key={i} className="border border-black/10 dark:border-white/10 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[9px] text-gray-400 uppercase">Test Case {i + 1}</span>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={tc.isHidden} onChange={e => { const tcs = [...draft.testCases]; tcs[i] = { ...tcs[i], isHidden: e.target.checked }; set({ testCases: tcs }); }} className="w-3 h-3" /><span className="font-mono text-[9px] text-gray-400">Hidden</span></label>
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
