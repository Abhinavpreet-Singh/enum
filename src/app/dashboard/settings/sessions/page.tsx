"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import axios from "axios";
import { proxy } from "@/app/proxy";
import { AuthContext } from "@/providers/AuthProvider";
import { Monitor, Smartphone, Globe, Trash2, LogOut, RefreshCw } from "lucide-react";

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
  if (type === "mobile") return <Smartphone className="h-5 w-5 shrink-0" />;
  if (type === "desktop") return <Monitor className="h-5 w-5 shrink-0" />;
  return <Globe className="h-5 w-5 shrink-0" />;
}

export default function SessionsPage() {
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
      const res = await axios.get(`${proxy}/api/v1/auth/sessions`, {
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
      await axios.delete(`${proxy}/api/v1/auth/sessions/${sessionId}`, {
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
      window.location.href = "/login";
    } catch {
      setError("Failed to logout all devices.");
      setLoggingOutAll(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-lg font-bold text-black dark:text-white tracking-tight">
            Active Sessions
          </h1>
          <p className="font-mono text-xs text-gray-500 dark:text-neutral-400 mt-1">
            Devices currently logged in to your account.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={fetchSessions}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-neutral-700 font-mono text-[10px] tracking-wider text-gray-600 dark:text-neutral-400 hover:border-black dark:hover:border-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            REFRESH
          </button>
          <button
            onClick={logoutAll}
            disabled={loggingOutAll}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-red-300 dark:border-red-800 font-mono text-[10px] tracking-wider text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            {loggingOutAll ? "LOGGING OUT..." : "LOGOUT ALL"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
          <p className="font-mono text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 animate-pulse"
            />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="border border-gray-200 dark:border-neutral-800 p-8 text-center">
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
                className="flex items-start gap-4 border border-gray-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-950"
              >
                <div className="text-gray-500 dark:text-neutral-400 mt-0.5">
                  <DeviceIcon type={icon} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-mono text-[11px] font-medium text-black dark:text-white tracking-wide">
                      {label}
                    </p>
                  </div>
                  <p className="font-mono text-[10px] text-gray-400 dark:text-neutral-500 mt-0.5 truncate">
                    {session.userAgent.slice(0, 80) || "Unknown browser"}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                    {session.ipAddress && (
                      <span className="font-mono text-[10px] text-gray-400 dark:text-neutral-500">
                        IP: {session.ipAddress}
                      </span>
                    )}
                    <span className="font-mono text-[10px] text-gray-400 dark:text-neutral-500">
                      Signed in: {formatTime(session.createdAt)}
                    </span>
                    <span className="font-mono text-[10px] text-gray-400 dark:text-neutral-500">
                      Last active: {formatTime(session.lastUsed)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => revokeSession(session.id)}
                  disabled={revoking === session.id}
                  title="Revoke this session"
                  className="shrink-0 p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-6 font-mono text-[10px] text-gray-400 dark:text-neutral-600 leading-relaxed">
        Sessions expire automatically after 30 days of inactivity. Revoking a
        session immediately signs out that device. &quot;Logout all&quot; ends every
        session including this one.
      </p>
    </div>
  );
}
