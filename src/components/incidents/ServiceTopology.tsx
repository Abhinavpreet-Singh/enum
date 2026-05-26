"use client";

import { Activity } from "lucide-react";
import type { IncidentService } from "@/types/incident";

interface ServiceTopologyProps {
  services: IncidentService[];
}

export default function ServiceTopology({ services }: ServiceTopologyProps) {
  // Define the service flow: Frontend -> API -> Processing -> DB
  const serviceOrder = [
    "frontend",
    "api_gateway",
    "processing",
    "database",
    "cache",
  ];

  // Find services in the defined order
  const orderedServices = serviceOrder
    .map((id) => services.find((s) => s.id === id))
    .filter(Boolean) as IncidentService[];

  const getStatusColor = (status: IncidentService["status"]): string => {
    switch (status) {
      case "healthy":
        return "bg-green-100 border-green-300 text-green-700";
      case "degraded":
        return "bg-yellow-100 border-yellow-300 text-yellow-700";
      case "critical":
        return "bg-red-100 border-red-300 text-red-700";
      case "down":
        return "bg-gray-100 border-gray-300 text-gray-700";
      default:
        return "bg-gray-100 border-gray-300 text-gray-700";
    }
  };

  const getStatusBadge = (status: IncidentService["status"]): string => {
    switch (status) {
      case "healthy":
        return "✓ Healthy";
      case "degraded":
        return "⚠ Degraded";
      case "critical":
        return "✕ Critical";
      case "down":
        return "⊘ Down";
      default:
        return status;
    }
  };

  return (
    <div className="h-full flex flex-col p-4 bg-white">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Service Topology</h3>
        <p className="text-xs text-gray-600">System architecture & health</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        {orderedServices.length > 0 ? (
          <>
            {/* Services in vertical arrangement */}
            <div className="space-y-4 w-full">
              {orderedServices.map((service, idx) => (
                <div key={service.id} className="flex flex-col items-center">
                  {/* Service Box */}
                  <div
                    className={`w-full max-w-xs px-4 py-3 rounded-lg border-2 flex items-center justify-between ${getStatusColor(service.status)}`}
                  >
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      <div>
                        <p className="text-sm font-semibold">{service.name}</p>
                        <p className="text-xs opacity-75">
                          {getStatusBadge(service.status)}
                        </p>
                      </div>
                    </div>

                    {/* Status indicator light */}
                    <div
                      className={`w-3 h-3 rounded-full ${
                        service.status === "healthy"
                          ? "bg-green-500 animate-pulse"
                          : service.status === "degraded"
                            ? "bg-yellow-500 animate-pulse"
                            : service.status === "critical"
                              ? "bg-red-500 animate-pulse"
                              : "bg-gray-500"
                      }`}
                    />
                  </div>

                  {/* Arrow to next service */}
                  {idx < orderedServices.length - 1 && (
                    <div className="my-2 text-gray-400">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 14l-7 7m0 0l-7-7m7 7V3"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-gray-200 w-full">
              <p className="text-xs font-semibold text-gray-700 mb-2">
                Legend
              </p>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span>Healthy & Responsive</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  <span>Degraded Performance</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span>Critical / Failing</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p className="text-sm">No services configured</p>
          </div>
        )}
      </div>
    </div>
  );
}
