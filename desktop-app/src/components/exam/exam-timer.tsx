"use client";

interface Props {
  seconds: number;
  onExpire?: () => void;
}

export default function ExamTimer({ seconds }: Props) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");
  const critical = seconds < 300; // < 5 minutes
  const warning = seconds < 600; // < 10 minutes

  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold tabular-nums transition-all ${
        critical
          ? "border border-red-200 bg-red-50 text-red-600 dark:border-red-400/25 dark:bg-red-400/10 dark:text-red-200"
          : warning
          ? "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200"
          : "border border-black/10 bg-white text-gray-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300"
      }`}
      style={{ fontFamily: "var(--font-geist-mono), monospace", letterSpacing: "0.04em" }}
    >
      {critical && <span className="animate-pulse">●</span>}
      {h > 0 && <span>{pad(h)}:</span>}
      <span>{pad(m)}:{pad(s)}</span>
    </div>
  );
}
