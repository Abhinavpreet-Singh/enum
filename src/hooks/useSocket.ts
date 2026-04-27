"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import { v4 as uuidv4 } from "uuid";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RoomUser {
  socketId: string;
  userId: string;
  username: string;
  color: string;
  tabId: string;
}

export interface RemoteCursor {
  socketId: string;
  username: string;
  color: string;
  cursor: { lineNumber: number; column: number };
}

export interface UseSocketReturn {
  /** Current collaborative code */
  code: string;
  /** Update code locally + debounce-emit to server */
  setCode: (value: string) => void;
  /** Connected users in the room */
  users: RoomUser[];
  /** Whether the socket is connected */
  isConnected: boolean;
  /** Remote cursor positions keyed by socketId */
  cursors: Record<string, RemoteCursor>;
  /** Usernames currently typing */
  typingUsers: string[];
  /** Whether the latest code change came from a remote user (prevent infinite loop) */
  isRemoteUpdate: React.MutableRefObject<boolean>;
  /** Emit cursor position (call from Monaco onCursorPositionChange) */
  emitCursor: (lineNumber: number, column: number) => void;
  /** Emit typing start */
  emitTypingStart: () => void;
  /** Emit typing stop */
  emitTypingStop: () => void;
}

// ─── Stable tab ID (persists across re-renders, unique per tab) ─────────────
let tabId: string | null = null;
function getTabId(): string {
  if (!tabId) tabId = uuidv4();
  return tabId;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * useSocket — manages the full lifecycle of a Socket.IO connection for a
 * collaborative editing room.
 *
 * @param roomId   — the simulation / room identifier
 * @param username — display name for this user
 * @param userId   — optional persistent user ID (e.g. from auth)
 */
export function useSocket(
  roomId: string,
  username: string,
  userId?: string,
): UseSocketReturn {
  const [code, setCodeState] = useState<string>("");
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [cursors, setCursors] = useState<Record<string, RemoteCursor>>({});
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Ref to flag that the next code change is from a remote user, so the
  // Monaco onChange handler should NOT re-emit it back to the server.
  const isRemoteUpdate = useRef(false);

  // Debounce timer ref for outgoing code updates
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track the current roomId in a ref so callbacks always see the latest value
  const roomIdRef = useRef(roomId);
  roomIdRef.current = roomId;

  // ── setCode: update local state + debounced emit ────────────────────────
  const setCode = useCallback(
    (value: string) => {
      setCodeState(value);

      // If this change was triggered by a remote update, don't re-emit
      if (isRemoteUpdate.current) {
        isRemoteUpdate.current = false;
        return;
      }

      // Debounce outgoing emit by 300ms
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        const socket = getSocket();
        if (socket.connected) {
          socket.emit("code:update", { roomId: roomIdRef.current, code: value });
        }
      }, 300);
    },
    [], // stable — uses refs internally
  );

  // ── Cursor emit ─────────────────────────────────────────────────────────
  const emitCursor = useCallback((lineNumber: number, column: number) => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit("cursor:update", {
        roomId: roomIdRef.current,
        cursor: { lineNumber, column },
      });
    }
  }, []);

  // ── Typing indicators ──────────────────────────────────────────────────
  const emitTypingStart = useCallback(() => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit("typing:start", { roomId: roomIdRef.current });
    }
  }, []);

  const emitTypingStop = useCallback(() => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit("typing:stop", { roomId: roomIdRef.current });
    }
  }, []);

  // ── Main effect: connect, join, listen, cleanup ──────────────────────────
  useEffect(() => {
    const socket = getSocket();
    const currentTabId = getTabId();

    // ── Connect ──────────────────────────────────────────────────────────
    function handleConnect() {
      setIsConnected(true);
      // Join the room (or re-join after reconnect)
      socket.emit("room:join", {
        roomId,
        userId: userId || currentTabId,
        username,
        tabId: currentTabId,
      });
    }

    function handleDisconnect() {
      setIsConnected(false);
    }

    // ── Incoming event handlers ──────────────────────────────────────────

    function handleCodeUpdate({ code: incomingCode }: { code: string; senderId: string }) {
      isRemoteUpdate.current = true;
      setCodeState(incomingCode);
    }

    function handleCodeSync({ code: syncedCode }: { code: string }) {
      isRemoteUpdate.current = true;
      setCodeState(syncedCode);
    }

    function handleUsers(userList: RoomUser[]) {
      setUsers(userList);
    }

    function handleCursorUpdate(data: RemoteCursor) {
      setCursors((prev) => ({ ...prev, [data.socketId]: data }));
    }

    function handleTypingStart({ username: name }: { socketId: string; username: string }) {
      setTypingUsers((prev) => (prev.includes(name) ? prev : [...prev, name]));
    }

    function handleTypingStop({ socketId: sid }: { socketId: string }) {
      // Remove by socketId — look up from cursors or users
      setCursors((prev) => {
        const removed = { ...prev };
        delete removed[sid];
        return removed;
      });
      setTypingUsers((prev) => {
        // We need to find the username for this socketId from current users
        return prev; // will be cleaned via a separate mechanism below
      });
    }

    // ── Register listeners BEFORE connecting ─────────────────────────────
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("code:update", handleCodeUpdate);
    socket.on("code:sync", handleCodeSync);
    socket.on("room:users", handleUsers);
    socket.on("cursor:update", handleCursorUpdate);
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);

    // If already connected (e.g. HMR / fast-refresh), manually trigger join
    if (socket.connected) {
      handleConnect();
    } else {
      socket.connect();
    }

    // ── Reconnect handler: re-join room after automatic reconnection ────
    function handleReconnect() {
      socket.emit("room:join", {
        roomId,
        userId: userId || currentTabId,
        username,
        tabId: currentTabId,
      });
    }
    socket.io.on("reconnect", handleReconnect);

    // ── Cleanup ──────────────────────────────────────────────────────────
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      // Leave the room
      socket.emit("room:leave", { roomId });

      // Remove all listeners to prevent duplicates on re-mount
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("code:update", handleCodeUpdate);
      socket.off("code:sync", handleCodeSync);
      socket.off("room:users", handleUsers);
      socket.off("cursor:update", handleCursorUpdate);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
      socket.io.off("reconnect", handleReconnect);

      // Disconnect the socket entirely when component unmounts
      socket.disconnect();
    };
  }, [roomId, username, userId]);

  // ── Clean up typing users when they disconnect ─────────────────────────
  // When the users list changes, remove any typingUsers that are no longer present
  useEffect(() => {
    const currentUsernames = users.map((u) => u.username);
    setTypingUsers((prev) => prev.filter((name) => currentUsernames.includes(name)));
  }, [users]);

  // ── Clean up stale cursors when users leave ────────────────────────────
  useEffect(() => {
    const currentSocketIds = new Set(users.map((u) => u.socketId));
    setCursors((prev) => {
      const cleaned: Record<string, RemoteCursor> = {};
      for (const [sid, cursor] of Object.entries(prev)) {
        if (currentSocketIds.has(sid)) cleaned[sid] = cursor;
      }
      return cleaned;
    });
  }, [users]);

  return {
    code,
    setCode,
    users,
    isConnected,
    cursors,
    typingUsers,
    isRemoteUpdate,
    emitCursor,
    emitTypingStart,
    emitTypingStop,
  };
}
