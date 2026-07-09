"use client";

import api, { isAxiosError } from "@/lib/api";
import { getAdminRequestConfig } from "@/lib/admin-api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  AccessTierField,
  accessTierToIsFree,
} from "@/components/admin/content/access-tier-field";
import {
  actionButtonCls,
  inputCls,
  labelCls,
  panelSurface,
  textareaCls,
} from "@/components/admin/content/admin-form-styles";

type Example = { input: string; output: string };

export default function LinuxQuestionForm() {
  const router = useRouter();
  const [accessTier, setAccessTier] = useState<"free" | "paid">("free");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    difficulty: "easy",
    starterCode: "#!/usr/bin/env bash\n# Write your command here\n",
    expectedOutput: "",
    constraints: "",
    hints: "",
    language: "bash",
  });
  const [examples, setExamples] = useState<Example[]>([{ input: "", output: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      await api.post(
        "/api/v1/admin/content/linux-questions",
        {
          ...formData,
          constraints: formData.constraints
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
          hints: formData.hints
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
          examples: examples.filter((ex) => ex.input.trim() || ex.output.trim()),
          isFree: accessTierToIsFree(accessTier),
        },
        getAdminRequestConfig(),
      );
      setSuccess("Linux challenge created successfully.");
      setTimeout(() => router.push("/dashboard/admin/content/"), 1200);
    } catch (err) {
      setError(
        isAxiosError(err)
          ? err.response?.data?.message || "Failed to create Linux challenge."
          : "Failed to create Linux challenge.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`${panelSurface} p-6 space-y-5`}>
      {error && <p className="font-mono text-xs text-red-500">{error}</p>}
      {success && <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400">{success}</p>}

      <AccessTierField value={accessTier} onChange={setAccessTier} />

      <div>
        <label className={labelCls}>Title *</label>
        <input
          className={inputCls}
          value={formData.title}
          onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
          required
        />
      </div>

      <div>
        <label className={labelCls}>Description *</label>
        <textarea
          className={textareaCls}
          rows={5}
          value={formData.description}
          onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={labelCls}>Difficulty</label>
          <select
            className={inputCls}
            value={formData.difficulty}
            onChange={(e) => setFormData((p) => ({ ...p, difficulty: e.target.value }))}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Language</label>
          <input className={inputCls} value={formData.language} readOnly />
        </div>
      </div>

      <div>
        <label className={labelCls}>Starter code</label>
        <textarea
          className={textareaCls}
          rows={4}
          value={formData.starterCode}
          onChange={(e) => setFormData((p) => ({ ...p, starterCode: e.target.value }))}
        />
      </div>

      <div>
        <label className={labelCls}>Expected output *</label>
        <input
          className={inputCls}
          value={formData.expectedOutput}
          onChange={(e) => setFormData((p) => ({ ...p, expectedOutput: e.target.value }))}
          required
        />
      </div>

      <div>
        <label className={labelCls}>Constraints (one per line)</label>
        <textarea
          className={textareaCls}
          rows={3}
          value={formData.constraints}
          onChange={(e) => setFormData((p) => ({ ...p, constraints: e.target.value }))}
        />
      </div>

      <div>
        <label className={labelCls}>Hints (one per line)</label>
        <textarea
          className={textareaCls}
          rows={3}
          value={formData.hints}
          onChange={(e) => setFormData((p) => ({ ...p, hints: e.target.value }))}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className={labelCls}>Examples *</label>
          <button
            type="button"
            onClick={() => setExamples([...examples, { input: "", output: "" }])}
            className={`${actionButtonCls} border-black/20 text-gray-600 dark:text-gray-400`}
          >
            <Plus className="mr-1 h-3 w-3" /> Add example
          </button>
        </div>
        <div className="space-y-3">
          {examples.map((example, index) => (
            <div key={index} className="grid gap-3 border border-black/10 p-3 dark:border-white/10 md:grid-cols-2">
              <div>
                <label className={labelCls}>Input</label>
                <input
                  className={inputCls}
                  value={example.input}
                  onChange={(e) => {
                    const next = [...examples];
                    next[index] = { ...next[index], input: e.target.value };
                    setExamples(next);
                  }}
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className={labelCls}>Output</label>
                  <input
                    className={inputCls}
                    value={example.output}
                    onChange={(e) => {
                      const next = [...examples];
                      next[index] = { ...next[index], output: e.target.value };
                      setExamples(next);
                    }}
                  />
                </div>
                {examples.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setExamples(examples.filter((_, i) => i !== index))}
                    className="mt-6 text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => router.push("/dashboard/admin/content/")}
          className={`${actionButtonCls} border-black/20 text-gray-500`}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className={`${actionButtonCls} border-black bg-black text-white dark:border-white dark:bg-white dark:text-black`}
        >
          {submitting ? "Creating…" : "Create challenge"}
        </button>
      </div>
    </form>
  );
}
