"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { proxy } from "@/app/proxy";
import axios from "axios";
interface Testcase {
    input: string;
    output: string;
}

export default function QuestionForm() {
    const [formData, setFormData] = useState({
        title: "",
        desc: "",
        level: "Easy" as "Easy" | "Medium" | "Hard",
        constraints: "",
        topic: "",
    });

    const [testcases, setTestcases] = useState<Testcase[]>([
        { input: "", output: "" },
    ]);

    const [submitStatus, setSubmitStatus] = useState<{
        type: "success" | "error" | null;
        message: string;
    }>({ type: null, message: "" });

    const handleInputChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleTestcaseChange = (
        index: number,
        field: keyof Testcase,
        value: string
    ) => {
        const updatedTestcases = [...testcases];
        updatedTestcases[index] = {
            ...updatedTestcases[index],
            [field]: value,
        };
        setTestcases(updatedTestcases);
    };

    const addTestcase = () => {
        setTestcases([...testcases, { input: "", output: "" }]);
    };

    const removeTestcase = (index: number) => {
        if (testcases.length > 1) {
            setTestcases(testcases.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitStatus({ type: null, message: "" });

        try {
            const response = await axios.post(`${proxy}/api/v1/admin/adminPostQuestion`,
                {
                    title: formData.title,
                    desc: formData.desc,
                    level: formData.level,
                    constraints: formData.constraints,
                    topic: formData.topic,
                    testcases
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                    },
                })

            console.log("Response:", response.data)
            console.log("Status:", response.status)
            
            if (response.status === 201) {
                setSubmitStatus({
                    type: "success",
                    message: "Question posted successfully!",
                });

                // Reset form after successful submission
                setFormData({
                    title: "",
                    desc: "",
                    level: "Easy",
                    constraints: "",
                    topic: "",
                });
                setTestcases([{ input: "", output: "" }]);
            }

        } catch (error) {
            console.error("Error posting question:", error);
            setSubmitStatus({
                type: "error",
                message: error instanceof Error
                    ? `Failed to post question: ${error.message}`
                    : "Failed to post question. Please try again.",
            });
        }
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <form onSubmit={handleSubmit} className="p-6 md:p-8">
                {/* Status Message */}
                {submitStatus.type && (
                    <div
                        className={`mb-6 p-4 rounded-md font-mono text-sm ${submitStatus.type === "success"
                            ? "bg-green-50 text-green-800 border border-green-200"
                            : "bg-red-50 text-red-800 border border-red-200"
                            }`}
                    >
                        {submitStatus.message}
                    </div>
                )}

                {/* Title */}
                <div className="mb-6">
                    <label
                        htmlFor="title"
                        className="block font-mono text-sm text-gray-700 mb-2 tracking-wide"
                    >
                        QUESTION TITLE *
                    </label>
                    <input
                        type="text"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                        placeholder="e.g., Two Sum"
                    />
                </div>

                {/* Description */}
                <div className="mb-6">
                    <label
                        htmlFor="desc"
                        className="block font-mono text-sm text-gray-700 mb-2 tracking-wide"
                    >
                        DESCRIPTION *
                    </label>
                    <textarea
                        id="desc"
                        name="desc"
                        value={formData.desc}
                        onChange={handleInputChange}
                        required
                        rows={6}
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm resize-vertical"
                        placeholder="Describe the problem in detail..."
                    />
                </div>

                {/* Level and Topic Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Level */}
                    <div>
                        <label
                            htmlFor="level"
                            className="block font-mono text-sm text-gray-700 mb-2 tracking-wide"
                        >
                            DIFFICULTY LEVEL *
                        </label>
                        <select
                            id="level"
                            name="level"
                            value={formData.level}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                        >
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                        </select>
                    </div>

                    {/* Topic */}
                    <div>
                        <label
                            htmlFor="topic"
                            className="block font-mono text-sm text-gray-700 mb-2 tracking-wide"
                        >
                            TOPIC *
                        </label>
                        <input
                            type="text"
                            id="topic"
                            name="topic"
                            value={formData.topic}
                            onChange={handleInputChange}
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                            placeholder="e.g., Arrays, Hash Table"
                        />
                    </div>
                </div>

                {/* Constraints */}
                <div className="mb-6">
                    <label
                        htmlFor="constraints"
                        className="block font-mono text-sm text-gray-700 mb-2 tracking-wide"
                    >
                        CONSTRAINTS
                    </label>
                    <textarea
                        id="constraints"
                        name="constraints"
                        value={formData.constraints}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm resize-vertical"
                        placeholder="e.g., 1 <= nums.length <= 10^4"
                    />
                </div>

                {/* Testcases */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <label className="block font-mono text-sm text-gray-700 tracking-wide">
                            TEST CASES
                        </label>
                        <button
                            type="button"
                            onClick={addTestcase}
                            className="flex items-center gap-2 px-4 py-2 bg-black text-white font-mono text-xs tracking-wide hover:bg-gray-800 transition-colors rounded-md"
                        >
                            <Plus className="w-4 h-4" />
                            ADD TESTCASE
                        </button>
                    </div>

                    <div className="space-y-4">
                        {testcases.map((testcase, index) => (
                            <div
                                key={index}
                                className="p-4 border border-gray-200 rounded-md bg-gray-50"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="font-mono text-xs text-gray-600">
                                        TESTCASE #{index + 1}
                                    </span>
                                    {testcases.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeTestcase(index)}
                                            className="text-red-600 hover:text-red-700 transition-colors"
                                            title="Remove testcase"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">
                                            Input
                                        </label>
                                        <input
                                            type="text"
                                            value={testcase.input}
                                            onChange={(e) =>
                                                handleTestcaseChange(index, "input", e.target.value)
                                            }
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm bg-white"
                                            placeholder="e.g., [2, 7, 11, 15], target = 9"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">
                                            Output
                                        </label>
                                        <input
                                            type="text"
                                            value={testcase.output}
                                            onChange={(e) =>
                                                handleTestcaseChange(index, "output", e.target.value)
                                            }
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm bg-white"
                                            placeholder="e.g., [0, 1]"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-4 border-t border-gray-200">
                    <button
                        type="submit"
                        className="px-8 py-3 bg-black text-white font-mono text-sm tracking-wide hover:bg-gray-800 transition-colors rounded-md"
                    >
                        POST QUESTION
                    </button>
                </div>
            </form>
        </div>
    );
}
