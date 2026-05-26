"use client";

import { useEffect, useRef } from "react";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import type { IncidentSessionState } from "@/types/incident";

interface LogsPanelProps {
  state: IncidentSessionState;
}

export default function LogsPanel({ state }: LogsPanelProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs appear
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.logs.length]);

  const parseLogLevel = (
    log: string,
  ): "info" | "warning" | "error" | "critical" => {
    const upperLog = log.toUpperCase();
    if (upperLog.includes("CRIT") || upperLog.includes("ERROR")) {
      return "critical";
    }
    if (upperLog.includes("ERR")) {
      return "error";
    }
    if (upperLog.includes("WARN")) {
      return "warning";
    }
    return "info";
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case "critical":
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getLogBg = (level: string) => {
    switch (level) {
      case "critical":
      case "error":
        return "bg-red-50 border-l-4 border-red-500";
      case "warning":
        return "bg-yellow-50 border-l-4 border-yellow-500";
      default:
        return "bg-gray-50 border-l-4 border-gray-300";
    }
  };

  const getLogTextColor = (level: string) => {
    switch (level) {
      case "critical":
      case "error":
        return "text-red-800";
      case "warning":
        return "text-yellow-800";
      default:
        return "text-gray-700";
    }
  };

  return (
    <div className="h-full flex flex-col p-4 bg-white">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">System Logs</h3>
        <p className="text-xs text-gray-600">{state.logs.length} entries</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {state.logs.length > 0 ? (
          <>
            {state.logs.map((log, idx) => {
              const level = parseLogLevel(log);
              return (
                <div
                  key={idx}
                  className={`p-2 rounded text-xs font-mono ${getLogBg(level)} ${getLogTextColor(level)} flex gap-2 items-start`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getLogIcon(level)}
                  </div>
                  <div className="flex-1 break-words">
                    {log}
                  </div>
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p className="text-sm">Waiting for logs...</p>
          </div>
        )}
      </div>

      {state.activeAlerts.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs font-semibold text-red-600 mb-2">
            🚨 Active Alerts ({state.activeAlerts.length})
          </p>
          <div className="space-y-1">
            {state.activeAlerts.map((alert, idx) => (
              <div key={idx} className="text-xs text-red-700">
                • {alert}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
