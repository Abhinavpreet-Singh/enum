"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/admin/overview");
  }, [router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="font-mono text-xs tracking-wider text-gray-400">
        Loading…
      </p>
    </div>
  );
}
