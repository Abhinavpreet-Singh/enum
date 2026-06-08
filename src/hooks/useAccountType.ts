"use client";

import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

export type AccountType = "student" | "company" | "college" | "recruiter" | "admin";

interface TokenPayload {
  accountType?: string;
  accountRole?: string;
}

function detect(): AccountType {
  if (typeof window === "undefined") return "student";
  const stored = localStorage.getItem("accountType");
  if (stored === "company" || stored === "college") return stored;
  try {
    const token = localStorage.getItem("accessToken");
    if (token) {
      const decoded = jwtDecode<TokenPayload>(token);
      if (decoded.accountType === "company") return "company";
      if (decoded.accountType === "college") return "college";
      if (decoded.accountRole === "recruiter") return "recruiter";
      if (decoded.accountRole === "admin") return "admin";
    }
  } catch {}
  return "student";
}

export default function useAccountType(): AccountType {
  const [accountType, setAccountType] = useState<AccountType>(detect);

  useEffect(() => {
    const sync = () => setAccountType(detect());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  return accountType;
}
