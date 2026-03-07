"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import { useCallback, useRef } from "react";
import { useTheme } from "@/providers/theme-provider";

interface CodeEditorProps {
  filePath: string;
  language: string;
  value: string;
  onChange: (filePath: string, value: string) => void;
}

function resolveLanguage(filePath: string, fallback: string): string {
  if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) return "typescript";
  if (filePath.endsWith(".js") || filePath.endsWith(".jsx")) return "javascript";
  if (filePath.endsWith(".json")) return "json";
  if (filePath.endsWith(".md")) return "markdown";
  if (filePath.endsWith(".css")) return "css";
  if (filePath.endsWith(".html")) return "html";
  return fallback;
}

export default function CodeEditor({
  filePath,
  language,
  value,
  onChange,
}: CodeEditorProps) {
  const { theme } = useTheme();
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  const handleChange = useCallback(
    (newValue: string | undefined) => {
      onChange(filePath, newValue ?? "");
    },
    [filePath, onChange],
  );

  const resolvedLang = resolveLanguage(filePath, language);

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        language={resolvedLang}
        value={value}
        onChange={handleChange}
        onMount={handleEditorMount}
        theme={theme === "dark" ? "pitch-black" : "pitch-light"}
        path={filePath}
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
              "editor.selectionBackground": "rgba(255,255,255,0.1)",
              "editor.inactiveSelectionBackground": "rgba(255,255,255,0.05)",
              // Make line highlight fully transparent so no red/boxed highlight appears
              "editor.lineHighlightBackground": "transparent",
              "editor.lineHighlightBorder": "transparent",
              "editorIndentGuide.background": "rgba(148,163,184,0.25)",
              "editorIndentGuide.activeBackground": "rgba(248,250,252,0.2)",
              "editorWhitespace.foreground": "rgba(148,163,184,0.4)",
              "editorBracketMatch.background": "rgba(255,255,255,0.1)",
              "editorBracketMatch.border": "rgba(248,250,252,0.2)",
            },
          });

          // Light theme with no glow/outline highlight
          monaco.editor.defineTheme("pitch-light", {
            base: "vs",
            inherit: true,
            rules: [],
            colors: {
              "editor.lineHighlightBorder": "transparent",
              "editor.lineHighlightBackground": "transparent",
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
          bracketPairColorization: { enabled: true },
          smoothScrolling: true,
          cursorBlinking: "smooth",
          fontFamily: "var(--font-geist-mono), 'Fira Code', 'Cascadia Code', monospace",
        }}
      />
    </div>
  );
}
