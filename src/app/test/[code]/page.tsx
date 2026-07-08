"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { getExamAppOrigin } from "@/lib/test-link";

export default function TestRedirectPage() {
  const params = useParams();
  const code = String(params.code ?? "").trim();

  useEffect(() => {
    if (!code) return;
    const base = getExamAppOrigin();
    window.location.replace(`${base}/login?code=${encodeURIComponent(code)}`);
  }, [code]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
      <p className="font-mono text-xs tracking-wider text-gray-400">Opening exam…</p>
    </div>
  );
}
