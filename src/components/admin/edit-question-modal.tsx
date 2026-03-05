"use client";

import { useState, useEffect } from "react";
import { Question } from "@/data/dsa-questions";
import { X, Plus, Trash2 } from "lucide-react";
import axios from "axios";
import { proxy } from "@/app/proxy";

interface Testcase {
  input: string[];
  expectedOutput: string;
}

interface Parameter {
  name: string;
  type: string;
}

const SUPPORTED_TYPES = [
  "int",
  "float",
  "string",
  "bool",
  "int[]",
  "string[]",
  "float[]",
];

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
    functionName: "",
    returnType: "int",
  });

  const [parameters, setParameters] = useState<Parameter[]>([
    { name: "", type: "int" },
  ]);

  const [testcases, setTestcases] = useState<Testcase[]>([
    { input: [""], expectedOutput: "" },
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
        functionName: question.functionName || "",
        returnType: question.returnType || "int",
      });

      // Build parameters from question data
      const paramTypes = question.parameterTypes || [];
      const paramNames = question.parameterNames || [];
      if (paramTypes.length > 0) {
        setParameters(
          paramTypes.map((type, i) => ({
            name: paramNames[i] || `param${i}`,
            type,
          })),
        );
      }

      // Parse testcases - handle both old and new format
      const parsedTestcases = question.examples.map((ex) => {
        let input: string[];
        const exRaw = ex as Record<string, unknown>;
        if (Array.isArray(exRaw.input)) {
          input = exRaw.input as string[];
        } else if (typeof ex.input === "string") {
          input = ex.input.split("\n").filter((s: string) => s.trim() !== "");
        } else {
          input = [String(ex.input)];
        }
        const expectedOutput =
          (exRaw.expectedOutput as string) || ex.output || "";

        // For array-type params, strip the count prefix so admin sees just values
        const pTypes = question.parameterTypes || [];
        const displayInput = input.map((val, i) => {
          const type = pTypes[i] || "";
          if (type.endsWith("[]") && val.includes("\n")) {
            // The stored format is "count\nval1 val2 ..." — show only the values part
            return val.split("\n").slice(1).join(" ");
          }
          return val;
        });

        return { input: displayInput, expectedOutput };
      });

      setTestcases(
        parsedTestcases.length > 0
          ? parsedTestcases
          : [{ input: [""], expectedOutput: "" }],
      );
    }
  }, [question]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ── Parameter handlers ──
  const addParameter = () => {
    setParameters([...parameters, { name: "", type: "int" }]);
    setTestcases(
      testcases.map((tc) => ({
        ...tc,
        input: [...tc.input, ""],
      })),
    );
  };

  const removeParameter = (index: number) => {
    if (parameters.length > 1) {
      setParameters(parameters.filter((_, i) => i !== index));
      setTestcases(
        testcases.map((tc) => ({
          ...tc,
          input: tc.input.filter((_, i) => i !== index),
        })),
      );
    }
  };

  const handleParameterChange = (
    index: number,
    field: keyof Parameter,
    value: string,
  ) => {
    const updated = [...parameters];
    updated[index] = { ...updated[index], [field]: value };
    setParameters(updated);
  };

  // ── Testcase handlers ──
  const handleTestcaseInputChange = (
    tcIndex: number,
    paramIndex: number,
    value: string,
  ) => {
    const updated = [...testcases];
    updated[tcIndex] = {
      ...updated[tcIndex],
      input: updated[tcIndex].input.map((v, i) =>
        i === paramIndex ? value : v,
      ),
    };
    setTestcases(updated);
  };

  const handleTestcaseOutputChange = (index: number, value: string) => {
    const updated = [...testcases];
    updated[index] = { ...updated[index], expectedOutput: value };
    setTestcases(updated);
  };

  const addTestcase = () => {
    setTestcases([
      ...testcases,
      { input: parameters.map(() => ""), expectedOutput: "" },
    ]);
  };

  const removeTestcase = (index: number) => {
    if (testcases.length > 1) {
      setTestcases(testcases.filter((_, i) => i !== index));
    }
  };

  // Format a single testcase's input array for the backend.
  // For array-type params the admin enters space-separated values only;
  // this helper prepends the element count and a real newline.
  const formatTestcases = (tcs: Testcase[]) =>
    tcs.map((tc) => ({
      input: tc.input.map((val, i) => {
        const type = parameters[i]?.type || "";
        if (type.endsWith("[]")) {
          const trimmed = val.trim();
          if (!trimmed) return "0\n"; // empty array
          const elements = trimmed.split(/\s+/);
          return `${elements.length}\n${trimmed}`;
        }
        return val;
      }),
      expectedOutput: tc.expectedOutput,
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.put(
        `${proxy}/api/v1/admin/editQuestion/${question?.id}`,
        {
          title: formData.title,
          desc: formData.desc,
          level: formData.level,
          constraints: formData.constraints,
          topic: formData.topic,
          functionName: formData.functionName,
          parameterNames: parameters.map(
            (p) => p.name || `param${parameters.indexOf(p)}`,
          ),
          parameterTypes: parameters.map((p) => p.type),
          returnType: formData.returnType,
          testcases: formatTestcases(testcases),
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        },
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
        <form
          onSubmit={handleSubmit}
          className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto"
        >
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

          {/* ═══ Function Signature Section ═══ */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-mono text-sm text-blue-900 font-bold mb-4 tracking-wide">
              FUNCTION SIGNATURE
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-gray-700 mb-1 font-mono">
                  FUNCTION NAME *
                </label>
                <input
                  type="text"
                  name="functionName"
                  value={formData.functionName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white"
                  placeholder="e.g., twoSum"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-700 mb-1 font-mono">
                  RETURN TYPE *
                </label>
                <select
                  name="returnType"
                  value={formData.returnType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white"
                >
                  {[...SUPPORTED_TYPES, "void"].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Parameters */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs text-gray-700 font-mono">
                  PARAMETERS
                </label>
                <button
                  type="button"
                  onClick={addParameter}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white font-mono text-xs hover:bg-blue-700 rounded-md"
                >
                  <Plus className="w-3 h-3" /> ADD PARAM
                </button>
              </div>
              <div className="space-y-2">
                {parameters.map((param, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      value={param.type}
                      onChange={(e) =>
                        handleParameterChange(index, "type", e.target.value)
                      }
                      className="px-2 py-2 border border-gray-300 rounded-md text-sm bg-white min-w-30"
                    >
                      {SUPPORTED_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={param.name}
                      onChange={(e) =>
                        handleParameterChange(index, "name", e.target.value)
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                      placeholder={`param${index}`}
                    />
                    {parameters.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeParameter(index)}
                        className="p-1 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ═══ Test Cases ═══ */}
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
                <Plus className="w-4 h-4" /> ADD TESTCASE
              </button>
            </div>

            <div className="space-y-4">
              {testcases.map((testcase, tcIndex) => (
                <div
                  key={tcIndex}
                  className="p-4 border border-gray-200 rounded-md bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs text-gray-600">
                      TESTCASE #{tcIndex + 1}
                    </span>
                    {testcases.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTestcase(tcIndex)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {parameters.map((param, paramIndex) => (
                      <div key={paramIndex}>
                        <label className="block text-xs text-gray-500 mb-1">
                          {param.name || `param${paramIndex}`} ({param.type})
                        </label>
                        <input
                          type="text"
                          value={testcase.input[paramIndex] || ""}
                          onChange={(e) =>
                            handleTestcaseInputChange(
                              tcIndex,
                              paramIndex,
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                          placeholder={
                            param.type.endsWith("[]")
                              ? "Space-separated values, e.g.: 2 7 11 15"
                              : `e.g., ${param.type === "string" ? "hello" : param.type === "bool" ? "true" : "42"}`
                          }
                        />
                        {param.type.endsWith("[]") && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            Enter values only — count is auto-calculated. Leave
                            blank for empty array.
                          </p>
                        )}
                      </div>
                    ))}
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <label className="block text-xs text-gray-500 mb-1">
                        Expected Output
                      </label>
                      <input
                        type="text"
                        value={testcase.expectedOutput}
                        onChange={(e) =>
                          handleTestcaseOutputChange(tcIndex, e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
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
