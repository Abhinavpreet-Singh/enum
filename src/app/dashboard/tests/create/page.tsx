"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { proxy } from "@/app/proxy";
import { DashboardPageShell, DashboardPageHeader } from "@/components/dashboard/dashboard-page-shell";
import { TestLinkCopy } from "@/components/dashboard/organization/test-link-copy";
import { ChevronLeft, CheckCircle } from "lucide-react";

const panelBorder = "border border-black/20 dark:border-white/25";
const panelSurface = `${panelBorder} bg-white/80 backdrop-blur-[2px] dark:bg-black/75`;
const inputCls =
  "w-full border border-gray-300 dark:border-neutral-700 bg-white dark:bg-black px-3 py-2 font-mono text-xs text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors";
const labelCls =
  "block font-mono text-[10px] tracking-[0.2em] text-gray-500 dark:text-gray-400 uppercase mb-1.5";

interface CreatedAssessment {
  id: string;
  title: string;
  testCode: string;
  status: string;
  duration: number;
}

export default function CreateTestPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [passingScore, setPassingScore] = useState(60);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedAssessment | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Test title is required.");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const res = await axios.post(`${proxy}/api/v1/assessments`, {
        title: title.trim(),
        description: description.trim(),
        duration,
        passingScore,
        maxAttempts,
      });
      setCreated(res.data.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to create test. Please try again.";
      setError(msg);
    } finally {
      setCreating(false);
    }
  }

  if (created) {
    return (
      <DashboardPageShell maxWidth="6xl">
        <div className={`${panelSurface} p-8 text-center max-w-lg mx-auto`}>
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="font-mono text-lg font-bold text-black dark:text-white mb-1">Test Created</h2>
          <p className="font-mono text-xs text-gray-400 mb-6">
            Share this link or code with candidates so they can join via the ENUM desktop app.
          </p>
          <p className="text-sm font-semibold text-black dark:text-white mb-4">{created.title}</p>
          <TestLinkCopy testCode={created.testCode} />
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <Link
              href="/dashboard/tests"
              className="px-4 py-2 font-mono text-xs tracking-wider bg-black dark:bg-white text-white dark:text-black hover:opacity-90 transition-opacity"
            >
              View All Tests
            </Link>
            <button
              type="button"
              onClick={() => {
                setCreated(null);
                setTitle("");
                setDescription("");
                setDuration(60);
                setPassingScore(60);
                setMaxAttempts(1);
              }}
              className={`px-4 py-2 font-mono text-xs tracking-wider ${panelBorder} text-gray-600 dark:text-gray-300 hover:border-black dark:hover:border-white transition-colors`}
            >
              Create Another
            </button>
          </div>
        </div>
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell maxWidth="6xl">
      <DashboardPageHeader
        breadcrumb={
          <Link href="/dashboard/tests" className="inline-flex items-center gap-1 hover:text-black dark:hover:text-white transition-colors">
            <ChevronLeft className="w-3 h-3" /> Tests
          </Link>
        }
        title="Create Test"
        description="Set up a new assessment. A unique test link will be generated automatically."
      />

      <form onSubmit={handleSubmit} className={`${panelSurface} p-6 max-w-2xl space-y-5`}>
        <div>
          <label className={labelCls}>Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputCls}
            placeholder="e.g. Backend Engineering Assessment"
            autoFocus
          />
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${inputCls} min-h-[80px] resize-y`}
            placeholder="Optional instructions or context for candidates…"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Duration (min)</label>
            <input
              type="number"
              min={5}
              max={480}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Passing Score (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={passingScore}
              onChange={(e) => setPassingScore(Number(e.target.value))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Max Attempts</label>
            <input
              type="number"
              min={1}
              max={10}
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Number(e.target.value))}
              className={inputCls}
            />
          </div>
        </div>

        {error && (
          <p className="font-mono text-xs text-red-500">{error}</p>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={creating || !title.trim()}
            className="px-5 py-2.5 font-mono text-xs tracking-wider bg-black dark:bg-white text-white dark:text-black hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {creating ? "Creating…" : "Create Test"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard/tests")}
            className={`px-5 py-2.5 font-mono text-xs tracking-wider ${panelBorder} text-gray-500 hover:border-black dark:hover:border-white transition-colors`}
          >
            Cancel
          </button>
        </div>
      </form>
    </DashboardPageShell>
  );
}
