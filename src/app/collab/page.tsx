"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/providers/theme-provider";
import { v4 as uuidv4 } from "uuid";

/**
 * Collab landing page — enter a room ID + username, then redirect to the room.
 */
export default function CollabLandingPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");

  function handleCreateRoom() {
    const newRoomId = uuidv4().slice(0, 8);
    setRoomId(newRoomId);
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!roomId.trim() || !username.trim()) return;
    // Store username in sessionStorage so the room page can read it
    sessionStorage.setItem("collab_username", username.trim());
    router.push(`/collab/${roomId.trim()}`);
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ background: isDark ? "#000" : "#fff" }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-8"
        style={{
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
          background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
        }}
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
            style={{
              background: isDark
                ? "rgba(96,165,250,0.1)"
                : "rgba(96,165,250,0.08)",
            }}
          >
            ⚡
          </div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: isDark ? "#f8fafc" : "#0f172a" }}
          >
            Multiplayer Debug Room
          </h1>
          <p
            className="mt-2 text-sm"
            style={{ color: isDark ? "#71717a" : "#a1a1aa" }}
          >
            Collaborate on code in real-time with your team
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleJoin} className="space-y-4">
          {/* Username */}
          <div>
            <label
              htmlFor="collab-username"
              className="mb-1.5 block text-xs font-medium"
              style={{ color: isDark ? "#a1a1aa" : "#71717a" }}
            >
              Your Name
            </label>
            <input
              id="collab-username"
              type="text"
              placeholder="e.g. Alice"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2"
              style={{
                borderColor: isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.1)",
                background: isDark
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(0,0,0,0.02)",
                color: isDark ? "#f8fafc" : "#0f172a",
                // @ts-expect-error CSS custom property for focus ring
                "--tw-ring-color": "rgba(96,165,250,0.4)",
              }}
            />
          </div>

          {/* Room ID */}
          <div>
            <label
              htmlFor="collab-room-id"
              className="mb-1.5 block text-xs font-medium"
              style={{ color: isDark ? "#a1a1aa" : "#71717a" }}
            >
              Room ID
            </label>
            <div className="flex gap-2">
              <input
                id="collab-room-id"
                type="text"
                placeholder="Enter room ID or generate one"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                required
                className="flex-1 rounded-lg border px-3 py-2.5 text-sm font-mono outline-none transition-colors focus:ring-2"
                style={{
                  borderColor: isDark
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.1)",
                  background: isDark
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(0,0,0,0.02)",
                  color: isDark ? "#f8fafc" : "#0f172a",
                }}
              />
              <button
                type="button"
                onClick={handleCreateRoom}
                className="shrink-0 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors hover:opacity-80"
                style={{
                  borderColor: isDark
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.1)",
                  background: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.03)",
                  color: isDark ? "#a1a1aa" : "#71717a",
                }}
              >
                Generate
              </button>
            </div>
          </div>

          {/* Join button */}
          <button
            type="submit"
            disabled={!roomId.trim() || !username.trim()}
            className="mt-2 w-full rounded-lg py-2.5 text-sm font-semibold transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              background: isDark ? "#f8fafc" : "#0f172a",
              color: isDark ? "#0f172a" : "#f8fafc",
            }}
          >
            Join Room →
          </button>
        </form>

        {/* Hint */}
        <p
          className="mt-6 text-center text-xs"
          style={{ color: isDark ? "#52525b" : "#d4d4d8" }}
        >
          Share the room ID with others so they can join the same session
        </p>
      </div>
    </div>
  );
}
