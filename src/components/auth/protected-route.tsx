"use client";

import { useContext, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { AuthContext } from "@/providers/AuthProvider";
import { silentRefreshFromCookie } from "@/lib/api";
import {
  getMemoryToken,
  restoreMemoryTokenFromSession,
} from "@/lib/tokenStore";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuth();
  const authCtx = useContext(AuthContext);
  const recoveryAttemptedRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated !== false) {
      recoveryAttemptedRef.current = false;
      return;
    }

    if (recoveryAttemptedRef.current) {
      const query =
        typeof window !== "undefined" ? window.location.search : "";
      const returnTo = query ? `${pathname}${query}` : pathname;
      router.push(`/login/?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }

    recoveryAttemptedRef.current = true;
    let cancelled = false;

    (async () => {
      restoreMemoryTokenFromSession();

      const existingToken = getMemoryToken();
      if (existingToken) {
        if (cancelled) return;
        authCtx?.setAccessToken(existingToken);
        recoveryAttemptedRef.current = false;
        return;
      }

      const token = await silentRefreshFromCookie();
      if (cancelled) return;

      if (token) {
        authCtx?.setAccessToken(token);
        recoveryAttemptedRef.current = false;
        return;
      }

      const query =
        typeof window !== "undefined" ? window.location.search : "";
      const returnTo = query ? `${pathname}${query}` : pathname;
      router.push(`/login/?returnTo=${encodeURIComponent(returnTo)}`);
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, router, pathname, authCtx]);

  if (isAuthenticated === null || isAuthenticated === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-black border-r-transparent"></div>
          <p className="mt-4 font-mono text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
