"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";

export default function PublicRoute({
  children,
  returnTo,
}: {
  children: React.ReactNode;
  returnTo?: string;
}) {
  const router = useRouter();
  const isAuthenticated = useAuth();

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
