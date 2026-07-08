import { apiUrl, API_BASE_URL } from "@/lib/api-config";
import { getMemoryToken } from "@/lib/tokenStore";

export type AccountType = "student" | "organization" | "admin";

export const ACCOUNT_SESSION_UPDATED = "enum:account-session-updated";

export type AccountSession = {
  accountType: AccountType;
  verified: boolean;
};

export function mapBackendAccountType(
  accountType?: string | null,
  role?: string | null,
): AccountType {
  if (accountType === "organization") return "organization";
  if (accountType === "admin" || role?.toLowerCase() === "admin") return "admin";
  return "student";
}

/** Remove stale client-writable identity keys — never used for authorization. */
export function purgeSpoofedAccountType() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accountType");
  localStorage.removeItem("adminEmail");
}

/**
 * Returns the in-memory access token.
 * No longer reads from localStorage.
 */
export function getAccessToken(): string | null {
  return getMemoryToken();
}

/** Fetch the authoritative account type from the backend session endpoint. */
export async function fetchAccountSession(): Promise<AccountSession> {
  purgeSpoofedAccountType();

  const token = getMemoryToken();
  if (!token) {
    // Try /me with cookie — may still be authenticated via refresh cookie
    try {
      const res = await fetch(apiUrl("/api/v1/auth/me"), {
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        const data = json?.data;
        return {
          accountType: mapBackendAccountType(
            json?.accountType,
            data?.role ?? data?.user?.role,
          ),
          verified: true,
        };
      }
    } catch { /* ignored */ }
    return { accountType: "student", verified: true };
  }

  try {
    const res = await fetch(apiUrl("/api/v1/auth/session"), {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });

    if (res.ok) {
      const json = await res.json();
      const data = json?.data;
      return {
        accountType: mapBackendAccountType(
          data?.accountType,
          data?.role ?? data?.user?.role,
        ),
        verified: true,
      };
    }

    return { accountType: "student", verified: true };
  } catch {
    return { accountType: "student", verified: true };
  }
}

export function notifyAccountSessionUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ACCOUNT_SESSION_UPDATED));
  }
}
