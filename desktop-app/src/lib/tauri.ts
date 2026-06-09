/**
 * Tauri bridge utilities.
 * All calls are safe to call in browser (non-Tauri) mode — they degrade
 * gracefully so the app can also be tested in a regular browser.
 */

export const isTauri = (): boolean =>
  typeof window !== "undefined" &&
  typeof (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ !== "undefined";

// ─── Dynamic Tauri imports (tree-shaken on web builds) ────────────────────────

async function tauriCore() {
  if (!isTauri()) return null;
  return import("@tauri-apps/api/core");
}

async function tauriWindow() {
  if (!isTauri()) return null;
  return import("@tauri-apps/api/window");
}

async function tauriOS() {
  if (!isTauri()) return null;
  return import("@tauri-apps/plugin-os");
}

// ─── Window control ───────────────────────────────────────────────────────────

export async function requestFullscreen(): Promise<void> {
  const mod = await tauriWindow();
  if (!mod) {
    document.documentElement.requestFullscreen?.().catch(() => {});
    return;
  }
  const win = mod.getCurrentWindow();
  await win.setFullscreen(true);
}

export async function exitFullscreen(): Promise<void> {
  const mod = await tauriWindow();
  if (!mod) {
    document.exitFullscreen?.().catch(() => {});
    return;
  }
  const win = mod.getCurrentWindow();
  await win.setFullscreen(false);
}

export async function setAlwaysOnTop(value: boolean): Promise<void> {
  const mod = await tauriWindow();
  if (!mod) return;
  const win = mod.getCurrentWindow();
  await win.setAlwaysOnTop(value);
}

export async function disableResize(): Promise<void> {
  const mod = await tauriWindow();
  if (!mod) return;
  const win = mod.getCurrentWindow();
  await win.setResizable(false);
}

export async function getMonitorCount(): Promise<number> {
  if (!isTauri()) return 1;
  const mod = await tauriWindow();
  if (!mod) return 1;
  const monitors = await mod.availableMonitors();
  return monitors.length;
}

// ─── OS & System info ────────────────────────────────────────────────────────

export async function getOSInfo(): Promise<{
  platform: string;
  version: string;
  arch: string;
}> {
  const mod = await tauriOS();
  if (!mod) return { platform: "web", version: "unknown", arch: "unknown" };
  const platform = await mod.platform();
  const version = await mod.version();
  const arch = await mod.arch();
  return { platform, version, arch };
}

// ─── Invoke Rust commands ────────────────────────────────────────────────────

export async function invokeCommand<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T | null> {
  const mod = await tauriCore();
  if (!mod) return null;
  return mod.invoke<T>(command, args);
}

// ─── Camera / Mic availability ───────────────────────────────────────────────

export async function checkCamera(): Promise<boolean> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some((d) => d.kind === "videoinput");
  } catch {
    return false;
  }
}

export async function checkMicrophone(): Promise<boolean> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some((d) => d.kind === "audioinput");
  } catch {
    return false;
  }
}

export async function checkNetworkReachability(url: string): Promise<boolean> {
  try {
    await fetch(url, { method: "HEAD", mode: "no-cors" });
    return true;
  } catch {
    return false;
  }
}
