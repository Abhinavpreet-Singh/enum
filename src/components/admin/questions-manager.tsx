"use client";

import { useEffect, useState, useMemo } from "react";
import { Question, fetchQuestions } from "@/data/dsa-questions";
import { Edit, Trash2, Search, Filter } from "lucide-react";
import axios from "axios";
import { proxy } from "@/app/proxy";

interface QuestionsManagerProps {
    onEdit: (question: Question) => void;
}

export default function QuestionsManager({ onEdit }: QuestionsManagerProps) {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [difficultyFilter, setDifficultyFilter] = useState<string>("All");
    const [categoryFilter, setCategoryFilter] = useState<string>("All");

    useEffect(() => {
        const loadQuestions = async () => {
            setLoading(true);
            const fetchedQuestions = await fetchQuestions();
            setQuestions(fetchedQuestions);
            setLoading(false);
        };
        loadQuestions();
    }, []);

    const filteredQuestions = useMemo(() => {
        let filtered = [...questions];

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(
                (q) =>
                    q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    q.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Difficulty filter
        if (difficultyFilter !== "All") {
            filtered = filtered.filter((q) => q.difficulty === difficultyFilter);
        }

        // Category filter
        if (categoryFilter !== "All") {
            filtered = filtered.filter((q) => q.category === categoryFilter);
        }

        return filtered;
    }, [questions, searchTerm, difficultyFilter, categoryFilter]);

    const handleDelete = async (questionId: string, title: string) => {
        if (!confirm(`Are you sure you want to delete "${title}"?`)) {
            return;
        }

        try {
            // Note: You'll need to implement this endpoint in your backend
            await axios.delete(`${proxy}/api/v1/admin/deleteQuestion/${questionId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                },
            });

            alert("Question deleted successfully!");
            // Reload questions after deletion
            const fetchedQuestions = await fetchQuestions();
            setQuestions(fetchedQuestions);
        } catch (error) {
            console.error("Error deleting question:", error);
            alert("Failed to delete question. Please try again.");
        }
    };

    const difficultyColors = {
        Easy: "text-green-600 bg-green-50 border-green-200",
        Medium: "text-yellow-600 bg-yellow-50 border-yellow-200",
        Hard: "text-red-600 bg-red-50 border-red-200",
    };

    const uniqueCategories = Array.from(new Set(questions.map((q) => q.category)));

    if (loading) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
                <div className="text-center text-gray-500 font-mono text-sm">
                    Loading questions...
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters Section */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-5 h-5 text-gray-600" />
                    <h2 className="font-mono text-sm text-gray-700 tracking-wide">
                        FILTERS & SEARCH
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search questions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                        />
                    </div>

                    {/* Difficulty Filter */}
                    <select
                        value={difficultyFilter}
                        onChange={(e) => setDifficultyFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                    >
                        <option value="All">All Difficulties</option>
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                    </select>

                    {/* Category Filter */}
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                    >
                        <option value="All">All Categories</option>
                        {uniqueCategories.map((category) => (
                            <option key={category} value={category}>
                                {category}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mt-4 text-xs font-mono text-gray-500">
                    Showing {filteredQuestions.length} of {questions.length} questions
                </div>
            </div>

            {/* Questions List */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                {filteredQuestions.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 font-mono text-sm">
                        No questions found. Try adjusting your filters.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {filteredQuestions.map((question) => (
                            <div
                                key={question.id}
                                className="p-6 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-black mb-2">
                                            {question.title}
                                        </h3>
                                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                            {question.description}
                                        </p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span
                                                className={`px-2 py-1 rounded text-xs font-mono tracking-wide border ${difficultyColors[question.difficulty]
                                                    }`}
                                            >
                                                {question.difficulty}
                                            </span>
                                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono tracking-wide">
                                                {question.category}
                                            </span>
                                            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-mono tracking-wide">
                                                {question.examples.length} test cases
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => onEdit(question)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                            title="Edit question"
                                        >
                                            <Edit className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(question.id, question.title)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                            title="Delete question"
                                        >
                                            <Trash2 className="w-5 h-5" />
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
