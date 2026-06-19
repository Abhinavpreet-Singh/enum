"use client";

import { useContext, useEffect, useState } from "react";
import { AuthContext } from "@/providers/AuthProvider";
import {
  type AccountType,
  type AccountSession,
  fetchAccountSession,
  purgeSpoofedAccountType,
  ACCOUNT_SESSION_UPDATED,
} from "@/lib/account-session";

export type { AccountType };

export type AccountSessionState = AccountSession & {
  isLoading: boolean;
};

export function useAccountSession(): AccountSessionState {
  const authCtx = useContext(AuthContext);

  // Fallback state (used when AuthProvider is unavailable)
  const [fallbackSession, setFallbackSession] = useState<AccountSessionState>({
    accountType: "student",
    verified: false,
    isLoading: true,
  });

  const hasProvider = authCtx !== null;

  useEffect(() => {
    // Only run the legacy fetch path when AuthProvider is not mounted
    if (hasProvider) return;

    let cancelled = false;

    const refresh = async () => {
      purgeSpoofedAccountType();
      const next = await fetchAccountSession();
      if (!cancelled) {
        setFallbackSession({ ...next, isLoading: false });
      }
    };

    refresh();

    const onUpdate = () => { refresh(); };
    window.addEventListener(ACCOUNT_SESSION_UPDATED, onUpdate);
    window.addEventListener("storage", onUpdate);

    const interval = window.setInterval(() => {
      if (localStorage.getItem("accountType") !== null) {
        purgeSpoofedAccountType();
        refresh();
      }
    }, 1000);

    return () => {
      cancelled = true;
      window.removeEventListener(ACCOUNT_SESSION_UPDATED, onUpdate);
      window.removeEventListener("storage", onUpdate);
      window.clearInterval(interval);
    };
  }, [hasProvider]);

  // When AuthProvider is present, derive state from it (no extra network call)
  if (authCtx !== null) {
    if (authCtx.loading) {
      return { accountType: "student", verified: false, isLoading: true };
    }
    return {
      accountType: authCtx.accountType,
      verified: true,
      isLoading: false,
    };
  }

  return fallbackSession;
}

/** Account type for nav/guards, resolved from the backend session endpoint. */
export default function useAccountType(): AccountType {
  const { accountType, verified, isLoading } = useAccountSession();

  if (isLoading || !verified) {
    return "student";
  }
  return accountType;
}
