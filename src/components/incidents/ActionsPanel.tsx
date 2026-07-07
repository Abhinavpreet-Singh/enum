"use client";
import { API_BASE_URL } from "@/lib/api-config";
import api, { isAxiosError } from "@/lib/api";
import { getMemoryToken } from "@/lib/tokenStore";

import { useState } from "react";
import {
  RotateCcw,
  RefreshCw,
  TrendingUp,
  Search,
  CheckCircle2,
} from "lucide-react";
import type {
  IncidentSimulation,
  IncidentSession,
  IncidentActionOption,
} from "@/types/incident";
import { MAX_REMEDIATION_ACTIONS } from "./incident-remediation";

interface ActionsPanelProps {
  incident: IncidentSimulation;
  session: IncidentSession;
  onActionTaken: (actionId: string) => void;
}

const categoryIcons = {
  rollback: <RotateCcw className="h-3.5 w-3.5" />,
  restart: <RefreshCw className="h-3.5 w-3.5" />,
  scale: <TrendingUp className="h-3.5 w-3.5" />,
  investigate: <Search className="h-3.5 w-3.5" />,
};

const shell =
  "rounded-lg border border-gray-200 bg-gray-50/80 dark:border-white/10 dark:bg-white/[0.03]";

export default function ActionsPanel({
  incident,
  session,
  onActionTaken,
}: ActionsPanelProps) {
  const [isTakingAction, setIsTakingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actionsTaken = session.actionsTaken || [];
  const taken = actionsTaken[0];
  const takenOption = taken
    ? incident.actionOptions.find((a) => a.id === taken.actionId)
    : null;

  const handleAction = async (action: IncidentActionOption) => {
    if (taken) return;

    try {
      setIsTakingAction(action.id);
      setError(null);
      const token = getMemoryToken();

      await api.post(
        `/api/v1/incidents/${incident.id}/session/${session.id}/action`,
        { actionId: action.id },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      onActionTaken(action.id);
    } catch (err) {
      const message =
        isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Could not run action";
      setError(message);
    } finally {
      setIsTakingAction(null);
    }
  };

  if (taken && takenOption) {
    return (
      <div className={`${shell} p-3`}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-black dark:text-white">
            Remediation
          </p>
          <span className="font-mono text-[10px] text-gray-500">1/1</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 dark:border-white/15 dark:bg-black/40">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="font-mono text-xs font-medium text-black dark:text-white">
            {takenOption.title}
          </p>
        </div>
        <p className="mt-2 text-[11px] text-gray-500">
          Submit your report to see how your fix compares to the other options.
        </p>
      </div>
    );
  }

  return (
    <div className={`${shell} p-3`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-black dark:text-white">
          Remediation
        </p>
        <span className="font-mono text-[10px] text-gray-500">
          Select {MAX_REMEDIATION_ACTIONS}
        </span>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400">
        Pick one action to take. You&apos;ll see why it worked (or didn&apos;t) on
        the results page.
      </p>

      <div className="mt-2.5 space-y-1.5">
        {incident.actionOptions.map((action: IncidentActionOption) => {
          const busy = isTakingAction === action.id;
          const disabled = busy || !session.correctDiagnosis;

          return (
            <button
              key={action.id}
              type="button"
              onClick={() => handleAction(action)}
              disabled={disabled}
              className="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-left transition-colors hover:border-black disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/10 dark:bg-black/40 dark:hover:border-white"
            >
              <span className="shrink-0 text-gray-500 dark:text-gray-400">
                {categoryIcons[action.category as keyof typeof categoryIcons]}
              </span>
              <span className="min-w-0 flex-1 font-mono text-xs text-black dark:text-white">
                {action.title}
              </span>
              <span className="shrink-0 font-mono text-[10px] text-gray-400">
                {busy ? "…" : "Run"}
              </span>
            </button>
          );
        })}
      </div>

      {!session.correctDiagnosis && (
        <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300">
          Commit the correct hypothesis first.
        </p>
      )}

      {error && (
        <p className="mt-2 text-[11px] text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
