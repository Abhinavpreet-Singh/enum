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

type RootCause = { title: string; description: string; isCorrect: boolean };
type ActionOption = { title: string; description: string; category: string };

export default function IncidentForm() {
  const router = useRouter();
  const [accessTier, setAccessTier] = useState<"free" | "paid">("paid");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    difficulty: "medium",
    category: "incident",
    estimatedTime: 15,
    xpReward: 100,
    tags: "",
    initialLogs: "",
  });
  const [rootCauses, setRootCauses] = useState<RootCause[]>([
    { title: "", description: "", isCorrect: true },
  ]);
  const [actions, setActions] = useState<ActionOption[]>([
    { title: "", description: "", category: "mitigation" },
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
        "/api/v1/admin/content/incidents",
        {
          title: formData.title,
          description: formData.description,
          difficulty: formData.difficulty,
          category: formData.category,
          estimatedTime: Number(formData.estimatedTime),
          xpReward: Number(formData.xpReward),
          tags: formData.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          initialLogs: formData.initialLogs
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
          rootCauseOptions: rootCauses.filter((item) => item.title.trim()),
          actionOptions: actions.filter((item) => item.title.trim()),
          isFree: accessTierToIsFree(accessTier),
        },
        getAdminRequestConfig(),
      );
      setSuccess("Incident scenario created successfully.");
      setTimeout(() => router.push("/dashboard/admin/content/"), 1200);
    } catch (err) {
      setError(
        isAxiosError(err)
          ? err.response?.data?.message || "Failed to create incident scenario."
          : "Failed to create incident scenario.",
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
          <label className={labelCls}>Estimated time (min)</label>
          <input
            type="number"
            className={inputCls}
            value={formData.estimatedTime}
            onChange={(e) => setFormData((p) => ({ ...p, estimatedTime: Number(e.target.value) }))}
            min={1}
          />
        </div>
        <div>
          <label className={labelCls}>XP reward</label>
          <input
            type="number"
            className={inputCls}
            value={formData.xpReward}
            onChange={(e) => setFormData((p) => ({ ...p, xpReward: Number(e.target.value) }))}
            min={0}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Initial logs (one per line)</label>
        <textarea
          className={textareaCls}
          rows={4}
          value={formData.initialLogs}
          onChange={(e) => setFormData((p) => ({ ...p, initialLogs: e.target.value }))}
        />
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
          <label className={labelCls}>Root cause options *</label>
          <button
            type="button"
            onClick={() =>
              setRootCauses([...rootCauses, { title: "", description: "", isCorrect: false }])
            }
            className={`${actionButtonCls} border-black/20 text-gray-600 dark:text-gray-400`}
          >
            <Plus className="mr-1 h-3 w-3" /> Add option
          </button>
        </div>
        <div className="space-y-3">
          {rootCauses.map((item, index) => (
            <div key={index} className="space-y-2 border border-black/10 p-3 dark:border-white/10">
              <input
                className={inputCls}
                placeholder="Title"
                value={item.title}
                onChange={(e) => {
                  const next = [...rootCauses];
                  next[index] = { ...next[index], title: e.target.value };
                  setRootCauses(next);
                }}
              />
              <textarea
                className={textareaCls}
                rows={2}
                placeholder="Description"
                value={item.description}
                onChange={(e) => {
                  const next = [...rootCauses];
                  next[index] = { ...next[index], description: e.target.value };
                  setRootCauses(next);
                }}
              />
              <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-gray-500">
                <input
                  type="checkbox"
                  checked={item.isCorrect}
                  onChange={(e) => {
                    const next = [...rootCauses];
                    next[index] = { ...next[index], isCorrect: e.target.checked };
                    setRootCauses(next);
                  }}
                />
                Correct root cause
              </label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className={labelCls}>Action options *</label>
          <button
            type="button"
            onClick={() =>
              setActions([...actions, { title: "", description: "", category: "mitigation" }])
            }
            className={`${actionButtonCls} border-black/20 text-gray-600 dark:text-gray-400`}
          >
            <Plus className="mr-1 h-3 w-3" /> Add action
          </button>
        </div>
        <div className="space-y-3">
          {actions.map((item, index) => (
            <div key={index} className="space-y-2 border border-black/10 p-3 dark:border-white/10">
              <input
                className={inputCls}
                placeholder="Title"
                value={item.title}
                onChange={(e) => {
                  const next = [...actions];
                  next[index] = { ...next[index], title: e.target.value };
                  setActions(next);
                }}
              />
              <textarea
                className={textareaCls}
                rows={2}
                placeholder="Description"
                value={item.description}
                onChange={(e) => {
                  const next = [...actions];
                  next[index] = { ...next[index], description: e.target.value };
                  setActions(next);
                }}
              />
              <input
                className={inputCls}
                placeholder="Category"
                value={item.category}
                onChange={(e) => {
                  const next = [...actions];
                  next[index] = { ...next[index], category: e.target.value };
                  setActions(next);
                }}
              />
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
          {submitting ? "Creating…" : "Create scenario"}
        </button>
      </div>
    </form>
  );
}
