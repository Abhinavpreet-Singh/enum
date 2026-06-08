"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

function CollabRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams();
    for (const key of ["room", "roomId", "code", "invite"]) {
      const value = searchParams.get(key);
      if (value && value.trim()) {
        params.set(key, value.trim());
      }
    }
    router.replace(
      params.toString()
        ? `/dashboard/collab?${params.toString()}`
        : "/dashboard/collab",
    );
  }, [searchParams, router]);

  return null;
}

export default function CollabPage() {
  return (
    <Suspense fallback={null}>
      <CollabRedirect />
    </Suspense>
  );
}

