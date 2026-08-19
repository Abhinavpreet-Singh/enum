"use client";

import ProblemTabs, { type TabType } from "@/components/dsa/problem-tabs";
import CodeEditor from "@/components/dsa/code-editor";
import CompetitionPanel from "@/components/dsa/competition-panel";
import { Question, fetchQuestions } from "@/data/dsa-questions";
import {
  useQuestionCompetition,
  type CompetitionState,
} from "@/hooks/useQuestionCompetition";
import { useAuthContext } from "@/providers/AuthProvider";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  buildRaceLobbyPath,
  getStoredRaceUsername,
} from "@/components/race/race-landing";

export default function DSAArenaClientPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const raceId = searchParams.get("race");
  const { user } = useAuthContext();
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [leftPanelWidth, setLeftPanelWidth] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [editorExpanded, setEditorExpanded] = useState(false);
  const [refreshSolutions, setRefreshSolutions] = useState(0);
  const [refreshSubmissions, setRefreshSubmissions] = useState(0);
  const [leftPanelTab, setLeftPanelTab] = useState<TabType>("description");

  const {
    competition,
    loading: competitionLoading,
    editorLocked,
    isWinner,
    isParticipant,
    canEnd,
    ending,
    end,
    settleTimed,
    join,
    joining,
    handleCompetitionSubmitResult,
  } = useQuestionCompetition({
    questionId: id,
    userId: user?.id,
    competitionId: raceId,
    enabled: Boolean(user?.id),
  });

  const joinAttemptedRef = useRef<string | null>(null);

  // Waiting races belong on the dedicated lobby page (NeetCode-style).
  useEffect(() => {
    if (!raceId || competitionLoading) return;
    if (competition?.status === "waiting") {
      router.replace(buildRaceLobbyPath(raceId));
    }
  }, [raceId, competition?.status, competitionLoading, router]);

  // Invite link deep-link: ensure name first, then join the targeted race.
  useEffect(() => {
    if (!raceId || !user?.id || competitionLoading || joining) return;
    if (isParticipant) return;
    if (joinAttemptedRef.current === raceId) return;

    const username = getStoredRaceUsername();
    if (!username) {
      router.replace(`/dashboard/race?invite=${encodeURIComponent(raceId)}`);
      return;
    }

    if (competition && !competition.canJoin) return;

    joinAttemptedRef.current = raceId;
    void join({ competitionId: raceId, username });
  }, [
    raceId,
    user?.id,
    competitionLoading,
    joining,
    isParticipant,
    competition,
    join,
    router,
  ]);

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

  const competitionLockedMessage =
    competition?.winner && !isWinner
      ? `${competition.winner.username} won this race. You can no longer edit or submit code.`
      : undefined;

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
        const containerWidth = window.innerWidth - 64;
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
    <div className="flex flex-col h-[calc(100vh/1.1)] overflow-hidden">
      <CompetitionPanel
        competition={competition}
        loading={
          competitionLoading || Boolean(raceId && !isParticipant && joining)
        }
        isParticipant={isParticipant}
        isWinner={isWinner}
        editorLocked={editorLocked}
        canEnd={canEnd}
        ending={ending}
        onEndRace={end}
        onSettleTimed={settleTimed}
      />

      <div className="flex flex-1 overflow-hidden relative min-h-0">
        {!editorExpanded && (
          <>
            <div
              className="flex h-full min-w-0 flex-col overflow-hidden"
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

            <div
              onMouseDown={handleMouseDown}
              className={`w-1 cursor-col-resize shrink-0 ${
                isResizing
                  ? "bg-white dark:bg-white"
                  : "bg-transparent hover:bg-gray-300 dark:hover:bg-white/20"
              }`}
              style={{ minWidth: "1px" }}
            />
          </>
        )}

        <div
          className={`overflow-hidden min-h-0 ${
            editorExpanded ? "w-full flex-1" : "flex-1"
          }`}
        >
          <CodeEditor
            initialCode={question.initialCode}
            testCases={question.examples
              .filter((tc) => !tc.isHidden)
              .map((tc) => ({
              ...tc,
              input: Array.isArray(tc.input) ? tc.input.join("\n") : tc.input,
            }))}
            questionId={question.id}
            onSolutionPublished={handleSolutionPublished}
            onSubmitSuccess={handleSubmitSuccess}
            competitionLocked={isParticipant && editorLocked}
            competitionLockedMessage={competitionLockedMessage}
            onCompetitionResult={({ competition: next }) => {
              handleCompetitionSubmitResult(next as CompetitionState | null);
            }}
            editorExpanded={editorExpanded}
            onToggleEditorExpand={() => setEditorExpanded((v) => !v)}
          />
        </div>
      </div>
    </div>
  );
}
