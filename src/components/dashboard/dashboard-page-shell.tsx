import type { ReactNode } from "react";

const MAX_WIDTH: Record<string, string> = {
  full: "max-w-none",
  "7xl": "max-w-7xl",
  "6xl": "max-w-6xl",
};

export function DashboardPageShell({
  children,
  className = "",
  maxWidth = "6xl",
}: {
  children: ReactNode;
  className?: string;
  maxWidth?: keyof typeof MAX_WIDTH | "full" | "7xl" | "6xl";
}) {
  const mw = MAX_WIDTH[maxWidth] ?? MAX_WIDTH["6xl"];

  return (
    <div
      className={`mx-auto w-full min-w-0 max-w-full box-border pl-4 pr-6 py-6 sm:pl-6 sm:pr-8 sm:py-8 lg:pl-8 lg:pr-12 ${mw} ${className}`}
    >
      {children}
    </div>
  );
}

export function DashboardPageHeader({
  breadcrumb,
  title,
  description,
  children,
}: {
  breadcrumb?: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-6 border-b border-gray-200 pb-6 dark:border-white/10">
      {breadcrumb ? (
        <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-gray-400">
          {breadcrumb}
        </div>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-mono text-2xl font-bold tracking-tight text-black dark:text-white md:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
          ) : null}
        </div>
        {children ? <div className="shrink-0">{children}</div> : null}
      </div>
    </header>
  );
}
