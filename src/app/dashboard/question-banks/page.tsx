"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { proxy } from "@/app/proxy";
import { DashboardPageShell, DashboardPageHeader } from "@/components/dashboard/dashboard-page-shell";
import { Plus, BookOpen, X, Hash, Tag } from "lucide-react";

interface QuestionBank {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  createdAt: string;
  _count: { questions: number };
}

const panelBorder = "border border-black/20 dark:border-white/25";
const panelSurface = `${panelBorder} bg-white/80 backdrop-blur-[2px] dark:bg-black/75`;
const panelHover =
  "transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out hover:border-black hover:bg-white/45 hover:shadow-sm hover:-translate-y-0.5 dark:hover:border-white dark:hover:bg-black/40 dark:hover:shadow-white/5";
const inputCls =
  "w-full border border-gray-300 dark:border-neutral-700 bg-white dark:bg-black px-3 py-2 font-mono text-xs text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors";
const labelCls =
  "block font-mono text-[10px] tracking-[0.2em] text-gray-500 dark:text-gray-400 uppercase mb-1.5";

const CATEGORIES = ["all", "mcq", "coding", "sql", "linux", "frontend", "backend", "devops", "system_design", "incident"];

export default function QuestionBanksPage() {
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("mcq");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchBanks = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (categoryFilter !== "all") params.category = categoryFilter;

    axios
      .get(`${proxy}/api/v1/question-banks`, { params })
      .then((res) => setBanks(res.data.data || []))
      .catch(() => setBanks([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBanks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await axios.post(`${proxy}/api/v1/question-banks`, {
        name: newName.trim(),
        category: newCategory,
        description: newDescription,
      });
      setNewName("");
      setNewCategory("mcq");
      setNewDescription("");
      setShowCreate(false);
      fetchBanks();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this question bank and all its questions?")) return;
    try {
      await axios.delete(`${proxy}/api/v1/question-banks/${id}`);
      fetchBanks();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DashboardPageShell maxWidth="full">
      <DashboardPageHeader
        breadcrumb="Company"
        title="Question Banks"
        description="Organize and manage your question collections."
      >
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-mono text-xs tracking-wider hover:opacity-90 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          New Bank
        </button>
      </DashboardPageHeader>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-0 mb-5 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 font-mono text-[10px] tracking-wider border shrink-0 transition-colors ${
              categoryFilter === cat
                ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white"
                : "bg-transparent text-gray-500 border-gray-300 dark:border-neutral-700 hover:border-gray-500 dark:hover:border-neutral-400"
            }`}
          >
            {cat === "all" ? "ALL" : cat.toUpperCase().replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
          <form onSubmit={handleCreate} className={`${panelSurface} p-6 w-full max-w-md shadow-2xl mx-4 bg-white dark:bg-black`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-xs tracking-wider font-bold text-black dark:text-white uppercase">
                New Question Bank
              </h3>
              <button type="button" onClick={() => setShowCreate(false)}>
                <X className="w-4 h-4 text-gray-400 hover:text-black dark:hover:text-white transition-colors" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Name *</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className={inputCls} placeholder="e.g. JavaScript Basics" required />
              </div>
              <div>
                <label className={labelCls}>Category</label>
                <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className={inputCls}>
                  {CATEGORIES.filter((c) => c !== "all").map((c) => (
                    <option key={c} value={c}>{c.toUpperCase().replace("_", " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className={`${inputCls} min-h-[60px] resize-y`} placeholder="Optional description..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 font-mono text-xs border border-gray-300 dark:border-neutral-700 text-gray-600 dark:text-gray-400 hover:border-black dark:hover:border-white transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={creating || !newName.trim()} className="px-4 py-2 font-mono text-xs bg-black dark:bg-white text-white dark:text-black hover:opacity-90 disabled:opacity-60 transition-opacity">
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`${panelSurface} p-5`}>
              <div className="h-4 w-32 bg-black/5 dark:bg-white/5 animate-pulse mb-3" />
              <div className="h-3 w-20 bg-black/5 dark:bg-white/5 animate-pulse mb-2" />
              <div className="h-3 w-16 bg-black/5 dark:bg-white/5 animate-pulse" />
            </div>
          ))}
        </div>
      ) : banks.length === 0 ? (
        <div className={`${panelSurface} p-12 text-center`}>
          <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <h3 className="font-mono text-sm font-bold text-black dark:text-white mb-1">No question banks</h3>
          <p className="font-mono text-xs text-gray-400 mb-4">
            {categoryFilter !== "all" ? `No ${categoryFilter} banks found.` : "Create your first question bank."}
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-mono text-xs tracking-wider"
          >
            <Plus className="w-3 h-3" /> New Bank
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {banks.map((bank) => (
            <div key={bank.id} className={`group ${panelSurface} ${panelHover} p-5`}>
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-black dark:text-white truncate">{bank.name}</h3>
                  {bank.description && (
                    <p className="font-mono text-[10px] text-gray-400 mt-1 line-clamp-2">{bank.description}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(bank.id)}
                  className="p-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 border border-black/10 dark:border-white/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-gray-500">
                  <Tag className="w-2.5 h-2.5" /> {bank.category.replace("_", " ")}
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-gray-400">
                  <Hash className="w-2.5 h-2.5" /> {bank._count.questions} questions
                </span>
              </div>
              <p className="font-mono text-[9px] text-gray-300 dark:text-gray-600 mt-3">
                Created {new Date(bank.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </DashboardPageShell>
  );
}
