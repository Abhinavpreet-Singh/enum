"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useAuth from "@/hooks/useAuth";

export default function PublicRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuthenticated = useAuth();

  const returnTo = searchParams.get("returnTo");

  useEffect(() => {
    if (isAuthenticated === true) {
      router.push(returnTo || "/dashboard");
    }
  }, [isAuthenticated, router, returnTo]);

  // Show content if not authenticated or still checking
  if (isAuthenticated === true) {
    return null;
  }

  return <>{children}</>;
}
