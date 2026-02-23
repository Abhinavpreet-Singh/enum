"use client";

import { useRef, useEffect } from "react";
import {
  Terminal,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import type { SimulationStatus } from "@/types/simulation";

interface ConsolePanelProps {
  output: string[];
  status: SimulationStatus;
  onClear: () => void;
}

export default function ConsolePanel({
  output,
  status,
  onClear,
}: ConsolePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new output
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  const statusIndicator = () => {
    switch (status) {
      case "running":
        return (
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <Loader2 className="w-3 h-3 animate-spin" />
            Running…
          </span>
        );
      case "success":
        return (
          <span className="flex items-center gap-1.5 text-xs text-green-600">
            <CheckCircle2 className="w-3 h-3" />
            Exited with code 0
          </span>
        );
      case "error":
        return (
          <span className="flex items-center gap-1.5 text-xs text-red-600">
            <XCircle className="w-3 h-3" />
            Exited with error
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
            Console
          </span>
          {statusIndicator()}
        </div>
        <button
          onClick={onClear}
          className="p-1 text-gray-400 hover:text-gray-700 transition-colors rounded"
          title="Clear console"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Output */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2 font-mono text-xs leading-5 bg-white"
      >
        {output.length === 0 ? (
          <p className="text-gray-400 select-none">
            Console output will appear here…
          </p>
        ) : (
          output.map((line, idx) => {
            let lineClass = "text-gray-700";
            if (line.startsWith("Error:") || line.startsWith("stderr:")) {
              lineClass = "text-red-600";
            } else if (line.startsWith("$")) {
              lineClass = "text-gray-500";
            } else if (line.startsWith("✓")) {
              lineClass = "text-green-600 font-medium";
            }

            return (
              <div key={idx} className={lineClass}>
                {line}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
