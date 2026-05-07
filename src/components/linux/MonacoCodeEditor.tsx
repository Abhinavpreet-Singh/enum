"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import { useEffect, useRef } from "react";
import { useTheme } from "@/providers/theme-provider";

interface MonacoCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function MonacoCodeEditor({ value, onChange }: MonacoCodeEditorProps) {
  const { theme } = useTheme();
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);

  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      monacoRef.current.editor.setTheme(theme === "dark" ? "pitch-black" : "pitch-light");
    }
  }, [theme]);

  return (
    <div className="h-full w-full border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] overflow-hidden">
      <Editor
        height="100%"
        language="shell"
        value={value}
        onChange={(nextValue) => onChange(nextValue || "")}
        theme={theme === "dark" ? "pitch-black" : "pitch-light"}
        onMount={(editor, monaco) => {
          editorRef.current = editor;
          monacoRef.current = monaco;
          monaco.editor.setTheme(theme === "dark" ? "pitch-black" : "pitch-light");
        }}
        beforeMount={(monaco) => {
          monaco.editor.defineTheme("pitch-black", {
            base: "vs-dark",
            inherit: true,
            rules: [],
            colors: {
              "editor.background": "#0a0a0a",
              "editor.foreground": "#f8fafc",
              "editorLineNumber.foreground": "#64748b",
              "editorLineNumber.activeForeground": "#e5e7eb",
              "editorCursor.foreground": "#ffffff",
              "editor.selectionBackground": "rgba(255,255,255,0.12)",
              "editor.selectionHighlightBackground": "rgba(255,255,255,0.08)",
              "editor.findMatchBackground": "rgba(255,255,255,0.14)",
              "editor.findMatchBorder": "transparent",
              "editorBracketMatch.background": "rgba(255,255,255,0.1)",
              "editorBracketMatch.border": "rgba(255,255,255,0.25)",
              "editor.lineHighlightBackground": "rgba(255,255,255,0.05)",
              "editorWhitespace.foreground": "rgba(148,163,184,0.3)",
            },
          });

          monaco.editor.defineTheme("pitch-light", {
            base: "vs",
            inherit: true,
            rules: [],
            colors: {
              "editor.background": "#ffffff",
              "editor.foreground": "#111827",
              "editorLineNumber.foreground": "#9ca3af",
              "editorLineNumber.activeForeground": "#111827",
              "editorCursor.foreground": "#000000",
              "editor.selectionBackground": "rgba(0,0,0,0.08)",
              "editor.selectionHighlightBackground": "rgba(0,0,0,0.06)",
              "editor.findMatchBackground": "rgba(0,0,0,0.08)",
              "editor.findMatchBorder": "transparent",
              "editorBracketMatch.background": "rgba(0,0,0,0.04)",
              "editorBracketMatch.border": "rgba(0,0,0,0.18)",
              "editor.lineHighlightBackground": "rgba(0,0,0,0.03)",
              "editorWhitespace.foreground": "rgba(148,163,184,0.35)",
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
          insertSpaces: true,
          wordWrap: "on",
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: "none",
          renderValidationDecorations: "off",
          bracketPairColorization: { enabled: true },
          smoothScrolling: true,
          cursorBlinking: "smooth",
          fontFamily: "var(--font-geist-mono), 'Fira Code', 'Cascadia Code', monospace",
          autoClosingBrackets: "always",
          autoClosingQuotes: "always",
          formatOnPaste: true,
          formatOnType: true,
          selectionHighlight: false,
          occurrencesHighlight: "off",
        }}
      />
    </div>
  );
}