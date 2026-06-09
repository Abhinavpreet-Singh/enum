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

  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-mono font-semibold tabular-nums transition-all ${
        critical
          ? "bg-red-500/20 text-red-400 border border-red-500/30"
          : "bg-white/5 text-white border border-white/10"
      }`}
    >
      <span>⏱</span>
      {h > 0 && <span>{pad(h)}:</span>}
      <span>{pad(m)}:{pad(s)}</span>
    </div>
  );
}
