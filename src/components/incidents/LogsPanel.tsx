"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import type { IncidentSessionState } from "@/types/incident";
import { IncidentPanel } from "./incident-ui";

interface LogsPanelProps {
  state: IncidentSessionState;
}

type LogLevel = "info" | "warning" | "error" | "critical";

export default function LogsPanel({ state }: LogsPanelProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.logs.length]);

  const parseLogLevel = (log: string): LogLevel => {
    const upperLog = log.toUpperCase();
    if (upperLog.includes("CRIT") || upperLog.includes("ERROR")) {
      return "critical";
    }
    if (upperLog.includes("ERR")) return "error";
    if (upperLog.includes("WARN")) return "warning";
    return "info";
  };

  const levelStyles: Record<
    LogLevel,
    { icon: ReactNode; row: string; text: string }
  > = {
    critical: {
      icon: <AlertCircle className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />,
      row: "border-l-2 border-red-500 bg-red-50/80 dark:border-red-400 dark:bg-red-950/30",
      text: "text-red-900 dark:text-red-200",
    },
    error: {
      icon: <AlertCircle className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />,
      row: "border-l-2 border-red-400 bg-red-50/60 dark:border-red-500/70 dark:bg-red-950/20",
      text: "text-red-800 dark:text-red-300",
    },
    warning: {
      icon: (
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
      ),
      row: "border-l-2 border-amber-400 bg-amber-50/70 dark:border-amber-500/60 dark:bg-amber-950/25",
      text: "text-amber-900 dark:text-amber-200",
    },
    info: {
      icon: <Info className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />,
      row: "border-l-2 border-gray-300 bg-gray-50/80 dark:border-white/15 dark:bg-white/[0.03]",
      text: "text-gray-700 dark:text-gray-300",
    },
  };

  return (
    <IncidentPanel
      title="System Logs"
      subtitle={`${state.logs.length} entries`}
      bodyClassName="flex min-h-0 flex-col p-0"
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-1">
        {state.logs.length > 0 ? (
          <div className="space-y-1">
            {state.logs.map((log, idx) => {
              const level = parseLogLevel(log);
              const styles = levelStyles[level];
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-1.5 rounded-r px-1.5 py-1 font-mono text-[10px] leading-snug ${styles.row} ${styles.text}`}
                >
                  <span className="mt-0.5 shrink-0">{styles.icon}</span>
                  <span className="min-w-0 flex-1 break-words">{log}</span>
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
              Waiting for logs…
            </p>
          </div>
        )}
      </div>

      {state.activeAlerts.length > 0 && (
        <div className="max-h-16 shrink-0 overflow-y-auto border-t border-gray-200 px-1.5 py-1 dark:border-white/10">
          <p className="mb-0.5 font-mono text-[9px] font-semibold uppercase text-red-600 dark:text-red-400">
            Alerts ({state.activeAlerts.length})
          </p>
          <ul className="space-y-0.5">
            {state.activeAlerts.map((alert, idx) => (
              <li
                key={idx}
                className="font-mono text-[9px] text-red-700 dark:text-red-300"
              >
                • {alert}
              </li>
            ))}
          </ul>
        </div>
      )}
    </IncidentPanel>
  );
}
