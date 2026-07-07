"use client";

import { API_BASE_URL } from "@/lib/api-config";
import api from "@/lib/api";
import { useCallback, useContext, useEffect, useState } from "react";
import { AuthContext } from "@/providers/AuthProvider";
import { Monitor, Smartphone, Globe, Trash2, LogOut, RefreshCw } from "lucide-react";
import { MessageBanner } from "./settings-ui";

interface Session {
  id: string;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
  lastUsed: string | null;
  accountType: string;
}

function parseDevice(userAgent: string): { label: string; icon: "desktop" | "mobile" | "browser" } {
  const ua = userAgent.toLowerCase();
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
    return { label: "Mobile device", icon: "mobile" };
  }
  if (ua.includes("windows") || ua.includes("mac") || ua.includes("linux")) {
    return { label: "Desktop browser", icon: "desktop" };
  }
  return { label: "Browser", icon: "browser" };
}

function formatTime(iso: string | null): string {
  if (!iso) return "Never";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function DeviceIcon({ type }: { type: "desktop" | "mobile" | "browser" }) {
  if (type === "mobile") return <Smartphone className="h-4 w-4 shrink-0" />;
  if (type === "desktop") return <Monitor className="h-4 w-4 shrink-0" />;
  return <Globe className="h-4 w-4 shrink-0" />;
}

export default function SessionsPanel({ compact = false }: { compact?: boolean }) {
  const authCtx = useContext(AuthContext);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/v1/auth/sessions", {
        withCredentials: true,
      });
      setSessions(res.data?.data ?? []);
    } catch {
      setError("Failed to load sessions. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const revokeSession = async (sessionId: string) => {
    setRevoking(sessionId);
    try {
      await api.delete(`/api/v1/auth/sessions/${sessionId}`, {
        withCredentials: true,
      });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      setError("Failed to revoke session.");
    } finally {
      setRevoking(null);
    }
  };

  const logoutAll = async () => {
    setLoggingOutAll(true);
    try {
      await authCtx?.logoutAll?.();
      window.location.href = "/login/";
    } catch {
      setError("Failed to logout all devices.");
      setLoggingOutAll(false);
    }
  };

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[10px] text-gray-500 dark:text-gray-400">
          {sessions.length} active session{sessions.length === 1 ? "" : "s"}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={fetchSessions}
            disabled={loading}
            className="inline-flex items-center gap-1.5 border border-gray-300 px-3 py-1.5 font-mono text-[10px] tracking-wider text-gray-600 transition-colors hover:border-black dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={logoutAll}
            disabled={loggingOutAll || sessions.length === 0}
            className="inline-flex items-center gap-1.5 border border-red-300 px-3 py-1.5 font-mono text-[10px] tracking-wider text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/20 disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            {loggingOutAll ? "Logging out…" : "Logout all"}
          </button>
        </div>
      </div>

      {error ? <MessageBanner tone="error">{error}</MessageBanner> : null}

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse border border-gray-200 bg-gray-50 dark:border-neutral-800 dark:bg-neutral-950"
            />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="border border-gray-200 p-6 text-center dark:border-neutral-800">
          <p className="font-mono text-xs text-gray-400 dark:text-neutral-500">
            No active sessions found.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => {
            const { label, icon } = parseDevice(session.userAgent);
            return (
              <div
                key={session.id}
                className="flex items-start gap-3 border border-gray-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950"
              >
                <div className="mt-0.5 text-gray-500 dark:text-neutral-400">
                  <DeviceIcon type={icon} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[11px] font-medium text-black dark:text-white">
                    {label}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-gray-400 dark:text-neutral-500">
                    {session.userAgent.slice(0, 100) || "Unknown browser"}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    {session.ipAddress ? (
                      <span className="font-mono text-[10px] text-gray-400 dark:text-neutral-500">
                        IP {session.ipAddress}
                      </span>
                    ) : null}
                    <span className="font-mono text-[10px] text-gray-400 dark:text-neutral-500">
                      Signed in {formatTime(session.createdAt)}
                    </span>
                    <span className="font-mono text-[10px] text-gray-400 dark:text-neutral-500">
                      Last active {formatTime(session.lastUsed)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => revokeSession(session.id)}
                  disabled={revoking === session.id}
                  title="Revoke this session"
                  className="shrink-0 p-1.5 text-gray-400 transition-colors hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p className="font-mono text-[10px] leading-relaxed text-gray-400 dark:text-neutral-600">
        Sessions expire after 30 days of inactivity. Revoking a session signs out that device
        immediately.
      </p>
    </div>
  );
}
