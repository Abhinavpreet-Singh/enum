"use client";

import api from "@/lib/api";
import { getAdminRequestConfig } from "@/lib/admin-api";
import { useEffect, useState, useMemo } from "react";
import { Question, fetchAdminQuestions } from "@/data/dsa-questions";
import { Edit, Trash2, Search, Filter } from "lucide-react";
import {
  actionButtonCls,
  inputCls,
  panelSurface,
} from "@/components/admin/content/admin-form-styles";

interface QuestionsManagerProps {
  onEdit: (question: Question) => void;
  onChanged?: () => void;
}

export default function QuestionsManager({ onEdit, onChanged }: QuestionsManagerProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  const loadQuestions = async () => {
    setLoading(true);
    const fetchedQuestions = await fetchAdminQuestions();
    setQuestions(fetchedQuestions);
    setLoading(false);
  };

  useEffect(() => {
    void loadQuestions();
  }, []);

  const filteredQuestions = useMemo(() => {
    let filtered = [...questions];

    if (searchTerm) {
      filtered = filtered.filter(
        (q) =>
          q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.description.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (difficultyFilter !== "All") {
      filtered = filtered.filter((q) => q.difficulty === difficultyFilter);
    }

    if (categoryFilter !== "All") {
      filtered = filtered.filter((q) => q.category === categoryFilter);
    }

    return filtered;
  }, [questions, searchTerm, difficultyFilter, categoryFilter]);

  const handleDelete = async (questionId: string, title: string) => {
    if (!confirm(`Delete DSA question "${title}"? This cannot be undone.`)) {
      return;
    }

    setBusyId(questionId);
    try {
      await api.delete(`/api/v1/admin/deleteQuestion/${questionId}`, getAdminRequestConfig());
      await loadQuestions();
      onChanged?.();
    } catch (error) {
      console.error("Error deleting question:", error);
      alert("Failed to delete question. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteAll = async () => {
    if (questions.length === 0) return;
    const confirmed = confirm(
      `Delete ALL ${questions.length} DSA Arena questions, including submissions and solutions? This cannot be undone.`,
    );
    if (!confirmed) return;
    const typed = window.prompt(`Type DELETE to confirm deleting ${questions.length} questions:`);
    if (typed !== "DELETE") return;

    setBusyId("all");
    try {
      await api.delete("/api/v1/admin/dsa-questions", getAdminRequestConfig());
      await loadQuestions();
      onChanged?.();
    } catch (error) {
      console.error("Error deleting all DSA questions:", error);
      alert("Failed to delete all DSA questions. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const difficultyColors: Record<string, string> = {
    Easy: "text-green-600 bg-green-50 border-green-200 dark:text-emerald-400 dark:bg-emerald-950/20 dark:border-emerald-400/40",
    Medium: "text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-400/40",
    Hard: "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/20 dark:border-red-400/40",
  };

  const uniqueCategories = Array.from(new Set(questions.map((q) => q.category)));

  if (loading) {
    return (
      <div className={`${panelSurface} p-8`}>
        <div className="text-center text-gray-500 font-mono text-sm">Loading DSA questions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`${panelSurface} p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <h2 className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
              DSA Arena questions
            </h2>
          </div>
          <button
            type="button"
            onClick={() => void handleDeleteAll()}
            disabled={questions.length === 0 || busyId !== null}
            className={`${actionButtonCls} border-red-400/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20`}
          >
            {busyId === "all" ? "Deleting..." : "Delete all DSA questions"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${inputCls} pl-10`}
            />
          </div>

          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className={inputCls}
          >
            <option value="All">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={inputCls}
          >
            <option value="All">All Topics</option>
            {uniqueCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 font-mono text-[10px] text-gray-400">
          Showing {filteredQuestions.length} of {questions.length} questions
        </div>
      </div>

      <div className={`${panelSurface} overflow-hidden`}>
        {filteredQuestions.length === 0 ? (
          <div className="p-8 text-center text-gray-500 font-mono text-sm">
            No DSA questions found.
          </div>
        ) : (
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {filteredQuestions.map((question) => (
              <div key={question.id} className="p-4 hover:bg-black/2 dark:hover:bg-white/3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-black dark:text-white mb-1 truncate">
                      {question.title}
                    </h3>
                    <p className="text-xs text-gray-500 mb-2 line-clamp-2">{question.description}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono tracking-wide border ${
                          difficultyColors[question.difficulty] || ""
                        }`}
                      >
                        {question.difficulty}
                      </span>
                      <span className="px-2 py-0.5 bg-black/5 dark:bg-white/10 text-gray-600 dark:text-gray-300 rounded text-[10px] font-mono">
                        {question.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEdit(question)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-md"
                      title="Edit question"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(question.id, question.title)}
                      disabled={busyId !== null}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md disabled:opacity-50"
                      title="Delete question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
