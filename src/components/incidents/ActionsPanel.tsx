"use client";

import { useState } from "react";
import {
  RotateCcw,
  RefreshCw,
  TrendingUp,
  Search,
  AlertCircle,
} from "lucide-react";
import axios from "axios";
import { proxy } from "@/app/proxy";
import type {
  IncidentSimulation,
  IncidentSession,
  IncidentActionOption,
} from "@/types/incident";

interface ActionsPanelProps {
  incident: IncidentSimulation;
  session: IncidentSession;
  elapsedTime: number;
  onActionTaken: (actionId: string) => void;
}

const categoryIcons = {
  rollback: <RotateCcw className="w-4 h-4" />,
  restart: <RefreshCw className="w-4 h-4" />,
  scale: <TrendingUp className="w-4 h-4" />,
  investigate: <Search className="w-4 h-4" />,
};

export default function ActionsPanel({
  incident,
  session,
  elapsedTime,
  onActionTaken,
}: ActionsPanelProps) {
  const [isTakingAction, setIsTakingAction] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{
    actionId: string;
    success: boolean;
  } | null>(null);

  const handleAction = async (action: IncidentActionOption) => {
    try {
      setIsTakingAction(action.id);
      const token = localStorage.getItem("accessToken");

      await axios.post(
        `${proxy}/api/v1/incidents/${incident.id}/session/${session.id}/action`,
        { actionId: action.id },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setActionResult({
        actionId: action.id,
        success: true,
      });

      onActionTaken(action.id);

      // Clear success message after 2 seconds
      setTimeout(() => setActionResult(null), 2000);
    } catch (err) {
      console.error("Error taking action:", err);
      setActionResult({
        actionId: action.id,
        success: false,
      });
    } finally {
      setIsTakingAction(null);
    }
  };

  const actionsTaken = session.actionsTaken || [];
  const takenIds = new Set(actionsTaken.map((a: any) => a.actionId));

  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <h3 className="font-semibold text-gray-900 mb-3">Available Actions</h3>
      <p className="text-sm text-gray-600 mb-3">
        Take corrective actions to resolve the incident:
      </p>

      <div className="space-y-2">
        {incident.actionOptions.map((action: IncidentActionOption) => {
          const alreadyTaken = takenIds.has(action.id);
          const isProcessing = isTakingAction === action.id;

          return (
            <div
              key={action.id}
              className="p-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="mt-1 p-2 rounded-lg bg-blue-100 text-blue-600">
                  {categoryIcons[action.category as keyof typeof categoryIcons]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{action.title}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {action.description}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                    <span>Recovery time: {action.recoveryTime}s</span>
                    <span>•</span>
                    <span>Fixes: {action.fixesMetrics.join(", ") || "N/A"}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleAction(action)}
                  disabled={
                    isProcessing ||
                    alreadyTaken ||
                    !session.correctDiagnosis
                  }
                  className="px-3 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors flex-shrink-0"
                  title={
                    !session.correctDiagnosis
                      ? "Make a diagnosis first"
                      : alreadyTaken
                        ? "Already taken"
                        : "Take this action"
                  }
                  style={{
                    backgroundColor: alreadyTaken
                      ? "#e5e7eb"
                      : !session.correctDiagnosis
                        ? "#f3f4f6"
                        : "#10b981",
                    color: alreadyTaken
                      ? "#6b7280"
                      : !session.correctDiagnosis
                        ? "#6b7280"
                        : "white",
                  }}
                >
                  {isProcessing ? "..." : alreadyTaken ? "Done" : "Execute"}
                </button>
              </div>

              {actionResult?.actionId === action.id && (
                <div
                  className={`mt-2 p-2 rounded text-sm flex items-center gap-2 ${
                    actionResult.success
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  <AlertCircle className="w-4 h-4" />
                  {actionResult.success ? (
                    <span>Action executed. Monitoring recovery...</span>
                  ) : (
                    <span>Failed to execute action</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {actionsTaken.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <p className="font-medium text-blue-900 mb-1">
            Actions Taken ({actionsTaken.length}):
          </p>
          <div className="space-y-1">
            {actionsTaken.map((action: any, idx: number) => {
              const option = incident.actionOptions.find(
                (a) => a.id === action.actionId,
              );
              return (
                <p key={idx} className="text-blue-700 text-xs">
                  • {option?.title} at {Math.floor(action.timestamp / 60)}:
                  {String(action.timestamp % 60).padStart(2, "0")}
                </p>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
