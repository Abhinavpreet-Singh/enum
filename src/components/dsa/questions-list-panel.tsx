"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { Question, fetchQuestions } from "@/data/dsa-questions";

interface QuestionsListPanelProps {
  currentId: string;
}

export default function QuestionsListPanel({
  currentId,
}: QuestionsListPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    const loadQuestions = async () => {
      const fetchedQuestions = await fetchQuestions();
      setQuestions(fetchedQuestions);
    };
    loadQuestions();
  }, []);

  return (
    <div className="bg-white border-b border-gray-300">
      {/* Toggle Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-4 py-3 border-b border-gray-200 hover:bg-gray-50 transition-colors"
      >
        <ChevronDown
          className={`w-4 h-4 text-gray-600 transition-transform ${
            !isOpen ? "-rotate-90" : ""
          }`}
        />
        <span className="font-mono text-xs tracking-wider text-black font-bold">
          PROBLEMS ({questions.length})
        </span>
      </button>

      {/* Questions List */}
      {isOpen && (
        <div className="max-h-64 overflow-y-auto">
          {questions.map((q, idx) => (
            <Link
              key={q.id}
              href={`/dashboard/dsa-arena/${q.id}`}
              className={`flex items-center gap-2 px-4 py-2 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                currentId === q.id
                  ? "bg-gray-100 border-l-4 border-l-black"
                  : ""
              }`}
            >
              <span className="font-mono text-xs text-gray-500 w-6">
                {idx + 1}
              </span>
              <span className="font-mono text-xs text-gray-700 truncate">
                {q.title}
              </span>
              <span
                className={`ml-auto text-xs font-mono px-2 py-1 rounded ${
                  q.difficulty === "Easy"
                    ? "text-green-600 bg-green-50"
                    : "text-yellow-600 bg-yellow-50"
                }`}
              >
                {q.difficulty}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
