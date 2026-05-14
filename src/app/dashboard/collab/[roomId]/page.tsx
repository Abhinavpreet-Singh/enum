"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "@/providers/theme-provider";
import CollaborativeEditor from "@/components/simulations/CollaborativeEditor";

/**
 * Dynamic room page — renders the collaborative editor for a given roomId.
 * Reads the username from sessionStorage (set on the landing page).
 */
export default function CollabRoomPage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [username, setUsername] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const roomId = params.roomId;

  // Read username from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("collab_username");
    if (!stored) {
      // No username — redirect back to landing
      router.replace("/dashboard/collab");
      return;
    }
    // Username is restored once on room entry from session storage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUsername(stored);
  }, [router]);

  function handleCopyLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleLeave() {
    router.push("/dashboard/collab");
  }

  // Wait for username to load
  if (!username) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ background: isDark ? "#000" : "#fff" }}
      >
        <div
          className="h-6 w-6 animate-spin rounded-full border-2"
          style={{
            borderColor: isDark
              ? "rgba(255,255,255,0.1)"
              : "rgba(0,0,0,0.1)",
            borderTopColor: isDark ? "#f8fafc" : "#0f172a",
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="flex h-screen flex-col"
      style={{ background: isDark ? "#000" : "#fff" }}
    >
      {/* ── Top navigation bar ───────────────────────────────────────── */}
      <header
        className="flex items-center justify-between border-b px-4 py-2"
        style={{
          borderColor: isDark
            ? "rgba(255,255,255,0.08)"
            : "rgba(0,0,0,0.08)",
          background: isDark ? "#0a0a0a" : "#fafafa",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={handleLeave}
            className="rounded-md px-2 py-1 text-xs font-medium transition-colors hover:opacity-80"
            style={{
              background: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.04)",
              color: isDark ? "#a1a1aa" : "#71717a",
            }}
          >
            ← Back
          </button>
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-semibold"
              style={{ color: isDark ? "#f8fafc" : "#0f172a" }}
            >
              ⚡ Debug Room
            </span>
            <span
              className="rounded-md px-2 py-0.5 text-xs font-mono"
              style={{
                background: isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.04)",
                color: isDark ? "#71717a" : "#a1a1aa",
              }}
            >
              {roomId}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Copy invite link */}
          <button
            onClick={handleCopyLink}
            className="rounded-md border px-3 py-1.5 text-xs font-medium transition-all hover:opacity-80"
            style={{
              borderColor: isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.1)",
              background: copied
                ? isDark
                  ? "rgba(34,197,94,0.1)"
                  : "rgba(34,197,94,0.05)"
                : "transparent",
              color: copied
                ? "#22c55e"
                : isDark
                  ? "#a1a1aa"
                  : "#71717a",
            }}
          >
            {copied ? "✓ Copied!" : "📋 Copy Invite Link"}
          </button>

          {/* Current user badge */}
          <div
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium"
            style={{
              background: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.04)",
              color: isDark ? "#d4d4d8" : "#52525b",
            }}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: "#22c55e" }}
            />
            {username}
          </div>
        </div>
      </header>

      {/* ── Collaborative Editor ─────────────────────────────────────── */}
      <div className="flex-1">
        <CollaborativeEditor
          roomId={roomId}
          username={username}
          language="javascript"
          initialCode={`// 🚀 Welcome to Debug Room: ${roomId}\n// Share this room's link with teammates to code together in real-time.\n\nfunction solve(input) {\n  // Start coding here...\n  \n}\n`}
        />
      </div>
    </div>
  );
}
