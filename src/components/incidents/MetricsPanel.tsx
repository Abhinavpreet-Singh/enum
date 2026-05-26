"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { IncidentSimulation, IncidentSessionState } from "@/types/incident";

interface MetricsPanelProps {
  incident: IncidentSimulation;
  state: IncidentSessionState;
}

export default function MetricsPanel({
  incident,
  state,
}: MetricsPanelProps) {
  // Prepare data for the chart - combine all metrics into a single dataset
  const chartData: Record<string, any>[] = [];

  // Get all timestamps
  const allTimestamps = new Set<number>();
  for (const metricHistory of Object.values(state.metrics || {})) {
    if (Array.isArray(metricHistory)) {
      metricHistory.forEach((snapshot: any) => {
        allTimestamps.add(snapshot.timestamp);
      });
    }
  }

  // Sort timestamps
  const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

  // Build chart data
  for (const timestamp of sortedTimestamps) {
    const dataPoint: Record<string, any> = { time: timestamp };

    for (const [metricName, history] of Object.entries(state.metrics || {})) {
      if (Array.isArray(history)) {
        const snapshot = history.find((s: any) => s.timestamp === timestamp);
        dataPoint[metricName] = snapshot?.value ?? null;
      }
    }

    chartData.push(dataPoint);
  }

  // Add current time if not already there
  if (chartData.length === 0 || chartData[chartData.length - 1].time !== state.currentTime) {
    const lastPoint: Record<string, any> = { time: state.currentTime };
    for (const [metricName, history] of Object.entries(state.metrics || {})) {
      if (Array.isArray(history) && history.length > 0) {
        lastPoint[metricName] = history[history.length - 1].value;
      }
    }
    chartData.push(lastPoint);
  }

  const getMetricColor = (metricName: string): string => {
    switch (metricName) {
      case "cpu_usage":
        return "#ef4444"; // Red
      case "error_rate":
        return "#f97316"; // Orange
      case "latency_ms":
        return "#eab308"; // Yellow
      case "requests_per_sec":
        return "#3b82f6"; // Blue
      default:
        return "#8b5cf6"; // Purple
    }
  };

  return (
    <div className="h-full flex flex-col p-4 bg-white">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">System Metrics</h3>
        <p className="text-xs text-gray-600">Real-time performance indicators</p>
      </div>

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${value}s`}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #4b5563",
                borderRadius: "0.375rem",
                color: "#f3f4f6",
              }}
              labelStyle={{ color: "#f3f4f6" }}
              formatter={(value: any) => {
                if (typeof value === "number") {
                  return value.toFixed(1);
                }
                return value;
              }}
              labelFormatter={(value) => `Time: ${value}s`}
            />
            <Legend />
            {Object.keys(state.metrics || {}).map((metricName) => (
              <Line
                key={metricName}
                type="monotone"
                dataKey={metricName}
                stroke={getMetricColor(metricName)}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <p className="text-sm">No metrics data yet</p>
        </div>
      )}
    </div>
  );
}
