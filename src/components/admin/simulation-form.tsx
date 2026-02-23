"use client";

import { useState } from "react";
import { Plus, Trash2, FileCode } from "lucide-react";
import { proxy } from "@/app/proxy";
import axios from "axios";

interface SimulationFile {
    name: string;
    path: string;
    content: string;
    language: string;
}

interface SimulationStep {
    description: string;
}

export default function SimulationForm() {
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

    const [steps, setSteps] = useState<SimulationStep[]>([{ description: "" }]);
    const [initialFiles, setInitialFiles] = useState<SimulationFile[]>([
        { name: "", path: "", content: "", language: "javascript" },
    ]);
    const [solutionFiles, setSolutionFiles] = useState<{ fileName: string; code: string }[]>([
        { fileName: "", code: "" },
    ]);
    const [hints, setHints] = useState<string[]>([""]);

    const [submitStatus, setSubmitStatus] = useState<{
        type: "success" | "error" | null;
        message: string;
    }>({ type: null, message: "" });

    const [loading, setLoading] = useState(false);

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
        setSubmitStatus({ type: null, message: "" });
        setLoading(true);

        try {
            // Build solution map
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

            const response = await axios.post(
                `${proxy}/api/v1/simulations/adminPostSimulation`,
                payload,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                    },
                }
            );

            if (response.status === 201) {
                setSubmitStatus({ type: "success", message: "Simulation created successfully!" });
                // Reset form
                setFormData({
                    title: "",
                    category: "backend",
                    difficulty: "easy",
                    description: "",
                    incident: "",
                    estimatedTime: 15,
                    xpReward: 50,
                    tags: "",
                });
                setSteps([{ description: "" }]);
                setInitialFiles([{ name: "", path: "", content: "", language: "javascript" }]);
                setSolutionFiles([{ fileName: "", code: "" }]);
                setHints([""]);
            }
        } catch (error) {
            console.error("Error creating simulation:", error);
            setSubmitStatus({
                type: "error",
                message:
                    error instanceof Error
                        ? `Failed to create simulation: ${error.message}`
                        : "Failed to create simulation. Please try again.",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <form onSubmit={handleSubmit} className="p-6 md:p-8">
                {/* Status Message */}
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
                    <label htmlFor="sim-title" className="block font-mono text-sm text-gray-700 mb-2 tracking-wide">
                        SIMULATION TITLE *
                    </label>
                    <input
                        type="text"
                        id="sim-title"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                        placeholder="e.g., Debug: Missing Console Output"
                    />
                </div>

                {/* Category, Difficulty Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label htmlFor="sim-category" className="block font-mono text-sm text-gray-700 mb-2 tracking-wide">
                            CATEGORY *
                        </label>
                        <select
                            id="sim-category"
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
                        <label htmlFor="sim-difficulty" className="block font-mono text-sm text-gray-700 mb-2 tracking-wide">
                            DIFFICULTY *
                        </label>
                        <select
                            id="sim-difficulty"
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
                    <label htmlFor="sim-description" className="block font-mono text-sm text-gray-700 mb-2 tracking-wide">
                        DESCRIPTION *
                    </label>
                    <textarea
                        id="sim-description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        required
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm resize-vertical"
                        placeholder="Describe what the simulation is about..."
                    />
                </div>

                {/* Incident */}
                <div className="mb-6">
                    <label htmlFor="sim-incident" className="block font-mono text-sm text-gray-700 mb-2 tracking-wide">
                        INCIDENT / ERROR MESSAGE *
                    </label>
                    <textarea
                        id="sim-incident"
                        name="incident"
                        value={formData.incident}
                        onChange={handleInputChange}
                        required
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm resize-vertical"
                        placeholder="The error message or incident description users will see..."
                    />
                </div>

                {/* Estimated Time, XP, Tags Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                        <label htmlFor="sim-time" className="block font-mono text-sm text-gray-700 mb-2 tracking-wide">
                            ESTIMATED TIME (min)
                        </label>
                        <input
                            type="number"
                            id="sim-time"
                            name="estimatedTime"
                            value={formData.estimatedTime}
                            onChange={handleInputChange}
                            min={1}
                            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="sim-xp" className="block font-mono text-sm text-gray-700 mb-2 tracking-wide">
                            XP REWARD
                        </label>
                        <input
                            type="number"
                            id="sim-xp"
                            name="xpReward"
                            value={formData.xpReward}
                            onChange={handleInputChange}
                            min={0}
                            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="sim-tags" className="block font-mono text-sm text-gray-700 mb-2 tracking-wide">
                            TAGS (comma-separated)
                        </label>
                        <input
                            type="text"
                            id="sim-tags"
                            name="tags"
                            value={formData.tags}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                            placeholder="e.g., JavaScript, Debug, Node.js"
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
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                                    placeholder="Step description..."
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
                            INITIAL FILES (buggy code)
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
                                        placeholder="File name (e.g., index.js)"
                                    />
                                    <input
                                        type="text"
                                        value={file.path}
                                        onChange={(e) => updateFile(i, "path", e.target.value)}
                                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                        placeholder="File path (e.g., src/index.js)"
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
                                    rows={8}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black resize-vertical"
                                    placeholder="Paste the initial (buggy) code here..."
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
                                    placeholder="File name (e.g., index.js) — must match an initial file"
                                />
                                <textarea
                                    value={sf.code}
                                    onChange={(e) => updateSolutionFile(i, "code", e.target.value)}
                                    rows={8}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black resize-vertical"
                                    placeholder="Paste the correct solution code here..."
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
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                                    placeholder="Hint text..."
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

                {/* Submit */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-6 py-4 bg-black text-white font-mono text-sm tracking-wide hover:bg-gray-800 transition-colors rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {loading ? "CREATING SIMULATION..." : "CREATE SIMULATION"}
                </button>
            </form>
        </div>
    );
}
