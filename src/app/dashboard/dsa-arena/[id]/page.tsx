"use client";

import ProblemTabs from "@/components/dsa/problem-tabs";
import CodeEditor from "@/components/dsa/code-editor";
import { Question, fetchQuestions } from "@/data/dsa-questions";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function WorkspacePage() {
  const params = useParams();
  const id = params.id as string;
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [leftPanelWidth, setLeftPanelWidth] = useState(50); // percentage
  const [isResizing, setIsResizing] = useState(false);
  const [refreshSolutions, setRefreshSolutions] = useState(0);
  const [refreshSubmissions, setRefreshSubmissions] = useState(0);
  const [leftPanelTab, setLeftPanelTab] = useState<
    "description" | "submissions" | "solutions"
  >("description");

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

  const handleSolutionPublished = () => {
    setRefreshSolutions((prev) => prev + 1);
  };

  const handleSubmitSuccess = () => {
    setRefreshSubmissions((prev) => prev + 1);
    setLeftPanelTab("submissions");
  };

  // Lock page-level scroll — only individual panels scroll internally
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="font-mono text-sm text-gray-500">
          Loading question...
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
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
    <>
      {/* Content Grid — height compensates for zoom:110% on parent layout (100vh/1.1 = visually fills viewport exactly) */}
      <div className="flex h-[calc(100vh/1.1)] overflow-hidden relative">
        {/* Left Panel - Problem */}
        <div
          className="h-full overflow-hidden"
          style={{ width: `${leftPanelWidth}%` }}
        >
          <ProblemTabs
            question={question}
            refreshSolutions={refreshSolutions}
            refreshSubmissions={refreshSubmissions}
            activeTab={leftPanelTab}
            onTabChange={setLeftPanelTab}
          />
        </div>

        {/* Vertical Resize Handle */}
        <div
          onMouseDown={handleMouseDown}
          className={`w-1 cursor-col-resize shrink-0 ${
            isResizing
              ? "bg-white dark:bg-white"
              : "bg-transparent hover:bg-gray-300 dark:hover:bg-white/20"
          }`}
          style={{ minWidth: "1px" }}
        />

        {/* Right Panel - Code Editor & Console */}
        <div className="overflow-hidden flex-1">
          <CodeEditor
            initialCode={question.initialCode}
            testCases={question.examples.map((tc) => ({
              ...tc,
              input: Array.isArray(tc.input) ? tc.input.join("\n") : tc.input,
            }))}
            questionId={question.id}
            onSolutionPublished={handleSolutionPublished}
            onSubmitSuccess={handleSubmitSuccess}
          />
        </div>
      </div>
    </>
  );
}
