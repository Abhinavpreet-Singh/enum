"use client";

import type { IncidentSessionState } from "@/types/incident";
import {
  METRIC_LABELS,
  currentMetricValue,
  formatMetricValue,
  metricSeverity,
  normalizeMetricSeries,
} from "./metrics-utils";

interface MetricsPanelProps {
  state: IncidentSessionState;
}

function Sparkline({
  points,
  severity,
}: {
  points: { timestamp: number; value: number }[];
  severity: "ok" | "warn" | "crit";
}) {
  if (points.length < 2) {
    return (
      <div className="h-6 w-full rounded bg-gray-100 dark:bg-white/[0.04]" />
    );
  }

  const w = 100;
  const h = 24;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p.value - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  const stroke =
    severity === "crit"
      ? "rgb(239,68,68)"
      : severity === "warn"
        ? "rgb(245,158,11)"
        : "rgb(16,185,129)";

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-6 w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={coords}
      />
    </svg>
  );
}

export default function MetricsPanel({ state }: MetricsPanelProps) {
  const metricNames = Object.keys(state.metrics || {});

  if (metricNames.length === 0) {
    return null;
  }

  const severityText = {
    ok: "text-emerald-600 dark:text-emerald-400",
    warn: "text-amber-600 dark:text-amber-400",
    crit: "text-red-600 dark:text-red-400",
  };

  return (
    <div className="shrink-0 border-b border-gray-200 bg-white px-2 py-1.5 dark:border-white/10 dark:bg-black">
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Metrics
        </span>
        <span className="font-mono text-[9px] text-gray-400">t={state.currentTime}s</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {metricNames.map((name) => {
          const series = normalizeMetricSeries(state.metrics, name);
          const value = currentMetricValue(series);
          const severity = metricSeverity(name, value);

          return (
            <div
              key={name}
              className="rounded border border-gray-200 bg-gray-50/80 px-2 py-1 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <p className="font-mono text-[8px] uppercase tracking-wider text-gray-500 dark:text-gray-500">
                {METRIC_LABELS[name] || name}
              </p>
              <p
                className={`font-mono text-sm font-semibold leading-tight ${severityText[severity]}`}
              >
                {formatMetricValue(name, value)}
              </p>
              <Sparkline points={series} severity={severity} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
