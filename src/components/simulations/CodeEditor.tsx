"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import { useCallback, useRef } from "react";

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
        theme="vs-light"
        path={filePath}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: "on",
          padding: { top: 8 },
          renderLineHighlight: "gutter",
          bracketPairColorization: { enabled: true },
          smoothScrolling: true,
          cursorBlinking: "smooth",
          fontFamily: "var(--font-geist-mono), 'Fira Code', 'Cascadia Code', monospace",
        }}
      />
    </div>
  );
}
