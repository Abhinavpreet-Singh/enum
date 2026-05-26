"use client";

import { AlertCircle, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import type { IncidentSimulation } from "@/types/incident";

interface TimelinePanelProps {
  incident: IncidentSimulation;
  elapsedTime: number;
}

export default function TimelinePanel({
  incident,
  elapsedTime,
}: TimelinePanelProps) {
  const events = incident.timelineEvents || [];

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "critical":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case "critical":
        return "bg-red-50 border-l-4 border-red-500";
      case "warning":
        return "bg-yellow-50 border-l-4 border-yellow-500";
      default:
        return "bg-gray-50 border-l-4 border-gray-300";
    }
  };

  return (
    <div className="h-full flex flex-col p-4 bg-white overflow-hidden">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">
          Timeline of Events
        </h3>
        <p className="text-xs text-gray-600">
          {events.filter((e) => e.timeSecond <= elapsedTime).length} /{" "}
          {events.length} events triggered
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {events.length > 0 ? (
          <div className="space-y-3">
            {events.map((event, idx) => {
              const hasOccurred = event.timeSecond <= elapsedTime;
              const isNext = !hasOccurred &&
                events
                  .filter((e) => e.timeSecond > elapsedTime)
                  .some((e) => e.id === event.id);

              return (
                <div
                  key={event.id}
                  className={`p-3 rounded border transition-all ${
                    hasOccurred
                      ? getPriorityColor(event.priority)
                      : isNext
                        ? "bg-blue-50 border-l-4 border-blue-500"
                        : "bg-gray-100 border-l-4 border-gray-300 opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">
                      {hasOccurred ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        getPriorityIcon(event.priority)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs font-semibold text-gray-900">
                          {event.title}
                        </p>
                        <span className="text-xs font-mono text-gray-600">
                          @ {event.timeSecond}s
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed">
                        {event.description}
                      </p>
                      {event.affectedServices && event.affectedServices.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {event.affectedServices.map((serviceId) => (
                            <span
                              key={serviceId}
                              className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded"
                            >
                              {serviceId}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p className="text-sm">No timeline events</p>
          </div>
        )}
      </div>

      {/* Progress Indicator */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-600 mb-2">
          Simulation Progress: {elapsedTime} / {incident.durationSeconds} seconds
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-500"
            style={{
              width: `${(elapsedTime / incident.durationSeconds) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
