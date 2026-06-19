"use client";

import type { ViolationSeverity } from "@/types";

interface Props {
  count: number;
  level: ViolationSeverity;
}

export default function ViolationBadge({ count, level }: Props) {
  if (count === 0) return null;

  const colorMap: Record<ViolationSeverity, string> = {
    low: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200",
    medium: "border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-400/25 dark:bg-orange-400/10 dark:text-orange-200",
    high: "border-red-200 bg-red-50 text-red-600 animate-pulse dark:border-red-400/25 dark:bg-red-400/10 dark:text-red-200",
  };

  return (
    <div
      className={`flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs font-medium ${colorMap[level]}`}
      title="Violations detected — all activity is logged"
    >
      <span>⚠</span>
      <span>{count}</span>
    </div>
  );
}
