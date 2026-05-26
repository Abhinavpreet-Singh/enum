"use client";

import type { MouseEvent, ReactNode } from "react";

export function IncidentPanel({
  title,
  subtitle,
  children,
  className = "",
  bodyClassName = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div
      className={`flex h-full min-h-0 flex-col bg-white dark:bg-black ${className}`}
    >
      <div className="flex shrink-0 items-baseline justify-between gap-2 border-b border-gray-200 px-2 py-1 dark:border-white/10">
        <h3 className="font-mono text-[9px] font-semibold uppercase tracking-wider text-black dark:text-white">
          {title}
        </h3>
        {subtitle ? (
          <p className="shrink-0 font-mono text-[9px] text-gray-500 dark:text-gray-500">
            {subtitle}
          </p>
        ) : null}
      </div>
      <div
        className={`min-h-0 flex-1 overflow-hidden ${bodyClassName || "p-2"}`}
      >
        {children}
      </div>
    </div>
  );
}

export function ResizeHandleCol({
  onMouseDown,
  active,
}: {
  onMouseDown: (e: MouseEvent) => void;
  active?: boolean;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      className={`w-px shrink-0 cursor-col-resize transition-colors ${
        active
          ? "bg-black dark:bg-white"
          : "bg-gray-200 hover:bg-gray-400 dark:bg-white/10 dark:hover:bg-white/30"
      }`}
      onMouseDown={onMouseDown}
    />
  );
}

export function ResizeHandleRow({
  onMouseDown,
  active,
}: {
  onMouseDown: (e: MouseEvent) => void;
  active?: boolean;
}) {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={`h-px shrink-0 cursor-row-resize transition-colors ${
        active
          ? "bg-black dark:bg-white"
          : "bg-gray-200 hover:bg-gray-400 dark:bg-white/10 dark:hover:bg-white/30"
      }`}
      onMouseDown={onMouseDown}
    />
  );
}

export function startDragResize(
  onMove: (e: MouseEvent) => void,
  onEnd?: () => void,
) {
  return (e: MouseEvent) => {
    e.preventDefault();
    document.body.classList.add("resize-active");

    const onMouseMove = (ev: MouseEvent) => onMove(ev);
    const onMouseUp = () => {
      document.body.classList.remove("resize-active");
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      onEnd?.();
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };
}
