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

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monaco.editor.setTheme(theme === "dark" ? "pitch-black" : "pitch-light");
  }, [theme]);

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
              "editor.selectionBackground": "rgba(248,250,252,0.12)",
              "editor.selectionHighlightBackground": "rgba(148,163,184,0.12)",
              "editor.findMatchBackground": "rgba(148,163,184,0.16)",
              "editor.findMatchBorder": "transparent",
              "editor.findMatchHighlightBackground": "rgba(148,163,184,0.16)",
              "editor.findMatchHighlightBorder": "transparent",
              "editor.findRangeHighlightBackground": "rgba(148,163,184,0.12)",
              "editor.findRangeHighlightBorder": "transparent",
              "editor.wordHighlightBackground": "rgba(148,163,184,0.12)",
              "editor.wordHighlightStrongBackground": "rgba(148,163,184,0.16)",
              "editor.inactiveSelectionBackground": "rgba(248,250,252,0.06)",
              "editor.lineHighlightBackground": "rgba(148,163,184,0.14)",
              "editor.lineHighlightBorder": "transparent",
              "editorIndentGuide.background": "rgba(148,163,184,0.25)",
              "editorIndentGuide.activeBackground": "rgba(248,250,252,0.2)",
              "editorWhitespace.foreground": "rgba(148,163,184,0.4)",
              "editorBracketMatch.background": "rgba(255,255,255,0.1)",
              "editorBracketMatch.border": "rgba(248,250,252,0.2)",
              "editorError.background": "rgba(148,163,184,0.16)",
              "editorError.foreground": "rgba(248,250,252,0.9)",
              "editorError.border": "transparent",
              "editorWarning.background": "rgba(148,163,184,0.12)",
              "editorWarning.foreground": "rgba(248,250,252,0.9)",
              "editorWarning.border": "transparent",
            },
          });

          // Light theme with a light gray highlight instead of red
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
              "editor.findRangeHighlightBackground": "rgba(148,163,184,0.14)",
              "editor.findRangeHighlightBorder": "transparent",
              "editor.wordHighlightBackground": "rgba(148,163,184,0.14)",
              "editor.wordHighlightStrongBackground": "rgba(148,163,184,0.18)",
              "editor.inactiveSelectionBackground": "rgba(148,163,184,0.14)",
              "editor.lineHighlightBackground": "rgba(148,163,184,0.18)",
              "editor.lineHighlightBorder": "transparent",
              "editorError.background": "rgba(148,163,184,0.16)",
              "editorError.foreground": "rgba(15,23,42,0.9)",
              "editorError.border": "transparent",
              "editorWarning.background": "rgba(148,163,184,0.12)",
              "editorWarning.foreground": "rgba(15,23,42,0.9)",
              "editorWarning.border": "transparent",
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
          fontFamily: "var(--font-geist-mono), 'Fira Code', 'Cascadia Code', monospace",
          occurrencesHighlight: "off",
          selectionHighlight: false,
        }}
      />
    </div>
  );
}
