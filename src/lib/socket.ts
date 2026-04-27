import { io, Socket } from "socket.io-client";

// ─── Singleton Socket.IO client ─────────────────────────────────────────────
// Only one connection per browser tab. The socket is created lazily on first
// call to getSocket() and reused for all subsequent calls.

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

let socket: Socket | null = null;

/**
 * Returns a singleton Socket.IO client instance.
 *
 * - `autoConnect: false` — we connect manually after setting up listeners
 * - `reconnection: true` — automatic reconnection with exponential back-off
 * - `transports: ["websocket", "polling"]` — prefer WebSocket, fall back to polling
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

/**
 * Forcefully destroy the singleton so a fresh one can be created.
 * Useful for hard-reset / logout scenarios.
 */
export function destroySocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
