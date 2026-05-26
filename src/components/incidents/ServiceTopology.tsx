"use client";

import { Activity } from "lucide-react";
import type { IncidentService } from "@/types/incident";
import { IncidentPanel } from "./incident-ui";

interface ServiceTopologyProps {
  services: IncidentService[];
}

export default function ServiceTopology({ services }: ServiceTopologyProps) {
  const serviceOrder = [
    "frontend",
    "api_gateway",
    "processing",
    "database",
    "cache",
  ];

  const orderedServices = serviceOrder
    .map((id) => services.find((s) => s.id === id))
    .filter(Boolean) as IncidentService[];

  const statusStyles: Record<
    IncidentService["status"],
    { box: string; dot: string; label: string }
  > = {
    healthy: {
      box: "border-emerald-400/50 bg-emerald-50/70 dark:border-emerald-500/35 dark:bg-emerald-950/20",
      dot: "bg-emerald-500",
      label: "OK",
    },
    degraded: {
      box: "border-amber-400/50 bg-amber-50/70 dark:border-amber-500/35 dark:bg-amber-950/20",
      dot: "bg-amber-500",
      label: "DEG",
    },
    critical: {
      box: "border-red-400/60 bg-red-50/80 dark:border-red-500/40 dark:bg-red-950/25",
      dot: "bg-red-500 incident-node-pulse",
      label: "CRIT",
    },
    down: {
      box: "border-gray-300 bg-gray-100 dark:border-white/15 dark:bg-white/[0.04]",
      dot: "bg-gray-400",
      label: "DOWN",
    },
  };

  return (
    <IncidentPanel
      title="Topology"
      subtitle={`${orderedServices.length} nodes`}
      bodyClassName="flex min-h-0 flex-col items-center justify-center overflow-y-auto p-2"
    >
      {orderedServices.length > 0 ? (
        <div className="flex w-full max-w-xs flex-col items-stretch gap-0.5">
          {orderedServices.map((service, idx) => {
            const s = statusStyles[service.status] ?? statusStyles.down;
            return (
              <div key={service.id} className="flex flex-col items-center">
                <div
                  className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 ${s.box}`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Activity className="h-4 w-4 shrink-0 opacity-70" />
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[11px] font-semibold text-black dark:text-white">
                        {service.name}
                      </p>
                      <p className="font-mono text-[9px] text-gray-500">
                        {s.label}
                      </p>
                    </div>
                  </div>
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`} />
                </div>
                {idx < orderedServices.length - 1 && (
                  <span className="my-0.5 font-mono text-[10px] text-gray-300 dark:text-white/25">
                    ↓
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="font-mono text-[10px] text-gray-500">No services</p>
      )}
    </IncidentPanel>
  );
}
