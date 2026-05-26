"use client";

import { useState, useEffect, type MouseEvent } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { proxy } from "@/app/proxy";
import type {
  IncidentSimulation,
  IncidentSession,
  IncidentSessionState,
} from "@/types/incident";
import MetricsPanel from "./MetricsPanel";
import LogsPanel from "./LogsPanel";
import TimelinePanel from "./TimelinePanel";
import ServiceTopology from "./ServiceTopology";
import RevealScreen from "./RevealScreen";
import DiagnosisPanel from "./DiagnosisPanel";
import ActionsPanel from "./ActionsPanel";
import {
  ResizeHandleCol,
  startDragResize,
} from "./incident-ui";
import {
  getIncidentDisplayTitle,
  getSituationBrief,
} from "./incident-display";

interface IncidentWorkspaceProps {
  incident: IncidentSimulation;
  scenarioLabel?: string;
}

export default function IncidentWorkspace({
  incident,
  scenarioLabel,
}: IncidentWorkspaceProps) {
  const [session, setSession] = useState<IncidentSession | null>(null);
  const [state, setState] = useState<IncidentSessionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showReveal, setShowReveal] = useState(false);

  const [diagnosisSubmitted, setDiagnosisSubmitted] = useState(false);
  const [showActionsPanel, setShowActionsPanel] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isWide, setIsWide] = useState(false);

  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [logsWidth, setLogsWidth] = useState(440);
  const [timelineWidth, setTimelineWidth] = useState(300);
  const [resizing, setResizing] = useState<
    "sidebar" | "logs" | "timeline" | null
  >(null);

  useEffect(() => {
    const applyLayout = () => {
      const w = window.innerWidth;
      setIsWide(w >= 1024);
      if (w >= 1024) {
        setLogsWidth(Math.round(Math.min(580, Math.max(380, w * 0.4))));
        setSidebarWidth(Math.round(Math.min(400, Math.max(300, w * 0.22))));
        setTimelineWidth(Math.round(Math.min(380, Math.max(240, w * 0.2))));
      }
    };
    applyLayout();
    window.addEventListener("resize", applyLayout);
    return () => window.removeEventListener("resize", applyLayout);
  }, []);

  useEffect(() => {
    if (!session) return;
    if (session.selectedRootCauseId) {
      setDiagnosisSubmitted(true);
      if (session.correctDiagnosis) setShowActionsPanel(true);
    }
    if (session.isCompleted) {
      setIsCompleted(true);
      setIsRunning(false);
      setShowReveal(true);
    }
  }, [session]);

  useEffect(() => {
    const initSession = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("accessToken");

        if (!token) {
          setError("You must be logged in to play incidents");
          return;
        }

        const response = await axios.post(
          `${proxy}/api/v1/incidents/${incident.id}/session`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );

        const payload = response.data.data;
        const newSession = payload.session ?? payload;
        const newState = payload.state;
        setSession(newSession);
        if (newState) setState(newState);
        setIsRunning(!newSession.isCompleted);
        setIsCompleted(Boolean(newSession.isCompleted));
      } catch (err) {
        const message =
          axios.isAxiosError(err) && err.response?.data?.message
            ? err.response.data.message
            : "Failed to start incident session";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    initSession();
  }, [incident.id]);

  useEffect(() => {
    if (!session || !isRunning || isPaused || !state) return;

    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const response = await axios.post(
          `${proxy}/api/v1/incidents/${incident.id}/session/${session.id}/tick`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );

        const {
          session: updatedSession,
          state: updatedState,
          isComplete,
        } = response.data.data;
        setSession(updatedSession);
        setState(updatedState);

        if (isComplete) {
          setIsRunning(false);
          setIsCompleted(true);
        }
      } catch (err) {
        console.error("Error ticking simulation:", err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session, isRunning, isPaused, incident.id, state]);

  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (session && isRunning && !isCompleted) {
        try {
          const token = localStorage.getItem("accessToken");
          await axios.post(
            `${proxy}/api/v1/incidents/${incident.id}/session/${session.id}/stop`,
            {},
            { headers: { Authorization: `Bearer ${token}` } },
          );
        } catch (err) {
          console.error("Error stopping session:", err);
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [session, isRunning, isCompleted, incident.id]);

  const handlePlay = () => {
    setIsRunning(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleReset = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("accessToken");
      const response = await axios.post(
        `${proxy}/api/v1/incidents/${incident.id}/session`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const { session: newSession, state: newState } = response.data.data;
      setSession(newSession);
      setState(newState);
      setIsRunning(true);
      setIsPaused(false);
      setIsCompleted(false);
      setShowReveal(false);
      setDiagnosisSubmitted(false);
      setShowActionsPanel(false);
    } catch {
      setError("Failed to reset session");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!session) return;
    try {
      setIsSubmittingReport(true);
      const token = localStorage.getItem("accessToken");
      const response = await axios.post(
        `${proxy}/api/v1/incidents/${incident.id}/session/${session.id}/complete`,
        { rootCauseId: session.selectedRootCauseId || "" },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const updated = response.data.data?.session;
      if (updated) setSession(updated);

      setIsRunning(false);
      setIsPaused(true);
      setIsCompleted(true);
      setShowReveal(true);
    } catch {
      setError("Failed to submit report");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleDiagnosisSubmit = (correct: boolean) => {
    setDiagnosisSubmitted(true);
    if (correct) setShowActionsPanel(true);
  };

  const handleActionTaken = () => {
    if (!session) return;
    const token = localStorage.getItem("accessToken");
    axios
      .get(`${proxy}/api/v1/incidents/${incident.id}/session/${session.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setSession(res.data.data.session))
      .catch((err) => console.error("Failed to refresh session:", err));
  };

  const handleSidebarResize = (e: MouseEvent) => {
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    setResizing("sidebar");
    startDragResize(
      (ev) => {
        setSidebarWidth(
          Math.min(Math.max(280, startWidth + ev.clientX - startX), 520),
        );
      },
      () => setResizing(null),
    )(e);
  };

  const handleLogsResize = (e: MouseEvent) => {
    const startX = e.clientX;
    const startWidth = logsWidth;
    setResizing("logs");
    startDragResize(
      (ev) => {
        setLogsWidth(
          Math.min(Math.max(200, startWidth + ev.clientX - startX), 480),
        );
      },
      () => setResizing(null),
    )(e);
  };

  const handleTimelineResize = (e: MouseEvent) => {
    const startX = e.clientX;
    const startWidth = timelineWidth;
    setResizing("timeline");
    startDragResize(
      (ev) => {
        setTimelineWidth(
          Math.min(Math.max(240, startWidth + ev.clientX - startX), 640),
        );
      },
      () => setResizing(null),
    )(e);
  };

  const loadingShell = (
    <div className="flex h-full items-center justify-center bg-white dark:bg-black">
      <Loader2 className="h-6 w-6 animate-spin text-black dark:text-white" />
    </div>
  );

  if (isLoading) return loadingShell;

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-white px-4 dark:bg-black">
        <AlertCircle className="mb-3 h-10 w-10 text-red-500 dark:text-red-400" />
        <p className="mb-1 text-sm font-semibold text-black dark:text-white">
          Error
        </p>
        <p className="mb-4 text-center text-xs text-gray-600 dark:text-gray-400">
          {error}
        </p>
        <Link
          href="/dashboard/incidents"
          className="font-mono text-xs text-black underline dark:text-white"
        >
          Back to Incidents
        </Link>
      </div>
    );
  }

  if (showReveal && incident && session) {
    return (
      <RevealScreen
        incident={incident}
        session={session}
        scenarioLabel={scenarioLabel}
        onClose={() => {
          window.location.href = "/dashboard/incidents";
        }}
      />
    );
  }

  if (!session || !state) return loadingShell;

  const progress = (state.currentTime / incident.durationSeconds) * 100;
  const displayTitle = getIncidentDisplayTitle(incident);
  const situationBrief = getSituationBrief(incident);
  const actionsCount = session.actionsTaken?.length ?? 0;
  const canSubmit =
    Boolean(session.selectedRootCauseId) &&
    !isCompleted &&
    (!session.correctDiagnosis || actionsCount >= 1);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-gray-50 dark:bg-[#0a0a0a]">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 bg-white px-2 py-1.5 dark:border-white/10 dark:bg-black">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/dashboard/incidents"
            className="flex shrink-0 items-center gap-0.5 font-mono text-[10px] text-gray-500 hover:text-black dark:hover:text-white"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back
          </Link>
          <div className="min-w-0">
            {scenarioLabel && (
              <p className="font-mono text-[9px] uppercase tracking-wider text-gray-400">
                {scenarioLabel}
              </p>
            )}
            <h1 className="truncate font-mono text-xs font-semibold text-black dark:text-white">
              {displayTitle}
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <span className="flex items-center gap-1 font-mono text-[10px] text-gray-500">
            <Clock className="h-3 w-3" />
            {Math.floor(state.currentTime / 60)}:
            {String(state.currentTime % 60).padStart(2, "0")}/
            {Math.floor(incident.durationSeconds / 60)}:00
          </span>

          <div className="flex items-center gap-0.5">
            {isRunning && !isPaused && (
              <button
                type="button"
                onClick={handlePause}
                className="rounded border border-gray-200 p-1 dark:border-white/15"
                title="Pause"
              >
                <Pause className="h-3.5 w-3.5" />
              </button>
            )}
            {(!isRunning || isPaused) && !isCompleted && (
              <button
                type="button"
                onClick={handlePlay}
                className="rounded border border-gray-200 p-1 dark:border-white/15"
                title="Play"
              >
                <Play className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleReset}
              className="rounded border border-gray-200 p-1 dark:border-white/15"
              title="Reset"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          <span className="hidden font-mono text-[10px] text-gray-500 sm:inline">
            +{incident.xpReward} XP
          </span>

          {canSubmit && (
            <button
              type="button"
              onClick={handleSubmitReport}
              disabled={isSubmittingReport}
              className="rounded bg-black px-3 py-1.5 font-mono text-xs font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {isSubmittingReport ? "Submitting…" : "Submit report"}
            </button>
          )}
        </div>
      </header>

      <div className="h-px shrink-0 bg-gray-200 dark:bg-white/10">
        <div
          className="h-full bg-black dark:bg-white"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <aside
          className="flex w-full shrink-0 flex-col overflow-y-auto overflow-x-hidden border-gray-200 bg-white dark:bg-black lg:border-r lg:max-h-none"
          style={isWide ? { width: sidebarWidth, maxHeight: undefined } : { maxHeight: "38vh" }}
        >
          <div className="space-y-3 p-3">
            <section className="rounded border border-gray-200 bg-gray-50/50 p-3 dark:border-white/10 dark:bg-white/[0.02]">
              <h2 className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-black dark:text-white">
                What&apos;s going on?
              </h2>
              <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                {situationBrief}
              </p>
              <p className="mt-1.5 font-mono text-[9px] text-gray-400">
                {incident.difficulty} · ~{incident.estimatedTime} min · +
                {incident.xpReward} XP
              </p>
            </section>

            {session && (
              <DiagnosisPanel
                incident={incident}
                session={session}
                onDiagnosisSubmit={handleDiagnosisSubmit}
              />
            )}

            {showActionsPanel && session && (
              <ActionsPanel
                incident={incident}
                session={session}
                onActionTaken={handleActionTaken}
              />
            )}
          </div>
        </aside>

        {isWide && (
          <ResizeHandleCol
            onMouseDown={handleSidebarResize}
            active={resizing === "sidebar"}
          />
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <MetricsPanel state={state} />

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden xl:flex-row">
            <div
              className="min-h-0 w-full shrink-0 overflow-hidden xl:w-auto"
              style={isWide ? { width: logsWidth, minHeight: 200 } : { minHeight: 180 }}
            >
              <LogsPanel state={state} />
            </div>

            {isWide && (
              <ResizeHandleCol
                onMouseDown={handleLogsResize}
                active={resizing === "logs"}
              />
            )}

            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:flex-row">
              <div
                className="min-h-0 w-full shrink-0 overflow-hidden md:w-auto"
                style={isWide ? { width: timelineWidth, minHeight: 160 } : { minHeight: 140 }}
              >
                <TimelinePanel
                  incident={incident}
                  elapsedTime={state.currentTime}
                />
              </div>
              {isWide && (
                <ResizeHandleCol
                  onMouseDown={handleTimelineResize}
                  active={resizing === "timeline"}
                />
              )}
              <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
                <ServiceTopology services={state.services} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
