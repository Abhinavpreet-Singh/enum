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
        relative px-4 py-3 rounded-xl border-2 min-w-[140px]
        bg-white dark:bg-gray-800 shadow-md
        transition-all duration-150
        ${
          selected
            ? "border-blue-500 ring-2 ring-blue-300 dark:ring-blue-700"
            : "border-gray-200 dark:border-gray-600"
        }
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white dark:!border-gray-800"
      />

      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {data.label}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            {data.componentId}
          </p>
        </div>
      </div>

      {/* Config preview badges */}
      <div className="mt-2 flex flex-wrap gap-1">
        {Object.entries(data.config)
          .slice(0, 3)
          .map(([key, val]) => (
            <span
              key={key}
              className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
            >
              {key}: {String(val)}
            </span>
          ))}
      </div>

      {selected && (
        <button
          className="absolute -top-2 -right-2 p-1 rounded-full bg-blue-500 text-white shadow-lg hover:bg-blue-600 transition-colors"
          title="Configure"
        >
          <Settings size={12} />
        </button>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white dark:!border-gray-800"
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
