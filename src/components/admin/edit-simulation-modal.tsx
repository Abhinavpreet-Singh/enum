"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, FileCode } from "lucide-react";
import axios from "axios";
import { proxy } from "@/app/proxy";
import type { SimulationListItem } from "./simulations-manager";

interface SimulationFile {
    name: string;
    path: string;
    content: string;
    language: string;
}

interface EditSimulationModalProps {
    simulation: SimulationListItem | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditSimulationModal({ simulation, onClose, onSuccess }: EditSimulationModalProps) {
    const [formData, setFormData] = useState({
        title: "",
        category: "backend" as "frontend" | "backend" | "fullstack" | "devops",
        difficulty: "easy" as "easy" | "medium" | "hard",
        description: "",
        incident: "",
        estimatedTime: 15,
        xpReward: 50,
        tags: "",
    });

    const [steps, setSteps] = useState<{ description: string }[]>([{ description: "" }]);
    const [initialFiles, setInitialFiles] = useState<SimulationFile[]>([
        { name: "", path: "", content: "", language: "javascript" },
    ]);
    const [solutionFiles, setSolutionFiles] = useState<{ fileName: string; code: string }[]>([
        { fileName: "", code: "" },
    ]);
    const [hints, setHints] = useState<string[]>([""]);
    const [loading, setLoading] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<{
        type: "success" | "error" | null;
        message: string;
    }>({ type: null, message: "" });

    useEffect(() => {
        if (simulation) {
            setFormData({
                title: simulation.title,
                category: simulation.category,
                difficulty: simulation.difficulty,
                description: simulation.description,
                incident: simulation.incident,
                estimatedTime: simulation.estimatedTime,
                xpReward: simulation.xpReward,
                tags: simulation.tags?.join(", ") || "",
            });
            setSteps(simulation.steps?.length ? simulation.steps : [{ description: "" }]);
            setInitialFiles(
                simulation.initialFiles?.length
                    ? simulation.initialFiles
                    : [{ name: "", path: "", content: "", language: "javascript" }]
            );

            // Convert solution map to array
            const solutionEntries = simulation.solution
                ? Object.entries(simulation.solution).map(([fileName, code]) => ({ fileName, code }))
                : [{ fileName: "", code: "" }];
            setSolutionFiles(solutionEntries.length ? solutionEntries : [{ fileName: "", code: "" }]);

            setHints(simulation.hints?.length ? simulation.hints : [""]);
        }
    }, [simulation]);

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // Steps
    const addStep = () => setSteps([...steps, { description: "" }]);
    const removeStep = (i: number) => {
        if (steps.length > 1) setSteps(steps.filter((_, idx) => idx !== i));
    };
    const updateStep = (i: number, value: string) => {
        const updated = [...steps];
        updated[i] = { description: value };
        setSteps(updated);
    };

    // Files
    const addFile = () =>
        setInitialFiles([...initialFiles, { name: "", path: "", content: "", language: "javascript" }]);
    const removeFile = (i: number) => {
        if (initialFiles.length > 1) setInitialFiles(initialFiles.filter((_, idx) => idx !== i));
    };
    const updateFile = (i: number, field: keyof SimulationFile, value: string) => {
        const updated = [...initialFiles];
        updated[i] = { ...updated[i], [field]: value };
        setInitialFiles(updated);
    };

    // Solution files
    const addSolutionFile = () => setSolutionFiles([...solutionFiles, { fileName: "", code: "" }]);
    const removeSolutionFile = (i: number) => {
        if (solutionFiles.length > 1) setSolutionFiles(solutionFiles.filter((_, idx) => idx !== i));
    };
    const updateSolutionFile = (i: number, field: "fileName" | "code", value: string) => {
        const updated = [...solutionFiles];
        updated[i] = { ...updated[i], [field]: value };
        setSolutionFiles(updated);
    };

    // Hints
    const addHint = () => setHints([...hints, ""]);
    const removeHint = (i: number) => {
        if (hints.length > 1) setHints(hints.filter((_, idx) => idx !== i));
    };
    const updateHint = (i: number, value: string) => {
        const updated = [...hints];
        updated[i] = value;
        setHints(updated);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSubmitStatus({ type: null, message: "" });

        try {
            const solution: Record<string, string> = {};
            solutionFiles.forEach((sf) => {
                if (sf.fileName.trim()) {
                    solution[sf.fileName.trim()] = sf.code;
                }
            });

            const payload = {
                title: formData.title,
                category: formData.category,
                difficulty: formData.difficulty,
                description: formData.description,
                incident: formData.incident,
                estimatedTime: Number(formData.estimatedTime),
                xpReward: Number(formData.xpReward),
                tags: formData.tags.split(",").map((t) => t.trim()).filter(Boolean),
                steps: steps.filter((s) => s.description.trim()),
                initialFiles: initialFiles.filter((f) => f.name.trim() && f.path.trim()),
                solution,
                hints: hints.filter((h) => h.trim()),
            };

            await axios.put(
                `${proxy}/api/v1/simulations/editSimulation/${simulation?._id}`,
                payload,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                    },
                }
            );

            setSubmitStatus({ type: "success", message: "Simulation updated successfully!" });

            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);
        } catch (error) {
            console.error("Error updating simulation:", error);
            setSubmitStatus({
                type: "error",
                message:
                    error instanceof Error
                        ? `Failed to update simulation: ${error.message}`
                        : "Failed to update simulation. Please try again.",
            });
        } finally {
            setLoading(false);
        }
    };

    if (!simulation) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full my-8">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-2xl font-bold text-black">Edit Simulation</h2>
                        <p className="font-mono text-xs text-gray-500 mt-1">ID: {simulation._id}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-md transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                    {submitStatus.type && (
                        <div
                            className={`mb-6 p-4 rounded-md font-mono text-sm ${
                                submitStatus.type === "success"
                                    ? "bg-green-50 text-green-800 border border-green-200"
                                    : "bg-red-50 text-red-800 border border-red-200"
                            }`}
                        >
                            {submitStatus.message}
                        </div>
                    )}

                    {/* Title */}
                    <div className="mb-6">
                        <label className="block font-mono text-sm text-gray-700 mb-2 tracking-wide">SIMULATION TITLE *</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                        />
                    </div>

                    {/* Category, Difficulty */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block font-mono text-sm text-gray-700 mb-2 tracking-wide">CATEGORY *</label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                            >
                                <option value="frontend">Frontend</option>
                                <option value="backend">Backend</option>
                                <option value="fullstack">Full Stack</option>
                                <option value="devops">DevOps</option>
                            </select>
                        </div>
                        <div>
                            <label className="block font-mono text-sm text-gray-700 mb-2 tracking-wide">DIFFICULTY *</label>
                            <select
                                name="difficulty"
                                value={formData.difficulty}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                            >
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="mb-6">
                        <label className="block font-mono text-sm text-gray-700 mb-2 tracking-wide">DESCRIPTION *</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            required
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm resize-vertical"
                        />
                    </div>

                    {/* Incident */}
                    <div className="mb-6">
                        <label className="block font-mono text-sm text-gray-700 mb-2 tracking-wide">INCIDENT / ERROR *</label>
                        <textarea
                            name="incident"
                            value={formData.incident}
                            onChange={handleInputChange}
                            required
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm resize-vertical"
                        />
                    </div>

                    {/* Time, XP, Tags */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div>
                            <label className="block font-mono text-sm text-gray-700 mb-2 tracking-wide">ESTIMATED TIME (min)</label>
                            <input
                                type="number"
                                name="estimatedTime"
                                value={formData.estimatedTime}
                                onChange={handleInputChange}
                                min={1}
                                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                            />
                        </div>
                        <div>
                            <label className="block font-mono text-sm text-gray-700 mb-2 tracking-wide">XP REWARD</label>
                            <input
                                type="number"
                                name="xpReward"
                                value={formData.xpReward}
                                onChange={handleInputChange}
                                min={0}
                                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                            />
                        </div>
                        <div>
                            <label className="block font-mono text-sm text-gray-700 mb-2 tracking-wide">TAGS (comma-separated)</label>
                            <input
                                type="text"
                                name="tags"
                                value={formData.tags}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                            />
                        </div>
                    </div>

                    {/* Steps */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <label className="block font-mono text-sm text-gray-700 tracking-wide">STEPS</label>
                            <button
                                type="button"
                                onClick={addStep}
                                className="flex items-center gap-2 px-4 py-2 bg-black text-white font-mono text-xs tracking-wide hover:bg-gray-800 transition-colors rounded-md"
                            >
                                <Plus className="w-4 h-4" />
                                ADD STEP
                            </button>
                        </div>
                        <div className="space-y-3">
                            {steps.map((step, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="text-xs text-gray-500 font-mono w-6">{i + 1}.</span>
                                    <input
                                        type="text"
                                        value={step.description}
                                        onChange={(e) => updateStep(i, e.target.value)}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                    />
                                    {steps.length > 1 && (
                                        <button type="button" onClick={() => removeStep(i)} className="text-red-600 hover:text-red-700">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Initial Files */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <label className="block font-mono text-sm text-gray-700 tracking-wide">
                                <FileCode className="w-4 h-4 inline mr-1" />
                                INITIAL FILES
                            </label>
                            <button
                                type="button"
                                onClick={addFile}
                                className="flex items-center gap-2 px-4 py-2 bg-black text-white font-mono text-xs tracking-wide hover:bg-gray-800 transition-colors rounded-md"
                            >
                                <Plus className="w-4 h-4" />
                                ADD FILE
                            </button>
                        </div>
                        <div className="space-y-4">
                            {initialFiles.map((file, i) => (
                                <div key={i} className="p-4 border border-gray-200 rounded-md bg-gray-50">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-mono text-xs text-gray-600">FILE #{i + 1}</span>
                                        {initialFiles.length > 1 && (
                                            <button type="button" onClick={() => removeFile(i)} className="text-red-600 hover:text-red-700">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                        <input
                                            type="text"
                                            value={file.name}
                                            onChange={(e) => updateFile(i, "name", e.target.value)}
                                            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                            placeholder="File name"
                                        />
                                        <input
                                            type="text"
                                            value={file.path}
                                            onChange={(e) => updateFile(i, "path", e.target.value)}
                                            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                            placeholder="File path"
                                        />
                                        <select
                                            value={file.language}
                                            onChange={(e) => updateFile(i, "language", e.target.value)}
                                            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                        >
                                            <option value="javascript">JavaScript</option>
                                            <option value="typescript">TypeScript</option>
                                            <option value="python">Python</option>
                                            <option value="java">Java</option>
                                            <option value="html">HTML</option>
                                            <option value="css">CSS</option>
                                            <option value="json">JSON</option>
                                        </select>
                                    </div>
                                    <textarea
                                        value={file.content}
                                        onChange={(e) => updateFile(i, "content", e.target.value)}
                                        rows={6}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black resize-vertical"
                                        placeholder="File content..."
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Solution Files */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <label className="block font-mono text-sm text-gray-700 tracking-wide">SOLUTION FILES</label>
                            <button
                                type="button"
                                onClick={addSolutionFile}
                                className="flex items-center gap-2 px-4 py-2 bg-black text-white font-mono text-xs tracking-wide hover:bg-gray-800 transition-colors rounded-md"
                            >
                                <Plus className="w-4 h-4" />
                                ADD SOLUTION
                            </button>
                        </div>
                        <div className="space-y-4">
                            {solutionFiles.map((sf, i) => (
                                <div key={i} className="p-4 border border-gray-200 rounded-md bg-gray-50">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-mono text-xs text-gray-600">SOLUTION #{i + 1}</span>
                                        {solutionFiles.length > 1 && (
                                            <button type="button" onClick={() => removeSolutionFile(i)} className="text-red-600 hover:text-red-700">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        value={sf.fileName}
                                        onChange={(e) => updateSolutionFile(i, "fileName", e.target.value)}
                                        className="w-full mb-3 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                        placeholder="File name (must match an initial file)"
                                    />
                                    <textarea
                                        value={sf.code}
                                        onChange={(e) => updateSolutionFile(i, "code", e.target.value)}
                                        rows={6}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black resize-vertical"
                                        placeholder="Correct solution code..."
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Hints */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <label className="block font-mono text-sm text-gray-700 tracking-wide">HINTS</label>
                            <button
                                type="button"
                                onClick={addHint}
                                className="flex items-center gap-2 px-4 py-2 bg-black text-white font-mono text-xs tracking-wide hover:bg-gray-800 transition-colors rounded-md"
                            >
                                <Plus className="w-4 h-4" />
                                ADD HINT
                            </button>
                        </div>
                        <div className="space-y-3">
                            {hints.map((hint, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="text-xs text-gray-500 font-mono w-6">{i + 1}.</span>
                                    <input
                                        type="text"
                                        value={hint}
                                        onChange={(e) => updateHint(i, e.target.value)}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                    />
                                    {hints.length > 1 && (
                                        <button type="button" onClick={() => removeHint(i)} className="text-red-600 hover:text-red-700">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-6 py-3 bg-black text-white font-mono text-sm tracking-wide hover:bg-gray-800 transition-colors rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {loading ? "UPDATING..." : "UPDATE SIMULATION"}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-mono text-sm tracking-wide hover:bg-gray-50 transition-colors rounded-md"
                        >
                            CANCEL
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
