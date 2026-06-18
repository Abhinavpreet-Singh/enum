"use client";

import { useState, useEffect } from "react";
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
  const [session, setSession] = useState<AccountSessionState>({
    accountType: "student",
    verified: false,
    isLoading: true,
  });

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      purgeSpoofedAccountType();
      const next = await fetchAccountSession();
      if (!cancelled) {
        setSession({ ...next, isLoading: false });
      }
    };

    refresh();

    const onUpdate = () => {
      refresh();
    };

    window.addEventListener(ACCOUNT_SESSION_UPDATED, onUpdate);
    window.addEventListener("storage", onUpdate);

    // DevTools edits in the same tab do not fire "storage" — strip spoofed key periodically.
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
  }, []);

  return session;
}

/** Account type for nav/guards, resolved from the backend session endpoint. */
export default function useAccountType(): AccountType {
  const { accountType, verified, isLoading } = useAccountSession();

  if (isLoading || !verified) {
    return "student";
  }
  return accountType;
}
