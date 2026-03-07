"use client";

import React, { DragEvent } from "react";
import {
  Monitor,
  Split,
  Server,
  Database,
  Zap,
  Mail,
  Globe,
} from "lucide-react";
import { SYSTEM_COMPONENTS, SystemComponent } from "@/systemDesign";

const ICON_MAP: Record<string, React.ElementType> = {
  monitor: Monitor,
  split: Split,
  server: Server,
  database: Database,
  zap: Zap,
  mail: Mail,
  globe: Globe,
};

function ComponentCard({ component }: { component: SystemComponent }) {
  const Icon = ICON_MAP[component.icon] ?? Server;

  function onDragStart(event: DragEvent<HTMLDivElement>) {
    event.dataTransfer.setData(
      "application/reactflow",
      JSON.stringify({
        componentId: component.id,
        label: component.label,
        icon: component.icon,
        config: component.config,
      })
    );
    event.dataTransfer.effectAllowed = "move";
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 
                 bg-white dark:bg-gray-800 cursor-grab active:cursor-grabbing
                 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md
                 transition-all duration-150 select-none"
      title={component.description}
    >
      <div className="flex items-center justify-center w-9 h-9 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {component.label}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {component.description}
        </p>
      </div>
    </div>
  );
}

export default function ComponentSidebar() {
  return (
    <aside className="w-60 h-full border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Components
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Drag onto canvas
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {SYSTEM_COMPONENTS.map((component) => (
          <ComponentCard key={component.id} component={component} />
        ))}
      </div>
    </aside>
  );
}
