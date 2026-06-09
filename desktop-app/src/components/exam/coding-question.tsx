"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { ExamQuestion, Answer } from "@/types";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const LANGUAGE_MAP: Record<string, string> = {
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  java: "java",
  cpp: "cpp",
  c: "c",
  sql: "sql",
  bash: "shell",
};

interface Props {
  question: ExamQuestion;
  answer: Answer | undefined;
  language?: string;
  onAnswer: (value: { code: string; language: string }) => void;
}

export default function CodingQuestion({ question, answer, language = "python", onAnswer }: Props) {
  const existing = answer?.value as { code?: string; language?: string } | undefined;
  const [code, setCode] = useState(
    existing?.code ?? question.codeTemplate ?? "# Write your solution here\n",
  );
  const [lang, setLang] = useState(existing?.language ?? language);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      onAnswer({ code, language: lang });
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, lang]);

  async function runCode() {
    setRunning(true);
    setOutput("");
    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "https://enum-backend.onrender.com";
      const resp = await fetch(`${backendUrl}/api/v1/judge/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang, code, testCases: question.testCases ?? [] }),
      });
      const data = await resp.json();
      setOutput(data.output ?? data.error ?? data.message ?? "No output");
    } catch {
      setOutput("Judge service unavailable. Your code is saved.");
    } finally {
      setRunning(false);
    }
  }

  const langs = ["python", "javascript", "typescript", "java", "cpp", "c"];

  return (
    <div className="flex flex-col gap-3">
      {/* Language selector */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 uppercase tracking-wider">Language</span>
        <div className="flex gap-1.5">
          {langs.map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`rounded px-2.5 py-1 text-xs transition-all ${
                lang === l
                  ? "bg-white text-black font-semibold"
                  : "border border-white/10 text-gray-400 hover:border-white/30 hover:text-white"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="rounded-lg overflow-hidden border border-white/10" style={{ height: 320 }}>
        <MonacoEditor
          height="100%"
          language={LANGUAGE_MAP[lang] ?? lang}
          theme="vs-dark"
          value={code}
          onChange={(v) => setCode(v ?? "")}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "ui-monospace, 'Cascadia Code', monospace",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            lineNumbers: "on",
            renderLineHighlight: "line",
          }}
        />
      </div>

      {/* Run + output */}
      <div className="flex flex-col gap-2">
        <button
          onClick={runCode}
          disabled={running}
          className="self-start rounded-lg border border-white/10 px-4 py-2 text-xs text-gray-300 transition-all hover:border-white/30 hover:text-white disabled:opacity-50"
        >
          {running ? "Running…" : "▶ Run"}
        </button>
        {output && (
          <pre className="rounded-lg bg-white/5 border border-white/10 p-3 text-xs text-gray-300 font-mono overflow-auto max-h-32">
            {output}
          </pre>
        )}
      </div>
    </div>
  );
}
