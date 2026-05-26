"use client";

import { AlertCircle, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import type { IncidentSimulation } from "@/types/incident";
import { IncidentPanel } from "./incident-ui";

interface TimelinePanelProps {
  incident: IncidentSimulation;
  elapsedTime: number;
}

export default function TimelinePanel({
  incident,
  elapsedTime,
}: TimelinePanelProps) {
  const events = incident.timelineEvents || [];
  const triggered = events.filter((e) => e.timeSecond <= elapsedTime).length;

  const priorityStyles = {
    critical: {
      card: "border-l-2 border-red-500 bg-red-50/80 dark:border-red-400 dark:bg-red-950/25",
      icon: <AlertCircle className="h-3 w-3 text-red-500" />,
    },
    warning: {
      card: "border-l-2 border-amber-400 bg-amber-50/70 dark:border-amber-500/60 dark:bg-amber-950/20",
      icon: <AlertTriangle className="h-3 w-3 text-amber-500" />,
    },
    default: {
      card: "border-l-2 border-gray-300 bg-gray-50/80 dark:border-white/20 dark:bg-white/[0.04]",
      icon: <Clock className="h-3 w-3 text-gray-500" />,
    },
  };

  return (
    <IncidentPanel
      title="Timeline"
      subtitle={`${triggered}/${events.length} fired`}
      bodyClassName="min-h-0 overflow-y-auto p-1.5"
    >
      {events.length > 0 ? (
        <div className="space-y-1.5">
          {events.map((event) => {
            const hasOccurred = event.timeSecond <= elapsedTime;
            const p =
              event.priority === "critical" || event.priority === "warning"
                ? priorityStyles[event.priority]
                : priorityStyles.default;

            return (
              <div
                key={event.id}
                className={`rounded-r px-2 py-1.5 ${
                  hasOccurred
                    ? p.card
                    : "border-l-2 border-gray-200 opacity-40 dark:border-white/10"
                }`}
              >
                <div className="flex items-start gap-1.5">
                  <span className="mt-0.5 shrink-0">
                    {hasOccurred ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      p.icon
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[10px] font-medium text-black dark:text-white">
                      {event.title}
                      <span className="ml-1 font-normal text-gray-500">
                        {event.timeSecond}s
                      </span>
                    </p>
                    {hasOccurred && (
                      <p className="mt-0.5 text-[10px] leading-snug text-gray-600 dark:text-gray-400">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="py-6 text-center font-mono text-[10px] text-gray-500">
          No events
        </p>
      )}
    </IncidentPanel>
  );
}
