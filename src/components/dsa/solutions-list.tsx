"use client";

import { useEffect, useState } from "react";
import { ThumbsUp, Calendar, Code2 } from "lucide-react";
import axios from "axios";
import { proxy } from "@/app/proxy";

interface Solution {
  _id: string;
  code: string;
  description: string;
  language: string;
  upvotes: number;
  user: {
    _id: string;
    username: string;
    email: string;
  };
  createdAt: string;
}

interface SolutionsListProps {
  questionId: string;
}

export default function SolutionsList({ questionId }: SolutionsListProps) {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSolution, setExpandedSolution] = useState<string | null>(null);

  useEffect(() => {
    loadSolutions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId]);

  const loadSolutions = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${proxy}/api/v1/solutions/question/${questionId}`
      );
      setSolutions(response.data.data || []);
    } catch (error) {
      console.error("Error loading solutions:", error);
      setSolutions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async (solutionId: string) => {
    try {
      await axios.patch(
        `${proxy}/api/v1/solutions/upvote/${solutionId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      // Reload solutions to get updated upvote count
      loadSolutions();
    } catch (error) {
      console.error("Error upvoting solution:", error);
      alert("Please login to upvote solutions");
    }
  };

  const toggleExpand = (solutionId: string) => {
    setExpandedSolution(expandedSolution === solutionId ? null : solutionId);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const getLanguageColor = (language: string) => {
    const colors: Record<string, string> = {
      python: "bg-blue-50 text-blue-700 border-blue-200",
      java: "bg-orange-50 text-orange-700 border-orange-200",
      cpp: "bg-purple-50 text-purple-700 border-purple-200",
      c: "bg-gray-50 text-gray-700 border-gray-200",
      javascript: "bg-yellow-50 text-yellow-700 border-yellow-200",
    };
    return colors[language.toLowerCase()] || "bg-gray-50 text-gray-700 border-gray-200";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <p className="font-mono text-sm text-gray-500">Loading solutions...</p>
        </div>
      </div>
    );
  }

  if (solutions.length === 0) {
    return (
      <div className="text-center py-12">
        <Code2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-700 mb-2">No solutions yet</h3>
        <p className="text-sm text-gray-500 font-mono">
          Be the first to share your solution!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-mono text-xs tracking-[0.2em] text-gray-500">
          {solutions.length} {solutions.length === 1 ? "SOLUTION" : "SOLUTIONS"}
        </h3>
        <select className="px-3 py-1 border border-gray-300 rounded text-xs font-mono focus:outline-none focus:ring-2 focus:ring-black">
          <option>Most Upvoted</option>
          <option>Most Recent</option>
        </select>
      </div>

      {/* Solutions Cards */}
      {solutions.map((solution) => (
        <div
          key={solution._id}
          className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
        >
          {/* Card Header */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                {/* User Avatar */}
                <div className="w-10 h-10 bg-linear-to-br from-black to-gray-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {solution.user.username?.[0]?.toUpperCase() || "U"}
                </div>

                {/* User Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-black text-sm">
                      {solution.user.username || "Anonymous"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-mono border ${getLanguageColor(
                        solution.language
                      )}`}
                    >
                      {solution.language.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 font-mono">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(solution.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Upvote Button */}
              <button
                onClick={() => handleUpvote(solution._id)}
                className="flex flex-col items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <ThumbsUp className="w-4 h-4 text-gray-600 group-hover:text-black transition-colors" />
                <span className="text-xs font-mono text-gray-700 font-bold">
                  {solution.upvotes}
                </span>
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="p-4">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {solution.description}
            </p>
          </div>

          {/* Code Section */}
          <div className="border-t border-gray-100">
            <button
              onClick={() => toggleExpand(solution._id)}
              className="w-full px-4 py-3 text-left font-mono text-xs text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Code2 className="w-4 h-4" />
                {expandedSolution === solution._id ? "Hide" : "View"} Code
              </span>
              <span className="text-gray-400">
                {expandedSolution === solution._id ? "▲" : "▼"}
              </span>
            </button>

            {expandedSolution === solution._id && (
              <div className="bg-gray-50 border-t border-gray-200">
                <div className="p-4">
                  <pre className="text-xs font-mono text-gray-800 overflow-x-auto dark-scrollbar bg-white border border-gray-200 rounded-lg p-4">
                    {solution.code}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
