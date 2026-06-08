"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

function LinuxArenaRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const id = searchParams.get("id");
    router.replace(
      id
        ? `/dashboard/simulations/linux?id=${encodeURIComponent(id)}`
        : "/dashboard/simulations/linux",
    );
  }, [searchParams, router]);

  return null;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LinuxArenaRedirect />
    </Suspense>
  );
}

