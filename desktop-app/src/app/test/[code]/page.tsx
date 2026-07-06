"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function TestCodePage() {
  const router = useRouter();
  const params = useParams();
  const code = String(params.code ?? "").trim();

  useEffect(() => {
    if (code) {
      router.replace(`/login?code=${encodeURIComponent(code)}`);
      return;
    }
    router.replace("/login");
  }, [code, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
      <p className="font-mono text-xs tracking-wider text-gray-400">Opening exam…</p>
    </div>
  );
}
