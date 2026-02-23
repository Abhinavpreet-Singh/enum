"use client";

import { useEffect, useState, useMemo } from "react";
import { Edit, Trash2, Search, Filter, Bug } from "lucide-react";
import axios from "axios";
import { proxy } from "@/app/proxy";

export interface SimulationListItem {
    _id: string;
    title: string;
    category: "frontend" | "backend" | "fullstack" | "devops";
    difficulty: "easy" | "medium" | "hard";
    description: string;
    incident: string;
    tags: string[];
    estimatedTime: number;
    xpReward: number;
    steps: { description: string }[];
    initialFiles: { name: string; path: string; content: string; language: string }[];
    solution: Record<string, string>;
    hints: string[];
}

interface SimulationsManagerProps {
    onEdit: (simulation: SimulationListItem) => void;
}

export default function SimulationsManager({ onEdit }: SimulationsManagerProps) {
    const [simulations, setSimulations] = useState<SimulationListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [difficultyFilter, setDifficultyFilter] = useState<string>("All");
    const [categoryFilter, setCategoryFilter] = useState<string>("All");

    const fetchSimulations = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${proxy}/api/v1/simulations/getSimulations`);
            setSimulations(response.data.data || []);
        } catch (error) {
            console.error("Error fetching simulations:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSimulations();
    }, []);

    const filteredSimulations = useMemo(() => {
        let filtered = [...simulations];

        if (searchTerm) {
            filtered = filtered.filter(
                (s) =>
                    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    s.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (difficultyFilter !== "All") {
            filtered = filtered.filter((s) => s.difficulty === difficultyFilter.toLowerCase());
        }

        if (categoryFilter !== "All") {
            filtered = filtered.filter((s) => s.category === categoryFilter.toLowerCase());
        }

        return filtered;
    }, [simulations, searchTerm, difficultyFilter, categoryFilter]);

    const handleDelete = async (simulationId: string, title: string) => {
        if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

        try {
            await axios.delete(`${proxy}/api/v1/simulations/deleteSimulation/${simulationId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                },
            });
            alert("Simulation deleted successfully!");
            fetchSimulations();
        } catch (error) {
            console.error("Error deleting simulation:", error);
            alert("Failed to delete simulation. Please try again.");
        }
    };

    const difficultyColors: Record<string, string> = {
        easy: "text-green-600 bg-green-50 border-green-200",
        medium: "text-yellow-600 bg-yellow-50 border-yellow-200",
        hard: "text-red-600 bg-red-50 border-red-200",
    };

    const categoryColors: Record<string, string> = {
        frontend: "bg-blue-50 text-blue-700",
        backend: "bg-purple-50 text-purple-700",
        fullstack: "bg-orange-50 text-orange-700",
        devops: "bg-cyan-50 text-cyan-700",
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
                <div className="text-center text-gray-500 font-mono text-sm">Loading simulations...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-5 h-5 text-gray-600" />
                    <h2 className="font-mono text-sm text-gray-700 tracking-wide">FILTERS & SEARCH</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search simulations..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                        />
                    </div>

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

                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                    >
                        <option value="All">All Categories</option>
                        <option value="Frontend">Frontend</option>
                        <option value="Backend">Backend</option>
                        <option value="Fullstack">Full Stack</option>
                        <option value="Devops">DevOps</option>
                    </select>
                </div>

                <div className="mt-4 text-xs font-mono text-gray-500">
                    Showing {filteredSimulations.length} of {simulations.length} simulations
                </div>
            </div>

            {/* Simulations List */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                {filteredSimulations.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 font-mono text-sm">
                        No simulations found. Try adjusting your filters.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {filteredSimulations.map((simulation) => (
                            <div key={simulation._id} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Bug className="w-4 h-4 text-gray-600" />
                                            <h3 className="text-lg font-bold text-black">{simulation.title}</h3>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{simulation.description}</p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span
                                                className={`px-2 py-1 rounded text-xs font-mono tracking-wide border ${
                                                    difficultyColors[simulation.difficulty] || ""
                                                }`}
                                            >
                                                {simulation.difficulty}
                                            </span>
                                            <span
                                                className={`px-2 py-1 rounded text-xs font-mono tracking-wide ${
                                                    categoryColors[simulation.category] || "bg-gray-100 text-gray-700"
                                                }`}
                                            >
                                                {simulation.category}
                                            </span>
                                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono">
                                                {simulation.initialFiles?.length || 0} files
                                            </span>
                                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono">
                                                {simulation.estimatedTime} min
                                            </span>
                                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono">
                                                +{simulation.xpReward} XP
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => onEdit(simulation)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                            title="Edit simulation"
                                        >
                                            <Edit className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(simulation._id, simulation.title)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                            title="Delete simulation"
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
