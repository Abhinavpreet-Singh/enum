import type { IncidentMetricSnapshot, IncidentMetrics } from "@/types/incident";

export function normalizeMetricSeries(
  metrics: IncidentMetrics | Record<string, unknown> | undefined,
  metricName: string,
): IncidentMetricSnapshot[] {
  const raw = metrics?.[metricName];
  if (Array.isArray(raw)) {
    return raw.filter(
      (p): p is IncidentMetricSnapshot =>
        p != null && typeof p.timestamp === "number" && typeof p.value === "number",
    );
  }
  if (typeof raw === "number") {
    return [{ timestamp: 0, value: raw }];
  }
  return [];
}

export function currentMetricValue(series: IncidentMetricSnapshot[]): number {
  return series[series.length - 1]?.value ?? 0;
}

export const METRIC_LABELS: Record<string, string> = {
  cpu_usage: "CPU",
  error_rate: "Errors",
  latency_ms: "Latency",
  requests_per_sec: "RPS",
};

export function formatMetricValue(name: string, value: number): string {
  if (name === "cpu_usage" || name === "error_rate") {
    return `${value.toFixed(name === "error_rate" && value < 10 ? 1 : 0)}%`;
  }
  if (name === "latency_ms") {
    return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;
  }
  if (name === "requests_per_sec") {
    return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${Math.round(value)}`;
  }
  return value.toFixed(1);
}

export function metricSeverity(
  name: string,
  value: number,
): "ok" | "warn" | "crit" {
  switch (name) {
    case "cpu_usage":
      if (value >= 85) return "crit";
      if (value >= 60) return "warn";
      return "ok";
    case "error_rate":
      if (value >= 25) return "crit";
      if (value >= 5) return "warn";
      return "ok";
    case "latency_ms":
      if (value >= 2000) return "crit";
      if (value >= 500) return "warn";
      return "ok";
    case "requests_per_sec":
      if (value <= 500) return "crit";
      if (value <= 2000) return "warn";
      return "ok";
    default:
      return "ok";
  }
}
