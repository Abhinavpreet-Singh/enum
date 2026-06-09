"use client";

import type { ViolationSeverity } from "@/types";

interface Props {
  count: number;
  level: ViolationSeverity;
}

export default function ViolationBadge({ count, level }: Props) {
  if (count === 0) return null;

  const colorMap: Record<ViolationSeverity, string> = {
    low: "border-amber-200 bg-amber-50 text-amber-700",
    medium: "border-orange-200 bg-orange-50 text-orange-600",
    high: "border-red-200 bg-red-50 text-red-600 animate-pulse",
  };

  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${colorMap[level]}`}
      title="Violations detected — all activity is logged"
    >
      <span>⚠</span>
      <span>{count}</span>
    </div>
  );
}
