"use client";

import Sidebar from "@/components/dashboard/sidebar";
import ProblemTabs from "@/components/dsa/problem-tabs";
import CodeEditor from "@/components/dsa/code-editor";
import { Question, fetchQuestions } from "@/data/dsa-questions";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function WorkspacePage() {
  const params = useParams();
  const id = params.id as string;
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadQuestion = async () => {
      setLoading(true);
      const allQuestions = await fetchQuestions();
      const foundQuestion = allQuestions.find((q) => q.id === id);
      setQuestion(foundQuestion || null);
      setLoading(false);
    };
    loadQuestion();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="font-mono text-sm text-gray-500">Loading question...</div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="font-mono text-sm text-gray-500 mb-4">Question not found</div>
          <Link href="/dashboard/dsa-arena" className="text-black underline font-mono text-sm">
            Go back to questions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar collapsed />

      {/* Main Workspace */}
      <main className="lg:ml-16">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
          <Link
            href="/dashboard/dsa-arena"
            className="text-gray-600 hover:text-black transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold text-black">{question.title}</h1>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1 text-gray-600">
              <span className="text-xs px-2 py-1 rounded bg-gray-100 font-mono">
                {question.difficulty}
              </span>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="flex h-[calc(100vh-80px)]">
          {/* Left Panel - Problem */}
          <div className="w-2/5 border-r border-gray-300 overflow-auto">
            <ProblemTabs question={question} />
          </div>

          {/* Right Panel - Code Editor & Console */}
          <div className="w-3/5 overflow-hidden">
            <CodeEditor initialCode={question.initialCode} />
          </div>
        </div>
      </main>
    </div>
  );
}
