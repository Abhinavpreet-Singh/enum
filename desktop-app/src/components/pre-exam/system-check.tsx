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
    <div className="space-y-2">
      {items.map((item) => (
        <CheckRow key={item.id} item={item} />
      ))}

      {done && (
        <div className="mt-6">
          {blocking.length > 0 ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              <strong>Cannot proceed.</strong> {blocking.length} required check
              {blocking.length > 1 ? "s" : ""} failed. Please resolve the issues above.
            </div>
          ) : (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-400">
              All required checks passed. You may proceed.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CheckRow({ item }: { item: SystemCheckItem }) {
  const iconMap = {
    pending: "○",
    checking: "◌",
    pass: "✓",
    fail: "✗",
    warn: "⚠",
  } as const;

  const colorMap = {
    pending: "text-gray-500",
    checking: "text-blue-400 animate-pulse",
    pass: "text-green-400",
    fail: "text-red-400",
    warn: "text-yellow-400",
  } as const;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/3 px-4 py-2.5">
      <span className={`font-mono text-sm ${colorMap[item.status]}`}>
        {iconMap[item.status]}
      </span>
      <span className="flex-1 text-sm text-white">{item.label}</span>
      {item.message && (
        <span className="text-xs text-gray-500">{item.message}</span>
      )}
      {item.required && item.status === "fail" && (
        <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-xs text-red-400">
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

  // Internet
  if (ids.includes("internet")) {
    const ok = navigator.onLine;
    set("internet", ok ? { status: "pass", message: "Connected" } : { status: "fail", message: "No connection" });
  }

  // Backend
  if (ids.includes("backend")) {
    const ok = await checkNetworkReachability(BACKEND_HEALTH);
    set("backend", ok ? { status: "pass", message: "Reachable" } : { status: "warn", message: "Offline — exam will continue locally" });
  }

  // OS
  if (ids.includes("os")) {
    const info = await getOSInfo();
    set("os", { status: "pass", message: `${info.platform} ${info.version} (${info.arch})` });
  }

  // CPU / Hardware (via Tauri native command)
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
      set("cpu", { status: "warn", message: "Running in browser (no native info)" });
    }
  }

  // Camera
  if (ids.includes("camera")) {
    const ok = await checkCamera();
    set("camera", ok ? { status: "pass", message: "Detected" } : { status: settings.requireWebcam ? "fail" : "warn", message: "Not detected" });
  }

  // Microphone
  if (ids.includes("mic")) {
    const ok = await checkMicrophone();
    set("mic", ok ? { status: "pass", message: "Detected" } : { status: settings.requireMicrophone ? "fail" : "warn", message: "Not detected" });
  }

  // Monitors
  if (ids.includes("monitors")) {
    const count = await getMonitorCount();
    set("monitors", count > 1 ? { status: "fail", message: `${count} monitors detected — disconnect extra displays` } : { status: "pass", message: "Single display" });
  }

  // VM
  if (ids.includes("vm")) {
    const isVM = isTauri() ? await invokeCommand<boolean>("detect_vm") : false;
    set("vm", isVM ? { status: "fail", message: "VM environment detected" } : { status: "pass", message: "No VM detected" });
  }

  // RDP
  if (ids.includes("rdp")) {
    const isRDP = isTauri() ? await invokeCommand<boolean>("detect_remote_desktop") : false;
    set("rdp", isRDP ? { status: "fail", message: "Remote desktop session detected" } : { status: "pass", message: "No remote session" });
  }

  // Desktop app
  if (ids.includes("desktop_app")) {
    const ok = isTauri();
    set("desktop_app", ok ? { status: "pass", message: "Running in Tauri" } : { status: "fail", message: "Must use the ENUM Desktop Client" });
  }

  setDone(true);
  const canProceed = !finalItems.some((i) => i.status === "fail" && i.required);
  onComplete({ items: finalItems, canProceed });
}
