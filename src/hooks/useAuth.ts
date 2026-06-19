"use client";

import { useContext } from "react";
import { AuthContext } from "@/providers/AuthProvider";

/**
 * Returns `true` when authenticated, `false` when not, or `null` while the
 * initial /me check is still in flight — matching the existing contract so
 * ProtectedRoute keeps working without changes.
 */
export default function useAuth(): boolean | null {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    // AuthProvider not yet mounted (SSR or outer layout usage) — treat as loading.
    return null;
  }

  if (ctx.loading) return null;
  return ctx.authenticated;
}
