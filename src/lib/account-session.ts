import { jwtDecode } from "jwt-decode";
import { proxy } from "@/app/proxy";

export type AccountType = "student" | "organization" | "admin";

export const ACCOUNT_SESSION_UPDATED = "enum:account-session-updated";

interface TokenPayload {
  accountType?: string;
  accountRole?: string;
}

export type AccountSession = {
  accountType: AccountType;
  verified: boolean;
};

export function mapBackendAccountType(value?: string | null): AccountType {
  if (value === "admin") return "admin";
  if (value === "organization") return "organization";
  return "student";
}

/** Remove client-writable role key — never used for authorization. */
export function purgeSpoofedAccountType() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accountType");
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

/** Derive account type from the signed JWT only — never from localStorage. */
export function decodeAccountTypeFromToken(token: string | null): AccountType | null {
  if (!token) return null;
  try {
    const decoded = jwtDecode<TokenPayload>(token);
    if (decoded.accountType === "admin" || decoded.accountRole === "admin") {
      return "admin";
    }
    if (decoded.accountType === "organization") return "organization";
    return "student";
  } catch {
    return null;
  }
}

export function decodeAccountTypeFromStorage(): AccountType {
  purgeSpoofedAccountType();
  return decodeAccountTypeFromToken(getAccessToken()) ?? "student";
}

/** Fetch the authoritative account type from the backend session endpoint. */
export async function fetchAccountSession(): Promise<AccountSession> {
  purgeSpoofedAccountType();

  const token = getAccessToken();
  if (!token) {
    return { accountType: "student", verified: true };
  }

  try {
    const res = await fetch(`${proxy}/api/v1/auth/session`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });

    if (res.ok) {
      const json = await res.json();
      return {
        accountType: mapBackendAccountType(json?.data?.accountType),
        verified: true,
      };
    }

    if (res.status === 401) {
      return {
        accountType: decodeAccountTypeFromToken(token) ?? "student",
        verified: true,
      };
    }

    // Session endpoint unavailable — fall back to JWT only, never localStorage.
    return {
      accountType: decodeAccountTypeFromToken(token) ?? "student",
      verified: true,
    };
  } catch {
    return {
      accountType: decodeAccountTypeFromToken(token) ?? "student",
      verified: true,
    };
  }
}

export function notifyAccountSessionUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ACCOUNT_SESSION_UPDATED));
  }
}
