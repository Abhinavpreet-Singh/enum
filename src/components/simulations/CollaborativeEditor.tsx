"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "@/providers/theme-provider";
import { useSocket, type RoomUser, type RemoteCursor } from "@/hooks/useSocket";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CollaborativeEditorProps {
  /** Unique room / simulation identifier */
  roomId: string;
  /** Display name of the current user */
  username: string;
  /** Optional persistent user ID (from auth) */
  userId?: string;
  /** Monaco language (e.g. "javascript", "typescript") */
  language?: string;
  /** Initial code when creating a brand-new room */
  initialCode?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function resolveLanguage(lang: string): string {
  const map: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    jsx: "javascript",
    tsx: "typescript",
    py: "python",
    rb: "ruby",
    md: "markdown",
  };
  return map[lang] || lang;
}

/** Abbreviate a username to 2 characters for cursor labels */
function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CollaborativeEditor({
  roomId,
  username,
  userId,
  language = "javascript",
  initialCode = "",
}: CollaborativeEditorProps) {
  const { theme } = useTheme();
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);

  // Track decoration IDs so we can update them without stacking
  const decorationsRef = useRef<string[]>([]);

  // Typing indicator debounce
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLocalTyping, setIsLocalTyping] = useState(false);

  const {
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
  } = useSocket(roomId, username, userId);

  // ── Seed initial code on first mount ────────────────────────────────────
  useEffect(() => {
    if (initialCode && !code) {
      setCode(initialCode);
    }
    // Only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync remote code into Monaco ────────────────────────────────────────
  // When `code` state changes from a remote update, push it into the editor
  // without re-emitting.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // Only update if the change was remote
    if (isRemoteUpdate.current) {
      const currentValue = editor.getValue();
      if (currentValue !== code) {
        // Preserve cursor position across remote updates
        const pos = editor.getPosition();
        editor.setValue(code);
        if (pos) editor.setPosition(pos);
      }
      isRemoteUpdate.current = false;
    }
  }, [code, isRemoteUpdate]);

  // ── Render remote cursors as Monaco decorations ─────────────────────────
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const cursorList = Object.values(cursors);
    const newDecorations = cursorList.map((c: RemoteCursor) => ({
      range: new monaco.Range(
        c.cursor.lineNumber,
        c.cursor.column,
        c.cursor.lineNumber,
        c.cursor.column,
      ),
      options: {
        className: `remote-cursor-${c.socketId.replace(/[^a-zA-Z0-9]/g, "")}`,
        beforeContentClassName: `remote-cursor-marker`,
        hoverMessage: { value: c.username },
        stickiness: 1, // NeverGrowsWhenTypingAtEdges
      },
    }));

    // Inject per-cursor CSS dynamically
    let styleEl = document.getElementById("collab-cursor-styles");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "collab-cursor-styles";
      document.head.appendChild(styleEl);
    }
    const css = cursorList
      .map(
        (c) => `
        .remote-cursor-${c.socketId.replace(/[^a-zA-Z0-9]/g, "")}::after {
          content: "${initials(c.username)}";
          position: absolute;
          top: -18px;
          left: 0;
          background: ${c.color};
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          padding: 1px 4px;
          border-radius: 3px;
          pointer-events: none;
          white-space: nowrap;
          z-index: 100;
          font-family: var(--font-geist-sans), sans-serif;
        }
        .remote-cursor-${c.socketId.replace(/[^a-zA-Z0-9]/g, "")} {
          border-left: 2px solid ${c.color};
        }
      `,
      )
      .join("\n");
    styleEl.textContent = css;

    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      newDecorations,
    );
  }, [cursors]);

  // ── Monaco mount ────────────────────────────────────────────────────────
  const handleEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;
      monaco.editor.setTheme(theme === "dark" ? "pitch-black" : "pitch-light");

      // Emit cursor position when it changes
      editor.onDidChangeCursorPosition((e) => {
        emitCursor(e.position.lineNumber, e.position.column);
      });

      // If code was already received before mount, set it
      if (code) {
        editor.setValue(code);
      }
    },
    [theme, emitCursor, code],
  );

  // ── Handle local typing ─────────────────────────────────────────────────
  const handleChange = useCallback(
    (newValue: string | undefined) => {
      const value = newValue ?? "";
      setCode(value);

      // Typing indicator: start typing, then stop after 1s of inactivity
      if (!isLocalTyping) {
        setIsLocalTyping(true);
        emitTypingStart();
      }
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        setIsLocalTyping(false);
        emitTypingStop();
      }, 1000);
    },
    [setCode, emitTypingStart, emitTypingStop, isLocalTyping],
  );

  // ── Clean up typing timeout on unmount ──────────────────────────────────
  useEffect(() => {
    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full w-full flex-col" id="collaborative-editor">
      {/* ── Top bar: connection status + user presence ─────────────────── */}
      <div
        className="flex items-center justify-between border-b px-4 py-2"
        style={{
          borderColor: theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
          background: theme === "dark" ? "#0a0a0a" : "#fafafa",
        }}
      >
        {/* Connection badge */}
        <div className="flex items-center gap-2 text-xs font-medium">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{
              background: isConnected ? "#22c55e" : "#ef4444",
              boxShadow: isConnected
                ? "0 0 6px rgba(34,197,94,0.5)"
                : "0 0 6px rgba(239,68,68,0.5)",
            }}
          />
          <span style={{ color: theme === "dark" ? "#a1a1aa" : "#71717a" }}>
            {isConnected ? "Connected" : "Disconnected"}
          </span>
          <span
            className="ml-2 rounded px-1.5 py-0.5 text-[10px] font-mono"
            style={{
              background: theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
              color: theme === "dark" ? "#71717a" : "#a1a1aa",
            }}
          >
            {roomId}
          </span>
        </div>

        {/* User avatars */}
        <div className="flex items-center gap-1">
          {users.map((user) => (
            <div
              key={user.socketId}
              className="relative flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ background: user.color }}
              title={user.username}
            >
              {initials(user.username)}
            </div>
          ))}
          {users.length > 0 && (
            <span
              className="ml-2 text-xs"
              style={{ color: theme === "dark" ? "#71717a" : "#a1a1aa" }}
            >
              {users.length} online
            </span>
          )}
        </div>
      </div>

      {/* ── Monaco Editor ──────────────────────────────────────────────── */}
      <div className="flex-1 relative">
        <Editor
          height="100%"
          language={resolveLanguage(language)}
          value={code}
          onChange={handleChange}
          onMount={handleEditorMount}
          theme={theme === "dark" ? "pitch-black" : "pitch-light"}
          beforeMount={(monaco) => {
            // Dark (black) theme
            monaco.editor.defineTheme("pitch-black", {
              base: "vs-dark",
              inherit: true,
              rules: [],
              colors: {
                "editor.background": "#000000",
                "editor.foreground": "#f8fafc",
                "editorLineNumber.foreground": "#64748b",
                "editorLineNumber.activeForeground": "#60a5fa",
                "editorCursor.foreground": "#60a5fa",
                "editor.selectionBackground": "rgba(248,250,252,0.12)",
                "editor.selectionHighlightBackground": "rgba(148,163,184,0.12)",
                "editor.findMatchBackground": "rgba(148,163,184,0.16)",
                "editor.findMatchBorder": "transparent",
                "editor.findMatchHighlightBackground": "rgba(148,163,184,0.16)",
                "editor.findMatchHighlightBorder": "transparent",
                "editor.lineHighlightBackground": "rgba(148,163,184,0.14)",
                "editor.lineHighlightBorder": "transparent",
                "editorIndentGuide.background": "rgba(148,163,184,0.25)",
                "editorIndentGuide.activeBackground": "rgba(248,250,252,0.2)",
                "editorBracketMatch.background": "rgba(255,255,255,0.1)",
                "editorBracketMatch.border": "rgba(248,250,252,0.2)",
              },
            });

            // Light theme
            monaco.editor.defineTheme("pitch-light", {
              base: "vs",
              inherit: true,
              rules: [],
              colors: {
                "editor.selectionBackground": "rgba(148,163,184,0.22)",
                "editor.selectionHighlightBackground": "rgba(148,163,184,0.22)",
                "editor.findMatchBackground": "rgba(148,163,184,0.18)",
                "editor.findMatchBorder": "transparent",
                "editor.findMatchHighlightBackground": "rgba(148,163,184,0.18)",
                "editor.findMatchHighlightBorder": "transparent",
                "editor.lineHighlightBackground": "rgba(148,163,184,0.18)",
                "editor.lineHighlightBorder": "transparent",
                "editorLineNumber.activeForeground": "#60a5fa",
              },
            });
          }}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
            padding: { top: 8 },
            renderLineHighlight: "none",
            renderValidationDecorations: "off",
            bracketPairColorization: { enabled: true },
            smoothScrolling: true,
            cursorBlinking: "smooth",
            fontFamily:
              "var(--font-geist-mono), 'Fira Code', 'Cascadia Code', monospace",
            occurrencesHighlight: "off",
            selectionHighlight: false,
          }}
        />
      </div>

      {/* ── Typing indicator bar ───────────────────────────────────────── */}
      {typingUsers.length > 0 && (
        <div
          className="flex items-center gap-2 px-4 py-1.5 text-xs border-t"
          style={{
            borderColor: theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
            background: theme === "dark" ? "#0a0a0a" : "#fafafa",
            color: theme === "dark" ? "#a1a1aa" : "#71717a",
          }}
        >
          {/* Animated dots */}
          <span className="flex gap-0.5">
            <span className="inline-block h-1 w-1 rounded-full animate-bounce" style={{ background: "currentColor", animationDelay: "0ms" }} />
            <span className="inline-block h-1 w-1 rounded-full animate-bounce" style={{ background: "currentColor", animationDelay: "150ms" }} />
            <span className="inline-block h-1 w-1 rounded-full animate-bounce" style={{ background: "currentColor", animationDelay: "300ms" }} />
          </span>
          <span>
            {typingUsers.length === 1
              ? `${typingUsers[0]} is typing…`
              : typingUsers.length === 2
                ? `${typingUsers[0]} and ${typingUsers[1]} are typing…`
                : `${typingUsers[0]} and ${typingUsers.length - 1} others are typing…`}
          </span>
        </div>
      )}
    </div>
  );
}
