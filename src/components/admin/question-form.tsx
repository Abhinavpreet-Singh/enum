"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { proxy } from "@/app/proxy";
import axios from "axios";

interface Testcase {
  input: string[]; // Array of input values (one per parameter line)
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

export default function QuestionForm() {
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
    // Add an empty input slot to each testcase
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
      // Remove corresponding input slot from each testcase
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
    setSubmitStatus({ type: null, message: "" });

    if (!formData.functionName.trim()) {
      setSubmitStatus({ type: "error", message: "Function name is required" });
      return;
    }

    try {
      const response = await axios.post(
        `${proxy}/api/v1/admin/adminPostQuestion`,
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

      console.log("Response:", response.data);
      console.log("Status:", response.status);

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
          functionName: "",
          returnType: "int",
        });
        setParameters([{ name: "", type: "int" }]);
        setTestcases([{ input: [""], expectedOutput: "" }]);
      }
    } catch (error) {
      console.error("Error posting question:", error);
      setSubmitStatus({
        type: "error",
        message:
          error instanceof Error
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

        {/* ═══ Function Signature Section ═══ */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-mono text-sm text-blue-900 font-bold mb-4 tracking-wide">
            FUNCTION SIGNATURE (LeetCode-style)
          </h3>

          {/* Function Name & Return Type */}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm bg-white"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm bg-white"
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
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white font-mono text-xs hover:bg-blue-700 transition-colors rounded-md"
              >
                <Plus className="w-3 h-3" />
                ADD PARAM
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
                    placeholder={`param${index} (name)`}
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

          {/* Preview of function signature */}
          {formData.functionName && (
            <div className="mt-4 p-3 bg-gray-800 rounded-md">
              <p className="font-mono text-xs text-gray-400 mb-1">
                Preview (Python):
              </p>
              <code className="font-mono text-sm text-green-400">
                def {formData.functionName}(
                {parameters
                  .map((p, i) => `${p.name || `param${i}`}: ${p.type}`)
                  .join(", ")}
                ) -&gt; {formData.returnType}
              </code>
            </div>
          )}
        </div>

        {/* ═══ Test Cases Section ═══ */}
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
                      className="text-red-600 hover:text-red-700 transition-colors"
                      title="Remove testcase"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {/* One input field per parameter */}
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm bg-white"
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

                  {/* Expected output */}
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm bg-white"
                      placeholder="e.g., 9"
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
