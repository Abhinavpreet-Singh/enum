"use client";

import { useEffect, useState } from "react";
import QuestionForm from "@/components/admin/question-form";
import QuestionsManager from "@/components/admin/questions-manager";
import EditQuestionModal from "@/components/admin/edit-question-modal";
import SimulationForm from "@/components/admin/simulation-form";
import SimulationsManager from "@/components/admin/simulations-manager";
import EditSimulationModal from "@/components/admin/edit-simulation-modal";
import type { SimulationListItem } from "@/components/admin/simulations-manager";
import { Question } from "@/data/dsa-questions";
import { Plus, List, BarChart3, Bug } from "lucide-react";
import axios from "axios";
import { proxy } from "@/app/proxy";

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<"create" | "manage" | "stats" | "sim-create" | "sim-manage">("create");
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [editingSimulation, setEditingSimulation] = useState<SimulationListItem | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleEdit = (question: Question) => {
        setEditingQuestion(question);
    };

    const handleEditSimulation = (simulation: SimulationListItem) => {
        setEditingSimulation(simulation);
    };

    const handleCloseModal = () => {
        setEditingQuestion(null);
    };

    const handleCloseSimulationModal = () => {
        setEditingSimulation(null);
    };

    const handleSuccess = () => {
        setRefreshKey((prev) => prev + 1);
    };

    return (
        <>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-black mb-2">
                        Admin Panel
                    </h1>
                    <p className="font-mono text-sm text-gray-600 tracking-wide">
                        MANAGE DSA QUESTIONS & SIMULATIONS
                    </p>
                </div>

                {/* Section Labels */}
                <div className="mb-2">
                    <span className="font-mono text-xs text-gray-400 tracking-widest">DSA QUESTIONS</span>
                </div>

                {/* Tabs */}
                <div className="mb-6 border-b border-gray-200">
                    <div className="flex gap-1 flex-wrap">
                        <button
                            onClick={() => setActiveTab("create")}
                            className={`flex items-center gap-2 px-6 py-3 font-mono text-sm tracking-wide transition-all ${activeTab === "create"
                                ? "border-b-2 border-black text-black"
                                : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            <Plus className="w-4 h-4" />
                            CREATE QUESTION
                        </button>
                        <button
                            onClick={() => setActiveTab("manage")}
                            className={`flex items-center gap-2 px-6 py-3 font-mono text-sm tracking-wide transition-all ${activeTab === "manage"
                                ? "border-b-2 border-black text-black"
                                : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            <List className="w-4 h-4" />
                            MANAGE QUESTIONS
                        </button>

                        <div className="w-px bg-gray-300 mx-2 my-1" />

                        <button
                            onClick={() => setActiveTab("sim-create")}
                            className={`flex items-center gap-2 px-6 py-3 font-mono text-sm tracking-wide transition-all ${activeTab === "sim-create"
                                ? "border-b-2 border-black text-black"
                                : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            <Bug className="w-4 h-4" />
                            CREATE SIMULATION
                        </button>
                        <button
                            onClick={() => setActiveTab("sim-manage")}
                            className={`flex items-center gap-2 px-6 py-3 font-mono text-sm tracking-wide transition-all ${activeTab === "sim-manage"
                                ? "border-b-2 border-black text-black"
                                : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            <List className="w-4 h-4" />
                            MANAGE SIMULATIONS
                        </button>

                        <div className="w-px bg-gray-300 mx-2 my-1" />

                        <button
                            onClick={() => setActiveTab("stats")}
                            className={`flex items-center gap-2 px-6 py-3 font-mono text-sm tracking-wide transition-all ${activeTab === "stats"
                                ? "border-b-2 border-black text-black"
                                : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            <BarChart3 className="w-4 h-4" />
                            STATISTICS
                        </button>
                    </div>
                </div>

                {/* Tab Content */}
                {activeTab === "create" && <QuestionForm />}
                {activeTab === "manage" && (
                    <QuestionsManager key={refreshKey} onEdit={handleEdit} />
                )}
                {activeTab === "sim-create" && <SimulationForm />}
                {activeTab === "sim-manage" && (
                    <SimulationsManager key={`sim-${refreshKey}`} onEdit={handleEditSimulation} />
                )}
                {activeTab === "stats" && <AdminStats />}
            </div>

            {/* Edit Question Modal */}
            {editingQuestion && (
                <EditQuestionModal
                    question={editingQuestion}
                    onClose={handleCloseModal}
                    onSuccess={handleSuccess}
                />
            )}

            {/* Edit Simulation Modal */}
            {editingSimulation && (
                <EditSimulationModal
                    simulation={editingSimulation}
                    onClose={handleCloseSimulationModal}
                    onSuccess={handleSuccess}
                />
            )}
        </>
    );
}

// Statistics Component
function AdminStats() {
    const [totalQues, setTotalQues] = useState(0);

    useEffect(() => {
        const handleTotalQues = async () => {
            try {
                const response = await axios.get(`${proxy}/api/v1/questions/getQuestion`)
                const simulations = await axios.get(`${proxy}/api/v1/simulations/getSimulations`)
                setTotalQues(response.data.data.length + simulations.data.data.length);
            } catch (error) {
                console.log(error);
            }
        }
        handleTotalQues();
    }, [])

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
            <h2 className="text-xl font-bold text-black mb-6">Question Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Questions" value={totalQues.toString()} color="blue" />
                <StatCard title="By Difficulty" value="Coming Soon" color="green" />
                <StatCard title="By Category" value="Coming Soon" color="purple" />
            </div>
        </div>
    );
}

function StatCard({
    title,
    value,
    color,
}: {
    title: string;
    value: string;
    color: string;
}) {
    const colorClasses = {
        blue: "bg-blue-50 border-blue-200 text-blue-700",
        green: "bg-green-50 border-green-200 text-green-700",
        purple: "bg-purple-50 border-purple-200 text-purple-700",
    };

    return (
        <div
            className={`p-6 rounded-lg border-2 ${colorClasses[color as keyof typeof colorClasses]
                }`}
        >
            <div className="font-mono text-xs tracking-wide mb-2">{title}</div>
            <div className="text-2xl font-bold">{value}</div>
        </div>
    );
}