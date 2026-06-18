import { proxy } from "@/app/proxy";

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

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
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
      const data = json?.data;
      return {
        accountType: mapBackendAccountType(
          data?.accountType,
          data?.role ?? data?.user?.role,
        ),
        verified: true,
      };
    }

    if (res.status === 401) {
      localStorage.removeItem("accessToken");
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
