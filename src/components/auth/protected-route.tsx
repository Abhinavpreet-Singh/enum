"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import useAuth from "@/hooks/useAuth";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuth();

  useEffect(() => {
    if (isAuthenticated === false) {
      const query =
        typeof window !== "undefined" ? window.location.search : "";
      const returnTo = query ? `${pathname}${query}` : pathname;

      router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }, [isAuthenticated, router, pathname]);

  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-black border-r-transparent"></div>
          <p className="mt-4 font-mono text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render content if not authenticated
  if (isAuthenticated === false) {
    return null;
  }

  return <>{children}</>;
}
