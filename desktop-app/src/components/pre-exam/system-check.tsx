"use client";

import { useEffect, useState } from "react";
import type { SystemCheckItem, SystemCheckResult, AssessmentSettings } from "@/types";
import {
  checkCamera,
  checkMicrophone,
  checkNetworkReachability,
  getMonitorCount,
  getOSInfo,
  invokeCommand,
  isTauri,
} from "@/lib/tauri";

const BACKEND_HEALTH =
  (process.env.NEXT_PUBLIC_BACKEND_URL || "https://enum-backend.onrender.com") +
  "/health";

interface Props {
  settings: AssessmentSettings;
  onComplete: (result: SystemCheckResult) => void;
}

export default function SystemCheck({ settings, onComplete }: Props) {
  const [items, setItems] = useState<SystemCheckItem[]>([]);
  const [done, setDone] = useState(false);

  const update = (id: string, patch: Partial<SystemCheckItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  useEffect(() => {
    const list: SystemCheckItem[] = [
      { id: "internet", label: "Internet Connection", status: "checking", required: true },
      { id: "backend", label: "Backend Reachability", status: "checking", required: true },
      { id: "os", label: "Operating System", status: "checking", required: false },
      { id: "cpu", label: "CPU / Hardware", status: "checking", required: false },
    ];

    if (settings.requireWebcam || settings.recordWebcam) {
      list.push({ id: "camera", label: "Camera Detection", status: "checking", required: settings.requireWebcam });
    }
    if (settings.requireMicrophone || settings.recordAudio) {
      list.push({ id: "mic", label: "Microphone Detection", status: "checking", required: settings.requireMicrophone });
    }
    if (settings.disableMultiMonitor) {
      list.push({ id: "monitors", label: "Display Count", status: "checking", required: true });
    }
    if (settings.vmDetection) {
      list.push({ id: "vm", label: "VM Detection", status: "checking", required: true });
    }
    if (settings.remoteDesktopDetection) {
      list.push({ id: "rdp", label: "Remote Desktop Detection", status: "checking", required: true });
    }
    if (settings.requireDesktopApp) {
      list.push({ id: "desktop_app", label: "Desktop App Verification", status: "checking", required: true });
    }

    setItems(list);
    runChecks(list, update, settings, setDone, onComplete);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const blocking = items.filter((i) => i.status === "fail" && i.required);

  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <CheckRow key={item.id} item={item} />
      ))}

      {done && (
        <div className="mt-5">
          {blocking.length > 0 ? (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-400/25 dark:bg-red-400/10 dark:text-red-200">
              <span className="mt-0.5 shrink-0">!</span>
              <div>
                <span className="font-semibold">Cannot proceed.</span>{" "}
                {blocking.length} required check{blocking.length > 1 ? "s" : ""} failed.
                Please resolve the issues above.
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200">
              <span className="shrink-0">✓</span>
              <span>All required checks passed. You may proceed.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CheckRow({ item }: { item: SystemCheckItem }) {
  const statusConfig = {
    pending: { icon: "○", className: "text-gray-300" },
    checking: { icon: "◌", className: "text-gray-400 animate-pulse" },
    pass: { icon: "✓", className: "text-green-600" },
    fail: { icon: "✕", className: "text-red-600" },
    warn: { icon: "⚠", className: "text-amber-600" },
  } as const;

  const cfg = statusConfig[item.status];

  return (
    <div className="flex items-center gap-3 rounded-xl border border-black/8 bg-white px-4 py-3 shadow-sm transition-colors dark:border-white/10 dark:bg-white/[0.04]">
      <span
        className={`w-4 shrink-0 text-center text-xs font-mono ${cfg.className}`}
      >
        {cfg.icon}
      </span>
      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
      {item.message && (
        <span
          className="text-xs text-gray-400 dark:text-gray-500"
          style={{ fontFamily: "var(--font-geist-mono), monospace" }}
        >
          {item.message}
        </span>
      )}
      {item.required && item.status === "fail" && (
        <span className="rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 text-xs text-red-600 dark:border-red-400/25 dark:bg-red-400/10 dark:text-red-200">
          Required
        </span>
      )}
    </div>
  );
}

// ─── Run all checks ───────────────────────────────────────────────────────────

async function runChecks(
  list: SystemCheckItem[],
  update: (id: string, patch: Partial<SystemCheckItem>) => void,
  settings: AssessmentSettings,
  setDone: (v: boolean) => void,
  onComplete: (r: SystemCheckResult) => void,
) {
  const ids = list.map((i) => i.id);
  const finalItems: SystemCheckItem[] = [...list];

  const set = (id: string, patch: Partial<SystemCheckItem>) => {
    const idx = finalItems.findIndex((i) => i.id === id);
    if (idx >= 0) finalItems[idx] = { ...finalItems[idx], ...patch };
    update(id, patch);
  };

  if (ids.includes("internet")) {
    const ok = navigator.onLine;
    set("internet", ok ? { status: "pass", message: "Connected" } : { status: "fail", message: "No connection" });
  }

  if (ids.includes("backend")) {
    const ok = await checkNetworkReachability(BACKEND_HEALTH);
    set("backend", ok
      ? { status: "pass", message: "Reachable" }
      : { status: "warn", message: "Offline — exam will continue locally" });
  }

  if (ids.includes("os")) {
    const info = await getOSInfo();
    set("os", { status: "pass", message: `${info.platform} ${info.version} (${info.arch})` });
  }

  if (ids.includes("cpu")) {
    if (isTauri()) {
      const sysInfo = await invokeCommand<{
        os: string;
        os_version: string;
        arch: string;
        cpu_count: number;
        hostname: string;
      }>("get_system_info");
      if (sysInfo) {
        set("cpu", {
          status: "pass",
          message: `${sysInfo.cpu_count} core${sysInfo.cpu_count !== 1 ? "s" : ""} · ${sysInfo.hostname}`,
        });
      } else {
        set("cpu", { status: "warn", message: "Unable to read hardware info" });
      }
    } else {
      set("cpu", { status: "warn", message: "Running in browser" });
    }
  }

  if (ids.includes("camera")) {
    const ok = await checkCamera();
    set("camera", ok
      ? { status: "pass", message: "Detected" }
      : { status: settings.requireWebcam ? "fail" : "warn", message: "Not detected" });
  }

  if (ids.includes("mic")) {
    const ok = await checkMicrophone();
    set("mic", ok
      ? { status: "pass", message: "Detected" }
      : { status: settings.requireMicrophone ? "fail" : "warn", message: "Not detected" });
  }

  if (ids.includes("monitors")) {
    const count = await getMonitorCount();
    set("monitors", count > 1
      ? { status: "fail", message: `${count} monitors — disconnect extra displays` }
      : { status: "pass", message: "Single display" });
  }

  if (ids.includes("vm")) {
    const isVM = isTauri() ? await invokeCommand<boolean>("detect_vm") : false;
    set("vm", isVM
      ? { status: "fail", message: "VM environment detected" }
      : { status: "pass", message: "No VM detected" });
  }

  if (ids.includes("rdp")) {
    const isRDP = isTauri() ? await invokeCommand<boolean>("detect_remote_desktop") : false;
    set("rdp", isRDP
      ? { status: "fail", message: "Remote desktop session detected" }
      : { status: "pass", message: "No remote session" });
  }

  if (ids.includes("desktop_app")) {
    const ok = isTauri();
    set("desktop_app", ok
      ? { status: "pass", message: "ENUM Desktop Client" }
      : {
          status: "fail",
          message: "This test requires the ENUM Desktop Client. Turn off “Require Desktop App” in security settings to use the web browser.",
        });
  }

  setDone(true);
  const canProceed = !finalItems.some((i) => i.status === "fail" && i.required);
  onComplete({ items: finalItems, canProceed });
}
