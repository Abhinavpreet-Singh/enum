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

function monochromeTone(seed: string) {
  const palette = [
    "#111111",
    "#2f2f2f",
    "#4b4b4b",
    "#6b6b6b",
    "#8a8a8a",
    "#b0b0b0",
  ];
  const hash = seed
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
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
      .map((c) => {
        const tone = monochromeTone(c.socketId);
        const labelColor = tone === "#b0b0b0" ? "#111111" : "#ffffff";
        return `
        .remote-cursor-${c.socketId.replace(/[^a-zA-Z0-9]/g, "")}::after {
          content: "${initials(c.username)}";
          position: absolute;
          top: -18px;
          left: 0;
          background: ${tone};
          color: ${labelColor};
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
          border-left: 2px solid ${tone};
        }
      `;
      })
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
    <div
      className="flex h-full min-h-0 w-full flex-col overflow-hidden"
      id="collaborative-editor"
    >
      {/* Top bar: connection status + user presence */}
      <div
        className="flex h-10 shrink-0 items-center justify-between gap-4 border-b border-black/10 px-4 dark:border-white/10"
        style={{
          background: theme === "dark" ? "#000000" : "#ffffff",
        }}
      >
        {/* Connection badge */}
        <div className="flex min-w-0 items-center gap-2 text-xs font-medium">
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{
              background: isConnected
                ? theme === "dark"
                  ? "#ffffff"
                  : "#111111"
                : "#8a8a8a",
              boxShadow: isConnected ? "0 0 6px rgba(0,0,0,0.18)" : "none",
            }}
          />
          <span
            className="shrink-0"
            style={{ color: theme === "dark" ? "#d4d4d4" : "#525252" }}
          >
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>

        {/* User avatars */}
        <div className="flex min-w-0 items-center justify-end gap-1.5">
          {users.map((user) => (
            <div
              key={user.socketId}
              className="relative flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{
                background: monochromeTone(user.socketId),
                color:
                  monochromeTone(user.socketId) === "#b0b0b0"
                    ? "#111111"
                    : "#ffffff",
              }}
              title={user.username}
            >
              {initials(user.username)}
            </div>
          ))}
          {users.length > 0 && (
            <span
              className="ml-1 text-xs"
              style={{ color: theme === "dark" ? "#bdbdbd" : "#737373" }}
            >
              {users.length} online
            </span>
          )}
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="relative min-h-0 flex-1">
        <Editor
          height="100%"
          language={resolveLanguage(language)}
          value={code}
          onChange={handleChange}
          onMount={handleEditorMount}
          theme={theme === "dark" ? "pitch-black" : "pitch-light"}
          beforeMount={(monaco) => {
            monaco.editor.defineTheme("pitch-black", {
              base: "vs-dark",
              inherit: true,
              rules: [],
              colors: {
                "editor.background": "#000000",
                "editor.foreground": "#f8fafc",
                "editorLineNumber.foreground": "#525252",
                "editorLineNumber.activeForeground": "#f5f5f5",
                "editorCursor.foreground": "#f5f5f5",
                "editor.selectionBackground": "rgba(255,255,255,0.14)",
                "editor.selectionHighlightBackground": "rgba(255,255,255,0.1)",
                "editor.findMatchBackground": "rgba(255,255,255,0.12)",
                "editor.findMatchBorder": "transparent",
                "editor.findMatchHighlightBackground": "rgba(255,255,255,0.12)",
                "editor.findMatchHighlightBorder": "transparent",
                "editor.lineHighlightBackground": "transparent",
                "editor.lineHighlightBorder": "transparent",
                "editorIndentGuide.background": "rgba(255,255,255,0.2)",
                "editorIndentGuide.activeBackground": "rgba(255,255,255,0.32)",
                "editorBracketMatch.background": "transparent",
                "editorBracketMatch.border": "transparent",
              },
            });

            monaco.editor.defineTheme("pitch-light", {
              base: "vs",
              inherit: true,
              rules: [],
              colors: {
                "editor.background": "#ffffff",
                "editor.foreground": "#111111",
                "editorLineNumber.foreground": "#737373",
                "editorLineNumber.activeForeground": "#111111",
                "editorCursor.foreground": "#111111",
                "editor.selectionBackground": "rgba(0,0,0,0.12)",
                "editor.selectionHighlightBackground": "rgba(0,0,0,0.12)",
                "editor.findMatchBackground": "rgba(0,0,0,0.1)",
                "editor.findMatchBorder": "transparent",
                "editor.findMatchHighlightBackground": "rgba(0,0,0,0.1)",
                "editor.findMatchHighlightBorder": "transparent",
                "editor.lineHighlightBackground": "transparent",
                "editor.lineHighlightBorder": "transparent",
                "editorIndentGuide.background": "rgba(0,0,0,0.12)",
                "editorIndentGuide.activeBackground": "rgba(0,0,0,0.2)",
                "editorBracketMatch.background": "transparent",
                "editorBracketMatch.border": "transparent",
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
            matchBrackets: "never",
            bracketPairColorization: { enabled: false },
            smoothScrolling: true,
            cursorBlinking: "smooth",
            fontFamily:
              "var(--font-geist-mono), 'Fira Code', 'Cascadia Code', monospace",
            occurrencesHighlight: "off",
            selectionHighlight: false,
          }}
        />
      </div>

      {/* Typing indicator bar */}
      {typingUsers.length > 0 && (
        <div
          className="flex shrink-0 items-center gap-2 border-t border-black/10 px-4 py-1.5 text-xs dark:border-white/10"
          style={{
            background: theme === "dark" ? "#000000" : "#ffffff",
            color: theme === "dark" ? "#d4d4d4" : "#525252",
          }}
        >
          {/* Animated dots */}
          <span className="flex gap-0.5">
            <span
              className="inline-block h-1 w-1 rounded-full animate-bounce"
              style={{ background: "currentColor", animationDelay: "0ms" }}
            />
            <span
              className="inline-block h-1 w-1 rounded-full animate-bounce"
              style={{ background: "currentColor", animationDelay: "150ms" }}
            />
            <span
              className="inline-block h-1 w-1 rounded-full animate-bounce"
              style={{ background: "currentColor", animationDelay: "300ms" }}
            />
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
