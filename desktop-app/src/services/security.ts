/**
 * Security Engine — dynamically applies restrictions based on AssessmentSettings.
 * All behaviour is backend-driven; nothing is hardcoded.
 */
import type { AssessmentSettings, ViolationType } from "@/types";
import {
  requestFullscreen,
  getMonitorCount,
  invokeCommand,
  isTauri,
} from "@/lib/tauri";

type ViolationCallback = (type: ViolationType, description: string, severity: "low" | "medium" | "high") => void;

let onViolation: ViolationCallback | null = null;
let cleanupFns: (() => void)[] = [];

export function setViolationCallback(cb: ViolationCallback) {
  onViolation = cb;
}

function emit(type: ViolationType, desc: string, sev: "low" | "medium" | "high") {
  onViolation?.(type, desc, sev);
}

// ─── Apply security from settings ────────────────────────────────────────────

export async function applySecuritySettings(s: AssessmentSettings): Promise<void> {
  cleanupFns.forEach((fn) => fn());
  cleanupFns = [];

  if (s.forceFullscreen) {
    await requestFullscreen();
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        emit("fullscreen_exit", "Exited fullscreen mode.", "medium");
        requestFullscreen().catch(() => {});
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    cleanupFns.push(() =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange),
    );
  }

  if (s.disableMultiMonitor && isTauri()) {
    const count = await getMonitorCount();
    if (count > 1) {
      emit("multi_monitor", `${count} monitors detected.`, "high");
    }
  }

  if (s.devToolsDetection) {
    installDevToolsDetector();
  }

  if (s.copyPasteDetection) {
    installClipboardDetector();
  }

  installFocusDetector();

  if (s.typingPatternAnalysis) {
    installIdleDetector();
  }

  if (s.vmDetection && isTauri()) {
    const isVM = await invokeCommand<boolean>("detect_vm");
    if (isVM) {
      emit("vm_detected", "Virtual machine environment detected.", "high");
    }
  }

  if (s.remoteDesktopDetection && isTauri()) {
    const isRDP = await invokeCommand<boolean>("detect_remote_desktop");
    if (isRDP) {
      emit("remote_desktop_detected", "Remote desktop session detected.", "high");
    }
  }
}

// ─── DevTools detector ────────────────────────────────────────────────────────

function installDevToolsDetector() {
  const threshold = 160;
  let fired = false;

  const check = () => {
    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;
    if ((widthDiff > threshold || heightDiff > threshold) && !fired) {
      fired = true;
      emit("devtools_opened", "Developer tools may have been opened.", "high");
      setTimeout(() => (fired = false), 5000);
    }
  };

  const interval = setInterval(check, 1000);
  cleanupFns.push(() => clearInterval(interval));
}

// ─── Clipboard detector ───────────────────────────────────────────────────────

function installClipboardDetector() {
  const handleCopy = () =>
    emit("copy_detected", "Text copied to clipboard.", "medium");
  const handlePaste = () =>
    emit("paste_detected", "Content pasted from clipboard.", "high");

  document.addEventListener("copy", handleCopy);
  document.addEventListener("paste", handlePaste);
  cleanupFns.push(() => {
    document.removeEventListener("copy", handleCopy);
    document.removeEventListener("paste", handlePaste);
  });
}

function isClipboardAllowedTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest('[data-allow-clipboard="true"], .monaco-editor'))
  );
}

// ─── Focus detector ───────────────────────────────────────────────────────────

function installFocusDetector() {
  const handleBlur = () => {
    emit("tab_switch", "Window lost focus (possible tab switch).", "medium");
  };

  window.addEventListener("blur", handleBlur);
  cleanupFns.push(() => window.removeEventListener("blur", handleBlur));

  const handleResize = () => {
    emit("window_resize", "Browser window was resized.", "low");
  };
  window.addEventListener("resize", handleResize);
  cleanupFns.push(() => window.removeEventListener("resize", handleResize));
}

// ─── Idle detector ────────────────────────────────────────────────────────────

function installIdleDetector(idleThresholdMs = 120_000) {
  let lastActivity = Date.now();

  const resetTimer = () => { lastActivity = Date.now(); };

  document.addEventListener("mousemove", resetTimer);
  document.addEventListener("keydown", resetTimer);
  document.addEventListener("click", resetTimer);

  const interval = setInterval(() => {
    if (Date.now() - lastActivity > idleThresholdMs) {
      emit("idle_timeout", `No activity for ${idleThresholdMs / 1000}s.`, "low");
    }
  }, 30_000);

  cleanupFns.push(() => {
    clearInterval(interval);
    document.removeEventListener("mousemove", resetTimer);
    document.removeEventListener("keydown", resetTimer);
    document.removeEventListener("click", resetTimer);
  });
}

// ─── Keyboard shortcut blocker ────────────────────────────────────────────────

export function installKeyboardBlocker(s: AssessmentSettings) {
  const handler = (e: KeyboardEvent) => {
    // Alt+Tab / Cmd+Tab
    if ((e.altKey && e.key === "Tab") || (e.metaKey && e.key === "Tab")) {
      if (s.disableAltTab) {
        e.preventDefault();
        emit("keyboard_shortcut", "Alt+Tab blocked.", "low");
      }
    }
    // Windows key
    if (e.key === "Meta" || e.key === "Win") {
      if (s.disableWinKey) {
        e.preventDefault();
        emit("keyboard_shortcut", "Windows key blocked.", "low");
      }
    }
    // F12 / DevTools
    if (e.key === "F12" && s.devToolsDetection) {
      e.preventDefault();
      emit("devtools_opened", "F12 key pressed.", "high");
    }
    // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+U
    if (
      e.ctrlKey &&
      e.shiftKey &&
      (e.key === "I" || e.key === "J" || e.key === "C") &&
      s.devToolsDetection
    ) {
      e.preventDefault();
      emit("devtools_opened", "DevTools shortcut detected.", "high");
    }
    // Context menu
    if (e.key === "ContextMenu" && s.devToolsDetection) {
      e.preventDefault();
    }
  };

  document.addEventListener("keydown", handler);
  cleanupFns.push(() => document.removeEventListener("keydown", handler));
}

// ─── Context menu blocker ─────────────────────────────────────────────────────

export function installContextMenuBlocker() {
  const handler = (e: MouseEvent) => {
    if (isClipboardAllowedTarget(e.target)) return;
    e.preventDefault();
  };
  document.addEventListener("contextmenu", handler);
  cleanupFns.push(() => document.removeEventListener("contextmenu", handler));
}

// ─── Cleanup all listeners ────────────────────────────────────────────────────

export function teardownSecurity() {
  cleanupFns.forEach((fn) => fn());
  cleanupFns = [];
  onViolation = null;
}
