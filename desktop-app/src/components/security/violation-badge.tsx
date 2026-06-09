"use client";

import type { ViolationSeverity } from "@/types";

interface Props {
  count: number;
  level: ViolationSeverity;
}

export default function ViolationBadge({ count, level }: Props) {
  if (count === 0) return null;

  const colorMap: Record<ViolationSeverity, string> = {
    low: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    medium: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    high: "bg-red-500/10 text-red-400 border-red-500/30 animate-pulse",
  };

  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${colorMap[level]}`}
      title="Violations detected — all activity is logged"
    >
      <span>⚠</span>
      <span>
        {count} violation{count !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
