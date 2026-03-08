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

function makeDragHandler(component: SystemComponent) {
  return function onDragStart(event: DragEvent<HTMLDivElement>) {
    event.dataTransfer.setData(
      "application/reactflow",
      JSON.stringify({
        componentId: component.id,
        label: component.label,
        icon: component.icon,
        config: component.config,
      }),
    );
    event.dataTransfer.effectAllowed = "move";
  };
}

/** Compact chip used in horizontal palette strip */
function PaletteChip({ component }: { component: SystemComponent }) {
  const Icon = ICON_MAP[component.icon] ?? Server;
  return (
    <div
      draggable
      onDragStart={makeDragHandler(component)}
      title={component.description}
      className="flex items-center gap-1.5 px-2.5 py-1.5 shrink-0 cursor-grab active:cursor-grabbing select-none
                 border border-gray-200 dark:border-white/25 bg-white dark:bg-white/8
                 text-gray-800 dark:text-white font-mono text-[10px]
                 hover:border-blue-400 dark:hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400
                 transition-all duration-150"
    >
      <Icon size={12} />
      {component.label}
    </div>
  );
}

/** Full card used in the vertical sidebar */
function ComponentCard({ component }: { component: SystemComponent }) {
  const Icon = ICON_MAP[component.icon] ?? Server;
  return (
    <div
      draggable
      onDragStart={makeDragHandler(component)}
      className="flex items-center gap-3 p-3 border border-gray-200 dark:border-white/8
                 bg-white dark:bg-white/3 cursor-grab active:cursor-grabbing
                 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/5
                 transition-all duration-150 select-none"
      title={component.description}
    >
      <div className="flex items-center justify-center w-8 h-8 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
        <Icon size={17} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
          {component.label}
        </p>
        <p className="text-[10px] font-mono text-gray-400 dark:text-gray-500 truncate">
          {component.description}
        </p>
      </div>
    </div>
  );
}

export default function ComponentSidebar({
  horizontal = false,
}: {
  horizontal?: boolean;
}) {
  if (horizontal) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-white/20 bg-white dark:bg-[#141414] overflow-x-auto shrink-0 scrollbar-none">
        <span className="font-mono text-[9px] tracking-[0.2em] text-gray-400 dark:text-gray-400 uppercase shrink-0 mr-1">
          Components
        </span>
        {SYSTEM_COMPONENTS.map((component) => (
          <PaletteChip key={component.id} component={component} />
        ))}
        <span className="font-mono text-[9px] text-gray-400 dark:text-gray-500 shrink-0 ml-1">
          ← drag to canvas
        </span>
      </div>
    );
  }

  return (
    <aside className="w-56 h-full border-r border-gray-200 dark:border-white/8 bg-gray-50 dark:bg-[#111] flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-white/8 shrink-0">
        <p className="font-mono text-[9px] tracking-[0.3em] text-gray-400 uppercase">
          Components
        </p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
          Drag onto canvas
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {SYSTEM_COMPONENTS.map((component) => (
          <ComponentCard key={component.id} component={component} />
        ))}
      </div>
    </aside>
  );
}
