"use client";

import { useState } from "react";
import { X, Send, CheckCircle2 } from "lucide-react";
import axios from "axios";
import { proxy } from "@/app/proxy";

interface PublishSolutionModalProps {
  questionId: string;
  code: string;
  language: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PublishSolutionModal({
  questionId,
  code,
  language,
  onClose,
  onSuccess,
}: PublishSolutionModalProps) {
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [published, setPublished] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      setError("Please provide a description for your solution");
      return;
    }

    if (!code.trim()) {
      setError("No code to publish");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await axios.post(
        `${proxy}/api/v1/solutions/publish`,
        { questionId, code, description, language },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        },
      );

      if (response.data) {
        setPublished(true);
        onSuccess();
      }
    } catch (err) {
      console.error("Error publishing solution:", err);
      const errorMessage =
        err instanceof Error && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      setError(errorMessage || "Failed to publish solution. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {published ? (
          /* ── Success Screen ── */
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 animate-[scale_0.3s_ease-out]" />
              </div>
              {/* Ripple rings */}
              <span className="absolute inset-0 rounded-full border-2 border-emerald-400/40 animate-ping" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-black dark:text-white font-mono">
                Solution Published!
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-mono mt-2">
                Your solution is now live for the community.
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-2 px-8 py-2.5 bg-black dark:bg-white text-white dark:text-black font-mono text-xs tracking-wider hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
            >
              CLOSE
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10">
              <div>
                <h2 className="text-xl font-bold text-black dark:text-white">
                  Publish Your Solution
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono mt-1">
                  Share your accepted solution with the community
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/8 rounded-full transition-colors text-gray-600 dark:text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="p-6 space-y-6 overflow-y-auto flex-1"
            >
              {/* Language Badge */}
              <div>
                <label className="font-mono text-xs tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-2 block">
                  LANGUAGE
                </label>
                <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-white/8 text-gray-700 dark:text-gray-300 rounded text-sm font-mono">
                  {language.toUpperCase()}
                </span>
              </div>

              {/* Code Preview */}
              <div>
                <label className="font-mono text-xs tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-2 block">
                  CODE PREVIEW
                </label>
                <div className="bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-lg p-4 max-h-48 overflow-auto">
                  <pre className="text-xs font-mono text-gray-800 dark:text-gray-300 whitespace-pre-wrap">
                    {code.substring(0, 500)}
                    {code.length > 500 && "..."}
                  </pre>
                </div>
                <p className="text-xs text-gray-400 mt-1 font-mono">
                  {code.length} characters
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="font-mono text-xs tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-2 block">
                  DESCRIPTION *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain your approach, time/space complexity, and key insights..."
                  className="w-full px-4 py-3 bg-white dark:bg-black border border-gray-300 dark:border-white/15 rounded-lg text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-transparent text-sm resize-none font-mono"
                  rows={6}
                  required
                />
                <p className="text-xs text-gray-400 mt-1 font-mono">
                  Min 10 characters ({description.length}/10)
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm font-mono">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/8">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8 rounded-lg transition-colors font-mono text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || description.length < 10}
                  className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-mono text-sm flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? "Publishing..." : "Publish Solution"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
