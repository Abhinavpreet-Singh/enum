"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import {
  Monitor,
  Split,
  Server,
  Database,
  Zap,
  Mail,
  Globe,
  Settings,
} from "lucide-react";
import type { SystemDesignNodeData } from "@/systemDesign";

const ICON_MAP: Record<string, React.ElementType> = {
  monitor: Monitor,
  split: Split,
  server: Server,
  database: Database,
  zap: Zap,
  mail: Mail,
  globe: Globe,
};

interface ArchNodeProps extends NodeProps<SystemDesignNodeData> {
  onConfigure?: (nodeId: string) => void;
}

function ArchitectureNode({ id, data, selected }: ArchNodeProps) {
  const Icon = ICON_MAP[data.icon] ?? Server;

  return (
    <div
      className={`
        relative px-3 py-2.5 min-w-32
        bg-white dark:bg-[#202020]
        transition-all duration-150
        border
        ${
          selected
            ? "border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.2)]"
            : "border-gray-200 dark:border-white/25"
        }
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-2.5! h-2.5! bg-blue-500! border-2! border-white! dark:border-[#202020]!"
      />

      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-7 h-7 bg-blue-500/10 dark:bg-blue-400/15 text-blue-600 dark:text-blue-400">
          <Icon size={15} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900 dark:text-white truncate leading-tight">
            {data.label}
          </p>
          <p className="text-[9px] font-mono text-gray-400 dark:text-gray-400 mt-0.5">
            {data.componentId}
          </p>
        </div>
      </div>

      {Object.keys(data.config).length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-white/15 flex flex-wrap gap-1">
          {Object.entries(data.config)
            .slice(0, 3)
            .map(([key, val]) => (
              <span
                key={key}
                className="inline-flex items-center text-[9px] px-1.5 py-0.5 bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-white/20 text-gray-700 dark:text-white font-mono"
              >
                {key}: {String(val)}
              </span>
            ))}
        </div>
      )}

      {selected && (
        <button
          className="absolute -top-2.5 -right-2.5 p-1 bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-sm"
          title="Configure"
        >
          <Settings size={11} />
        </button>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2.5! h-2.5! bg-blue-500! border-2! border-white! dark:border-[#202020]!"
      />
    </div>
  );
}

// Export specialized node wrappers — all use the same renderer.
export const ClientNode = memo(ArchitectureNode);
export const ServerNodeComponent = memo(ArchitectureNode);
export const DatabaseNodeComponent = memo(ArchitectureNode);
export const CacheNode = memo(ArchitectureNode);
export const QueueNode = memo(ArchitectureNode);

// Map consumed by ReactFlow's `nodeTypes` prop.
export const NODE_TYPES = {
  client: ClientNode,
  load_balancer: memo(ArchitectureNode),
  api_server: ServerNodeComponent,
  database: DatabaseNodeComponent,
  cache: CacheNode,
  message_queue: QueueNode,
  cdn: memo(ArchitectureNode),
};
