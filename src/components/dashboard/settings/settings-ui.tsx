"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export const panelBorder = "border border-black/20 dark:border-white/25";
export const panelSurface = `${panelBorder} bg-white/80 backdrop-blur-[2px] dark:bg-black/75`;
export const inputCls =
  "w-full border border-gray-300 dark:border-neutral-700 bg-white dark:bg-black px-3 py-2 font-mono text-xs text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
export const labelCls =
  "block font-mono text-[10px] tracking-[0.2em] text-gray-500 dark:text-gray-400 uppercase mb-1.5";
export const hintCls = "mt-1 font-mono text-[10px] text-gray-400 dark:text-gray-500";

export function SettingsPanel({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className={`${panelSurface} overflow-hidden`}>
      <div className="border-b border-black/10 px-5 py-4 dark:border-white/10 sm:px-6">
        <h2 className="font-mono text-sm font-bold text-black dark:text-white">{title}</h2>
        {description ? (
          <p className="mt-1 font-mono text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
            {description}
          </p>
        ) : null}
      </div>
      <div className="space-y-5 px-5 py-5 sm:px-6">{children}</div>
      {footer ? (
        <div className="border-t border-black/10 px-5 py-4 dark:border-white/10 sm:px-6">
          {footer}
        </div>
      ) : null}
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {hint ? <p className={hintCls}>{hint}</p> : null}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-black dark:bg-white" : "bg-gray-200 dark:bg-neutral-700"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow transition-transform ${
          checked
            ? "translate-x-4 bg-white dark:bg-black"
            : "translate-x-0 bg-white dark:bg-neutral-400"
        }`}
      />
    </button>
  );
}

export function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border border-black/10 px-4 py-3 dark:border-white/10">
      <div className="min-w-0">
        <p className="font-mono text-xs font-medium text-black dark:text-white">{title}</p>
        <p className="mt-0.5 font-mono text-[10px] leading-relaxed text-gray-500 dark:text-gray-400">
          {description}
        </p>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export function SaveButton({
  onClick,
  saving,
  label = "Save changes",
}: {
  onClick: () => void;
  saving?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="inline-flex items-center justify-center border border-black bg-black px-4 py-2 font-mono text-[10px] tracking-[0.2em] text-white uppercase transition-colors hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-100"
    >
      {saving ? "Saving…" : label}
    </button>
  );
}

export function StatusBadge({
  tone,
  children,
}: {
  tone: "success" | "warning" | "danger" | "neutral";
  children: ReactNode;
}) {
  const tones = {
    success: "border-emerald-400/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400",
    warning: "border-amber-400/40 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400",
    danger: "border-red-400/40 bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400",
    neutral: "border-gray-300 bg-gray-50 text-gray-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-gray-300",
  };

  return (
    <span
      className={`inline-flex items-center border px-2 py-0.5 font-mono text-[9px] tracking-wider uppercase ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function SettingsTabButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 border px-3 py-2.5 text-left font-mono text-xs tracking-wide transition-colors ${
        active
          ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
          : "border-transparent text-gray-500 hover:border-black/15 hover:bg-black/3 dark:text-gray-400 dark:hover:border-white/15 dark:hover:bg-white/4"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </button>
  );
}

export function MessageBanner({
  tone,
  children,
}: {
  tone: "success" | "error" | "info";
  children: ReactNode;
}) {
  const tones = {
    success: "border-emerald-400/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400",
    error: "border-red-400/40 bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400",
    info: "border-sky-400/40 bg-sky-50 text-sky-700 dark:bg-sky-950/20 dark:text-sky-400",
  };

  return (
    <div className={`border px-4 py-3 font-mono text-[11px] ${tones[tone]}`}>{children}</div>
  );
}
