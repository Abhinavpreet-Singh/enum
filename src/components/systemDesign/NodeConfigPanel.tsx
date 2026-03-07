"use client";

import React from "react";
import { X } from "lucide-react";
import type { SystemDesignNode, ComponentConfig } from "@/systemDesign";

interface NodeConfigPanelProps {
  node: SystemDesignNode | null;
  onConfigChange: (nodeId: string, config: ComponentConfig) => void;
  onClose: () => void;
}

// Mapping of componentId → fields with their input types.
const CONFIG_FIELDS: Record<
  string,
  { key: string; label: string; type: "number" | "text" | "boolean" | "select"; options?: string[] }[]
> = {
  api_server: [
    { key: "instances", label: "Instances", type: "number" },
    { key: "language", label: "Language", type: "select", options: ["node", "python", "java", "go", "rust"] },
    { key: "autoscaling", label: "Autoscaling", type: "boolean" },
  ],
  database: [
    { key: "type", label: "Type", type: "select", options: ["SQL", "NoSQL", "NewSQL", "Graph"] },
    { key: "replicas", label: "Replicas", type: "number" },
    { key: "sharding", label: "Sharding", type: "boolean" },
  ],
  cache: [
    { key: "type", label: "Type", type: "select", options: ["Redis", "Memcached"] },
    { key: "ttl", label: "TTL (s)", type: "number" },
    { key: "maxMemory", label: "Max Memory", type: "text" },
  ],
  load_balancer: [
    { key: "algorithm", label: "Algorithm", type: "select", options: ["round_robin", "least_connections", "ip_hash", "weighted"] },
    { key: "healthCheck", label: "Health Check", type: "boolean" },
  ],
  message_queue: [
    { key: "type", label: "Type", type: "select", options: ["Kafka", "RabbitMQ", "SQS", "Redis Streams"] },
    { key: "partitions", label: "Partitions", type: "number" },
    { key: "retentionHours", label: "Retention (hrs)", type: "number" },
  ],
  client: [
    { key: "type", label: "Type", type: "select", options: ["web", "mobile", "desktop", "IoT"] },
    { key: "protocol", label: "Protocol", type: "select", options: ["HTTPS", "HTTP", "WebSocket", "gRPC"] },
  ],
  cdn: [
    { key: "provider", label: "Provider", type: "select", options: ["Cloudflare", "AWS CloudFront", "Akamai", "Fastly"] },
    { key: "cachePolicy", label: "Cache Policy", type: "select", options: ["aggressive", "moderate", "minimal"] },
  ],
};

export default function NodeConfigPanel({
  node,
  onConfigChange,
  onClose,
}: NodeConfigPanelProps) {
  if (!node) return null;

  const fields = CONFIG_FIELDS[node.data.componentId] ?? [];
  const config = node.data.config;

  function update(key: string, value: string | number | boolean) {
    onConfigChange(node!.id, { ...config, [key]: value });
  }

  return (
    <aside className="w-72 h-full border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {node.data.label}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Configure component
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
        >
          <X size={16} />
        </button>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {fields.length === 0 && (
          <p className="text-xs text-gray-400">No configurable options.</p>
        )}

        {fields.map((field) => (
          <div key={field.key}>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {field.label}
            </label>

            {field.type === "boolean" && (
              <button
                onClick={() => update(field.key, !config[field.key])}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${config[field.key] ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 rounded-full bg-white transition-transform
                    ${config[field.key] ? "translate-x-6" : "translate-x-1"}
                  `}
                />
              </button>
            )}

            {field.type === "number" && (
              <input
                type="number"
                min={0}
                value={Number(config[field.key] ?? 0)}
                onChange={(e) =>
                  update(field.key, parseInt(e.target.value, 10) || 0)
                }
                className="w-full px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600
                           bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            )}

            {field.type === "text" && (
              <input
                type="text"
                value={String(config[field.key] ?? "")}
                onChange={(e) => update(field.key, e.target.value)}
                className="w-full px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600
                           bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            )}

            {field.type === "select" && field.options && (
              <select
                value={String(config[field.key] ?? "")}
                onChange={(e) => update(field.key, e.target.value)}
                className="w-full px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600
                           bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                {field.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
