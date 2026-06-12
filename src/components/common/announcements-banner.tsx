"use client";

/**
 * Displays active platform announcements from the admin.
 * Fetches from /api/v1/platform/announcements and shows a dismissible banner per announcement.
 */
import { useEffect, useState } from "react";
import { proxy } from "@/app/proxy";
import { X, AlertTriangle, Info, Megaphone } from "lucide-react";

type Announcement = {
  id: string;
  title: string;
  body: string;
  type: "info" | "warning" | "critical";
  audience: string;
};

const TYPE_STYLES: Record<string, { bg: string; border: string; text: string; icon: typeof Info }> = {
  info: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-500/30",
    text: "text-blue-800 dark:text-blue-200",
    icon: Info,
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-500/30",
    text: "text-amber-800 dark:text-amber-200",
    icon: AlertTriangle,
  },
  critical: {
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-500/30",
    text: "text-red-800 dark:text-red-200",
    icon: Megaphone,
  },
};

const DISMISSED_KEY = "enum_dismissed_announcements";

function getDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveDismissed(ids: string[]) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
}

interface Props {
  audience?: string;
}

export function AnnouncementsBanner({ audience = "all" }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    setDismissed(getDismissed());
    fetch(`${proxy}/api/v1/platform/announcements?audience=${audience}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((json) => setAnnouncements(json.data ?? []))
      .catch(() => {});
  }, [audience]);

  const visible = announcements.filter((a) => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    saveDismissed(next);
  };

  return (
    <div className="space-y-2 px-4 pt-4 sm:px-6 lg:px-8">
      {visible.map((ann) => {
        const { bg, border, text, icon: Icon } = TYPE_STYLES[ann.type] ?? TYPE_STYLES.info;
        return (
          <div
            key={ann.id}
            className={`flex items-start gap-3 rounded border px-4 py-3 ${bg} ${border}`}
          >
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${text}`} />
            <div className="flex-1 min-w-0">
              <p className={`font-mono text-xs font-semibold ${text}`}>{ann.title}</p>
              {ann.body && (
                <p className={`mt-0.5 font-mono text-xs ${text} opacity-80`}>{ann.body}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(ann.id)}
              className={`shrink-0 ${text} opacity-60 hover:opacity-100 transition-opacity`}
              aria-label="Dismiss announcement"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
