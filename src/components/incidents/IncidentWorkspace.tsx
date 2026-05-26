"use client";

import { useState, useEffect, useCallback } from "react";
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

interface IncidentWorkspaceProps {
  incident: IncidentSimulation;
}

export default function IncidentWorkspace({
  incident,
}: IncidentWorkspaceProps) {
  // Session state
  const [session, setSession] = useState<IncidentSession | null>(null);
  const [state, setState] = useState<IncidentSessionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Simulation control
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showReveal, setShowReveal] = useState(false);

  // Diagnosis & Actions
  const [diagnosisSubmitted, setDiagnosisSubmitted] = useState(false);
  const [showDiagnosisPanel, setShowDiagnosisPanel] = useState(true);
  const [showActionsPanel, setShowActionsPanel] = useState(false);

  // Layout state
  const [panelHeights, setPanelHeights] = useState({
    top: 150,
    middle: 250,
    bottom: 200,
  });

  // Initialize session
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
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        const { session: newSession, state: newState } = response.data.data;
        setSession(newSession);
        setState(newState);
        setIsRunning(true);
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

  // Auto-tick simulation
  useEffect(() => {
    if (!session || !isRunning || isPaused || !state) return;

    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const response = await axios.post(
          `${proxy}/api/v1/incidents/${incident.id}/session/${session.id}/tick`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          },
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
    }, 1000); // Tick every 1 second

    return () => clearInterval(interval);
  }, [session, isRunning, isPaused, incident.id, state]);

  // Stop session on tab close
  useEffect(() => {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      if (session && isRunning && !isCompleted) {
        // Call stop endpoint
        try {
          const token = localStorage.getItem("accessToken");
          await axios.post(
            `${proxy}/api/v1/incidents/${incident.id}/session/${session.id}/stop`,
            {},
            {
              headers: { Authorization: `Bearer ${token}` },
            },
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
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const { session: newSession, state: newState } = response.data.data;
      setSession(newSession);
      setState(newState);
      setIsRunning(true);
      setIsPaused(false);
      setIsCompleted(false);
      setShowReveal(false);
    } catch (err) {
      setError("Failed to reset session");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteIncident = async (rootCauseId: string) => {
    try {
      const token = localStorage.getItem("accessToken");
      await axios.post(
        `${proxy}/api/v1/incidents/${incident.id}/session/${session?.id}/complete`,
        { rootCauseId },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setIsRunning(false);
      setIsCompleted(true);
      setShowReveal(true);
    } catch (err) {
      setError("Failed to complete incident");
    }
  };

  const handleDiagnosisSubmit = (correct: boolean, selectedId: string) => {
    setDiagnosisSubmitted(true);
    if (correct) {
      setShowActionsPanel(true);
    }
  };

  const handleActionTaken = (actionId: string) => {
    // Refresh session to get updated actions
    if (session) {
      const token = localStorage.getItem("accessToken");
      axios
        .get(
          `${proxy}/api/v1/incidents/${incident.id}/session/${session.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        )
        .then((res) => {
          setSession(res.data.data.session);
        })
        .catch((err) => console.error("Failed to refresh session:", err));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-lg font-semibold text-gray-900 mb-2">Error</p>
        <p className="text-gray-600 mb-6">{error}</p>
        <Link
          href="/dashboard/simulations"
          className="text-blue-600 hover:underline"
        >
          Back to Simulations
        </Link>
      </div>
    );
  }

  if (showReveal && incident) {
    return (
      <RevealScreen
        incident={incident}
        session={session!}
        onClose={() => {
          window.location.href = "/dashboard/simulations";
        }}
      />
    );
  }

  if (!session || !state) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <p className="text-gray-600">Loading incident...</p>
      </div>
    );
  }

  const progress = (state.currentTime / incident.durationSeconds) * 100;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/simulations"
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-black transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">
            {incident.title}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Time Display */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>
              {Math.floor(state.currentTime / 60)}:
              {String(state.currentTime % 60).padStart(2, "0")} /{" "}
              {Math.floor(incident.durationSeconds / 60)}:00
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {isRunning && !isPaused && (
              <button
                onClick={handlePause}
                className="p-2 rounded-lg bg-yellow-50 hover:bg-yellow-100 text-yellow-600 transition-colors"
                title="Pause"
              >
                <Pause className="w-4 h-4" />
              </button>
            )}
            {(!isRunning || isPaused) && !isCompleted && (
              <button
                onClick={handlePlay}
                className="p-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-colors"
                title="Play"
              >
                <Play className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleReset}
              className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* XP Reward */}
          <div className="text-sm font-semibold text-purple-600 bg-purple-50 px-3 py-1 rounded-lg">
            +{incident.xpReward} XP
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-gray-200">
        <div
          className="h-full bg-blue-600 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden bg-white">
        {/* Left Panel - Incident Brief + Diagnosis + Actions */}
        <div className="w-80 border-r border-gray-200 overflow-y-auto bg-gray-50 p-4 space-y-4">
          {/* Incident Brief */}
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-2">
              Incident Brief
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              {incident.description}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-700 mb-2 uppercase">
              Difficulty
            </h3>
            <div className="inline-block px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
              {incident.difficulty.charAt(0).toUpperCase() +
                incident.difficulty.slice(1)}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-700 mb-2 uppercase">
              Tags
            </h3>
            <div className="flex flex-wrap gap-1">
              {incident.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Diagnosis Panel */}
          {showDiagnosisPanel && session && (
            <DiagnosisPanel
              incident={incident}
              session={session}
              onDiagnosisSubmit={handleDiagnosisSubmit}
            />
          )}

          {/* Actions Panel */}
          {showActionsPanel && session && state && (
            <ActionsPanel
              incident={incident}
              session={session}
              elapsedTime={state.currentTime}
              onActionTaken={handleActionTaken}
            />
          )}
        </div>

        {/* Main Content - Metrics, Logs, Timeline, Topology */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Top Row - Metrics & Logs */}
          <div className="flex flex-none h-80 border-b border-gray-200">
            <div className="flex-1 overflow-hidden border-r border-gray-200">
              <MetricsPanel incident={incident} state={state} />
            </div>
            <div className="flex-1 overflow-hidden">
              <LogsPanel state={state} />
            </div>
          </div>

          {/* Bottom Row - Timeline & Topology */}
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 overflow-hidden border-r border-gray-200">
              <TimelinePanel
                incident={incident}
                elapsedTime={state.currentTime}
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              <ServiceTopology services={state.services} />
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {isCompleted ? (
            <span className="text-green-600 font-semibold">
              Incident simulation complete! Click "Reveal" to see what this was inspired by.
            </span>
          ) : diagnosisSubmitted ? (
            <span>
              Actions taken: {session?.actionsTaken?.length || 0}. Ready to complete?
            </span>
          ) : (
            <span>
              Analyze the incident. Identify the root cause. Take action to resolve it.
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {diagnosisSubmitted && !isCompleted && (
            <button
              onClick={async () => {
                await handleCompleteIncident(session?.selectedRootCauseId || "");
              }}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors"
            >
              Complete Incident
            </button>
          )}
          {isCompleted && (
            <button
              onClick={() => setShowReveal(true)}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors"
            >
              Reveal Real Incident
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
