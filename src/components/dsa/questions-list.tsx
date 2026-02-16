"use client";

import Link from "next/link";
import { questions } from "@/data/dsa-questions";
import { CheckCircle2, Clock } from "lucide-react";

const difficultyColors = {
  Easy: "text-green-600 bg-green-50",
  Medium: "text-yellow-600 bg-yellow-50",
  Hard: "text-red-600 bg-red-50",
};

export default function QuestionsList() {
  return (
    <div className="space-y-4">
      {questions.map((question) => (
        <Link
          key={question.id}
          href={`/dashboard/dsa-arena/${question.id}`}
          className="block border border-gray-300 rounded-lg p-4 hover:border-black hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-4 h-4 text-gray-400" />
                <h3 className="text-lg font-bold text-black">
                  {question.title}
                </h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2 py-1 rounded text-xs font-mono tracking-wide ${
                    difficultyColors[question.difficulty]
                  }`}
                >
                  {question.difficulty}
                </span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono tracking-wide">
                  {question.category}
                </span>
                <div className="ml-auto flex items-center gap-1 text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span className="font-mono text-xs">15 mins</span>
                </div>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
