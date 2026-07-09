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

export default function SystemDesignForm() {
  const router = useRouter();
  const [accessTier, setAccessTier] = useState<"free" | "paid">("paid");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    difficulty: "medium",
    maxScore: 10,
    templateUrl: "",
    tags: "",
  });
  const [rules, setRules] = useState([
    { description: "", requiredComponent: "", requiredEdge: "", points: 1 },
  ]);
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
        "/api/v1/admin/content/system-design",
        {
          title: formData.title,
          description: formData.description,
          difficulty: formData.difficulty,
          maxScore: Number(formData.maxScore),
          templateUrl: formData.templateUrl,
          tags: formData.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          evaluationRules: rules.filter((rule) => rule.description.trim()),
          isFree: accessTierToIsFree(accessTier),
        },
        getAdminRequestConfig(),
      );
      setSuccess("System design simulation created successfully.");
      setTimeout(() => router.push("/dashboard/admin/content/"), 1200);
    } catch (err) {
      setError(
        isAxiosError(err)
          ? err.response?.data?.message || "Failed to create system design simulation."
          : "Failed to create system design simulation.",
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

      <div className="grid gap-4 md:grid-cols-3">
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
          <label className={labelCls}>Max score</label>
          <input
            type="number"
            className={inputCls}
            value={formData.maxScore}
            onChange={(e) => setFormData((p) => ({ ...p, maxScore: Number(e.target.value) }))}
            min={1}
          />
        </div>
        <div>
          <label className={labelCls}>Template URL</label>
          <input
            className={inputCls}
            value={formData.templateUrl}
            onChange={(e) => setFormData((p) => ({ ...p, templateUrl: e.target.value }))}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Tags (comma-separated)</label>
        <input
          className={inputCls}
          value={formData.tags}
          onChange={(e) => setFormData((p) => ({ ...p, tags: e.target.value }))}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className={labelCls}>Evaluation rules</label>
          <button
            type="button"
            onClick={() =>
              setRules([
                ...rules,
                { description: "", requiredComponent: "", requiredEdge: "", points: 1 },
              ])
            }
            className={`${actionButtonCls} border-black/20 text-gray-600 dark:text-gray-400`}
          >
            <Plus className="mr-1 h-3 w-3" /> Add rule
          </button>
        </div>
        <div className="space-y-3">
          {rules.map((rule, index) => (
            <div key={index} className="space-y-3 border border-black/10 p-3 dark:border-white/10">
              <input
                className={inputCls}
                placeholder="Rule description"
                value={rule.description}
                onChange={(e) => {
                  const next = [...rules];
                  next[index] = { ...next[index], description: e.target.value };
                  setRules(next);
                }}
              />
              <div className="grid gap-3 md:grid-cols-3">
                <input
                  className={inputCls}
                  placeholder="Required component"
                  value={rule.requiredComponent}
                  onChange={(e) => {
                    const next = [...rules];
                    next[index] = { ...next[index], requiredComponent: e.target.value };
                    setRules(next);
                  }}
                />
                <input
                  className={inputCls}
                  placeholder="Required edge"
                  value={rule.requiredEdge}
                  onChange={(e) => {
                    const next = [...rules];
                    next[index] = { ...next[index], requiredEdge: e.target.value };
                    setRules(next);
                  }}
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    className={inputCls}
                    value={rule.points}
                    min={1}
                    onChange={(e) => {
                      const next = [...rules];
                      next[index] = { ...next[index], points: Number(e.target.value) };
                      setRules(next);
                    }}
                  />
                  {rules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setRules(rules.filter((_, i) => i !== index))}
                      className="text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
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
          {submitting ? "Creating…" : "Create simulation"}
        </button>
      </div>
    </form>
  );
}
