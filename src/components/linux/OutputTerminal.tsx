"use client";

import { CircleCheck, CircleX, Loader2, Terminal } from "lucide-react";

interface OutputTerminalProps {
  status: "idle" | "running" | "passed" | "failed" | "error";
  outputLines: string[];
  expectedOutput?: string | null;
  actualOutput?: string | null;
}

const statusMeta = {
  idle: { label: "READY", Icon: Terminal, tone: "text-gray-500" },
  running: { label: "RUNNING", Icon: Loader2, tone: "text-amber-400" },
  passed: { label: "PASSED", Icon: CircleCheck, tone: "text-emerald-500" },
  failed: { label: "FAILED", Icon: CircleX, tone: "text-red-500" },
  error: { label: "ERROR", Icon: CircleX, tone: "text-red-500" },
} as const;

export default function OutputTerminal({
  status,
  outputLines,
  expectedOutput,
  actualOutput,
}: OutputTerminalProps) {
  const meta = statusMeta[status];
  const Icon = meta.Icon;

  return (
    <div className="flex flex-col h-full border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-4 py-2 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#111] shrink-0">
        <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.28em] uppercase text-gray-400">
          <Icon
            className={`w-3.5 h-3.5 ${status === "running" ? "animate-spin" : ""} ${meta.tone}`}
          />
          {meta.label}
        </div>
        <div className="font-mono text-[10px] text-gray-400">Bash stdout</div>
      </div>

      <div className="flex-1 min-h-0 p-3 lg:p-4 flex flex-col gap-3 overflow-y-auto">
        <div className="flex-1 min-h-[100px] overflow-auto rounded border border-gray-200 dark:border-white/10 bg-black text-white dark:bg-black px-3 py-3 font-mono text-sm leading-relaxed dark-scrollbar">
          <pre className="whitespace-pre-wrap wrap-break-word">
            {outputLines.join("\n")}
          </pre>
        </div>

        {(expectedOutput !== undefined || actualOutput !== undefined) && (
          <div className="grid gap-2 md:grid-cols-2 font-mono text-xs shrink-0">
            <div className="border border-gray-200 dark:border-white/10 px-2.5 py-2 bg-gray-50 dark:bg-white/5 min-w-0">
              <p className="tracking-[0.22em] uppercase text-gray-400 mb-1">
                Expected
              </p>
              <pre className="whitespace-pre-wrap wrap-break-word text-gray-700 dark:text-gray-300 leading-relaxed max-h-28 overflow-auto dark-scrollbar">
                {expectedOutput ?? ""}
              </pre>
            </div>
            <div className="border border-gray-200 dark:border-white/10 px-2.5 py-2 bg-gray-50 dark:bg-white/5 min-w-0">
              <p className="tracking-[0.22em] uppercase text-gray-400 mb-1">
                Actual
              </p>
              <pre className="whitespace-pre-wrap wrap-break-word text-gray-700 dark:text-gray-300 leading-relaxed max-h-28 overflow-auto dark-scrollbar">
                {actualOutput ?? ""}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
