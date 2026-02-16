"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";

export default function PublicRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuth();

  useEffect(() => {
    if (isAuthenticated === true) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  // Show content if not authenticated or still checking
  if (isAuthenticated === true) {
    return null;
  }

  return <>{children}</>;
}
