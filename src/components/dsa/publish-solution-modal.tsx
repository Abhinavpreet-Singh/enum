"use client";

import { useState } from "react";
import { X, Send } from "lucide-react";
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
        {
          questionId,
          code,
          description,
          language,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      if (response.data) {
        alert("Solution published successfully!");
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error("Error publishing solution:", err);
      const errorMessage =
        err instanceof Error && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(errorMessage || "Failed to publish solution. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-black">Publish Your Solution</h2>
            <p className="text-sm text-gray-600 font-mono mt-1">
              Share your solution with the community
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Language Badge */}
          <div>
            <label className="font-mono text-xs tracking-[0.2em] text-gray-500 mb-2 block">
              LANGUAGE
            </label>
            <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm font-mono">
              {language.toUpperCase()}
            </span>
          </div>

          {/* Code Preview */}
          <div>
            <label className="font-mono text-xs tracking-[0.2em] text-gray-500 mb-2 block">
              CODE PREVIEW
            </label>
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 max-h-48 overflow-auto dark-scrollbar">
              <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap">
                {code.substring(0, 500)}
                {code.length > 500 && "..."}
              </pre>
            </div>
            <p className="text-xs text-gray-500 mt-1 font-mono">
              {code.length} characters
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="font-mono text-xs tracking-[0.2em] text-gray-500 mb-2 block">
              DESCRIPTION *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain your approach, time/space complexity, and key insights..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm resize-none"
              rows={6}
              required
            />
            <p className="text-xs text-gray-500 mt-1 font-mono">
              Min 10 characters ({description.length}/10)
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-mono text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || description.length < 10}
              className="px-5 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-mono text-sm flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? "Publishing..." : "Publish Solution"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
