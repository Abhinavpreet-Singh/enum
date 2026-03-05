"use client";

import { useEffect, useState } from "react";
import { CircleCheck, Clock, Code2 } from "lucide-react";

interface Submission {
  _id: string;
  code: string;
  language: string;
  verdict:
    | "accepted"
    | "wrong_answer"
    | "runtime_error"
    | "compile_error"
    | "error"
    | "partial";
  passedCount: number;
  totalCount: number;
  runtime: number | null;
  createdAt: string;
}

interface SubmissionsListProps {
  questionId: string;
  refreshKey?: number;
}

const languageColors: Record<string, string> = {
  python: "bg-blue-50 text-blue-700 border-blue-200",
  java: "bg-orange-50 text-orange-700 border-orange-200",
  cpp: "bg-purple-50 text-purple-700 border-purple-200",
  c: "bg-gray-50 text-gray-700 border-gray-200",
};

const verdictLabel: Record<string, string> = {
  accepted: "Accepted",
  wrong_answer: "Wrong Answer",
  runtime_error: "Runtime Error",
  compile_error: "Compile Error",
  error: "Runtime Error",
  partial: "Partial",
};

const verdictColor: Record<string, string> = {
  accepted: "text-green-600",
  wrong_answer: "text-red-600",
  runtime_error: "text-red-600",
  compile_error: "text-red-600",
  error: "text-red-600",
  partial: "text-yellow-600",
};

export default function SubmissionsList({
  questionId,
  refreshKey = 0,
}: SubmissionsListProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId, refreshKey]);

  const loadSubmissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setError("Please log in to view your submissions.");
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/submissions/my/${questionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError("Please log in to view your submissions.");
        } else {
          setError("Failed to load submissions.");
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      setSubmissions(data.data || []);
    } catch {
      setError("Failed to load submissions.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
    );
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="font-mono text-xs text-gray-400">
          Loading submissions...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="font-mono text-xs text-gray-500">{error}</p>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-12">
        <CircleCheck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="font-mono text-xs text-gray-500">No submissions yet.</p>
        <p className="font-mono text-xs text-gray-400 mt-1">
          Submit your code to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {submissions.map((sub) => (
        <div
          key={sub._id}
          className="border border-gray-200 rounded-lg overflow-hidden"
        >
          {/* Row */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
            <CircleCheck className="w-4 h-4 text-green-600 shrink-0" />

            <span
              className={`font-mono text-xs font-semibold ${verdictColor[sub.verdict]}`}
            >
              {verdictLabel[sub.verdict]}
            </span>

            <span className="font-mono text-xs text-gray-500">
              {sub.passedCount}/{sub.totalCount} cases
            </span>

            {sub.runtime !== null && (
              <span className="flex items-center gap-1 font-mono text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                {sub.runtime}ms
              </span>
            )}

            <span
              className={`ml-1 px-2 py-0.5 rounded border text-xs font-mono ${
                languageColors[sub.language] ||
                "bg-gray-50 text-gray-700 border-gray-200"
              }`}
            >
              {sub.language.toUpperCase()}
            </span>

            <span className="ml-auto font-mono text-xs text-gray-400">
              {formatDate(sub.createdAt)}
            </span>

            <button
              onClick={() =>
                setExpandedId(expandedId === sub._id ? null : sub._id)
              }
              className="flex items-center gap-1 font-mono text-xs text-gray-500 hover:text-black transition-colors"
            >
              <Code2 className="w-3.5 h-3.5" />
              {expandedId === sub._id ? "Hide" : "View"}
            </button>
          </div>

          {/* Code expand */}
          {expandedId === sub._id && (
            <div className="border-t border-gray-200">
              <pre className="p-4 text-xs font-mono text-gray-800 bg-white overflow-x-auto whitespace-pre-wrap">
                {sub.code}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
