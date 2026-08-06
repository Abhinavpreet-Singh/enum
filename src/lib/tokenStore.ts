/**
 * Access token store: in-memory for API interceptors, sessionStorage for tab
 * reload survival (cleared when the tab closes — not localStorage).
 */

let _accessToken: string | null = null;

const OAUTH_HANDOFF_KEY = "enum:oauth-handoff";
const SESSION_ACCESS_KEY = "enum:session-access-token";

export function purgePersistedAccessToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("Name");
  localStorage.removeItem("displayName");
  localStorage.removeItem("id");
  sessionStorage.removeItem("accessToken");
  sessionStorage.removeItem("Name");
  sessionStorage.removeItem("displayName");
  sessionStorage.removeItem("id");
}

export function getMemoryToken(): string | null {
  purgePersistedAccessToken();
  return _accessToken;
}

export function setMemoryToken(token: string | null): void {
  purgePersistedAccessToken();
  _accessToken = token;
  if (typeof window === "undefined") return;
  if (token) {
    sessionStorage.setItem(SESSION_ACCESS_KEY, token);
  } else {
    sessionStorage.removeItem(SESSION_ACCESS_KEY);
  }
}

export function clearMemoryToken(): void {
  purgePersistedAccessToken();
  _accessToken = null;
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(SESSION_ACCESS_KEY);
    sessionStorage.removeItem(OAUTH_HANDOFF_KEY);
  }
}

/** Restore token after a full page reload within the same tab. */
export function restoreMemoryTokenFromSession(): string | null {
  if (typeof window === "undefined") return null;
  purgePersistedAccessToken();
  const token = sessionStorage.getItem(SESSION_ACCESS_KEY);
  if (!token) return null;
  _accessToken = token;
  return token;
}

/** Short-lived bridge across OAuth full-page redirects (sessionStorage only). */
export function persistOAuthHandoff(token: string): void {
  if (typeof window === "undefined" || !token) return;
  sessionStorage.setItem(OAUTH_HANDOFF_KEY, token);
}

export function consumeOAuthHandoff(): string | null {
  if (typeof window === "undefined") return null;
  const token = sessionStorage.getItem(OAUTH_HANDOFF_KEY);
  if (token) sessionStorage.removeItem(OAUTH_HANDOFF_KEY);
  return token;
}

export const AUTH_SESSION_EXPIRED_EVENT = "enum:auth-session-expired";

export function notifyAuthSessionExpired(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT));
}
