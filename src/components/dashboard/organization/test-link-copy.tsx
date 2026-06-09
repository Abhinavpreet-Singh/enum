"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { getTestLink } from "@/lib/test-link";

const panelBorder = "border border-black/20 dark:border-white/25";

export function TestLinkCopy({
  testCode,
  compact = false,
}: {
  testCode: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const link = getTestLink(testCode);

  async function copy(value: string, kind: "code" | "link") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            copy(testCode, "code");
          }}
          className={`${panelBorder} px-2 py-0.5 font-mono text-[9px] text-gray-500 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-colors`}
          title="Copy test code"
        >
          {copied === "code" ? <Check className="w-3 h-3 text-emerald-500" /> : testCode}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            copy(link, "link");
          }}
          className={`${panelBorder} p-1 text-gray-400 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-colors`}
          title="Copy test link"
        >
          {copied === "link" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>
    );
  }

  return (
    <div className={`${panelBorder} p-3 space-y-2 bg-black/[0.02] dark:bg-white/[0.02]`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[9px] uppercase tracking-wider text-gray-400">Test code</span>
        <button
          type="button"
          onClick={() => copy(testCode, "code")}
          className="flex items-center gap-1 font-mono text-xs font-bold text-black dark:text-white hover:opacity-70 transition-opacity"
        >
          {testCode}
          {copied === "code" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-gray-400" />}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <p className="flex-1 min-w-0 font-mono text-[10px] text-gray-500 truncate">{link}</p>
        <button
          type="button"
          onClick={() => copy(link, "link")}
          className={`shrink-0 ${panelBorder} px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-gray-500 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-colors`}
        >
          {copied === "link" ? "Copied!" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
