"use client";

import { useState, useEffect } from "react";
import { Question } from "@/data/dsa-questions";
import { X, Plus, Trash2 } from "lucide-react";
import axios from "axios";
import { proxy } from "@/app/proxy";

interface Testcase {
  input: string;
  output: string;
}

interface EditQuestionModalProps {
  question: Question | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditQuestionModal({
  question,
  onClose,
  onSuccess,
}: EditQuestionModalProps) {
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

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (question) {
      setFormData({
        title: question.title,
        desc: question.description,
        level: question.difficulty,
        constraints: question.constraints.join("\n"),
        topic: question.category,
      });

      setTestcases(
        question.examples.map((ex) => ({
          input: ex.input,
          output: ex.output,
        }))
      );
    }
  }, [question]);

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
    setLoading(true);

    try {
      // Note: You'll need to implement this endpoint in your backend
      const response = await axios.put(
        `${proxy}/api/v1/admin/updateQuestion/${question?.id}`,
        {
          title: formData.title,
          desc: formData.desc,
          level: formData.level,
          constraints: formData.constraints,
          topic: formData.topic,
          testcases,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      console.log("Update Response:", response.data);

      setSubmitStatus({
        type: "success",
        message: "Question updated successfully!",
      });

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Error updating question:", error);
      setSubmitStatus({
        type: "error",
        message:
          error instanceof Error
            ? `Failed to update question: ${error.message}`
            : "Failed to update question. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!question) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-black">Edit Question</h2>
            <p className="font-mono text-xs text-gray-500 mt-1">
              ID: {question.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
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
            <label
              htmlFor="edit-title"
              className="block font-mono text-sm text-gray-700 mb-2 tracking-wide"
            >
              QUESTION TITLE *
            </label>
            <input
              type="text"
              id="edit-title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label
              htmlFor="edit-desc"
              className="block font-mono text-sm text-gray-700 mb-2 tracking-wide"
            >
              DESCRIPTION *
            </label>
            <textarea
              id="edit-desc"
              name="desc"
              value={formData.desc}
              onChange={handleInputChange}
              required
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm resize-vertical"
            />
          </div>

          {/* Level and Topic Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Level */}
            <div>
              <label
                htmlFor="edit-level"
                className="block font-mono text-sm text-gray-700 mb-2 tracking-wide"
              >
                DIFFICULTY LEVEL *
              </label>
              <select
                id="edit-level"
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
                htmlFor="edit-topic"
                className="block font-mono text-sm text-gray-700 mb-2 tracking-wide"
              >
                TOPIC *
              </label>
              <input
                type="text"
                id="edit-topic"
                name="topic"
                value={formData.topic}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Constraints */}
          <div className="mb-6">
            <label
              htmlFor="edit-constraints"
              className="block font-mono text-sm text-gray-700 mb-2 tracking-wide"
            >
              CONSTRAINTS
            </label>
            <textarea
              id="edit-constraints"
              name="constraints"
              value={formData.constraints}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm resize-vertical"
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
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-mono text-sm tracking-wide hover:bg-gray-50 transition-colors rounded-md"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-black text-white font-mono text-sm tracking-wide hover:bg-gray-800 transition-colors rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "UPDATING..." : "UPDATE QUESTION"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
