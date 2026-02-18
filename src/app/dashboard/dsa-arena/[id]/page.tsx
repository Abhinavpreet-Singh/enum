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
  const [leftPanelWidth, setLeftPanelWidth] = useState(40); // percentage
  const [isResizing, setIsResizing] = useState(false);

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

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.classList.add("resize-active");
    const startX = e.clientX;
    const startWidth = leftPanelWidth;
    let animationFrameId: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = requestAnimationFrame(() => {
        const containerWidth = window.innerWidth - 64; // minus sidebar
        const deltaX = e.clientX - startX;
        const deltaPercent = (deltaX / containerWidth) * 100;
        const newWidth = Math.min(Math.max(20, startWidth + deltaPercent), 80);
        setLeftPanelWidth(newWidth);
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.classList.remove("resize-active");
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="font-mono text-sm text-gray-500">
          Loading question...
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="font-mono text-sm text-gray-500 mb-4">
            Question not found
          </div>
          <Link
            href="/dashboard/dsa-arena"
            className="text-black underline font-mono text-sm"
          >
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
        <div className="bg-white border-b px-6 py-4 flex items-center gap-4">
          <Link
            href="/dashboard/dsa-arena"
            className="text-gray-600 hover:text-black transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold text-black">{question.title}</h1>
          <div className="ml-auto flex items-center gap-2">
            <span
              className={`text-xs px-2 py-1 rounded font-mono ${
                question.difficulty === "Easy"
                  ? "bg-green-50 text-green-600"
                  : question.difficulty === "Medium"
                    ? "bg-yellow-50 text-yellow-600"
                    : "bg-red-50 text-red-600"
              }`}
            >
              {question.difficulty}
            </span>
          </div>
        </div>

        {/* Content Grid */}
        <div className="flex h-[calc(100vh-80px)] relative">
          {/* Left Panel - Problem */}
          <div
            className="overflow-auto dark-scrollbar"
            style={{ width: `${leftPanelWidth}%` }}
          >
            <ProblemTabs question={question} />
          </div>

          {/* Vertical Resize Handle */}
          <div
            onMouseDown={handleMouseDown}
            className={`w-1 cursor-col-resize shrink-0 ${
              isResizing ? "bg-black" : "bg-transparent hover:bg-gray-300"
            }`}
            style={{ minWidth: "1px" }}
          />

          {/* Right Panel - Code Editor & Console */}
          <div className="overflow-hidden flex-1">
            <CodeEditor initialCode={question.initialCode} />
          </div>
        </div>
      </main>
    </div>
  );
}
