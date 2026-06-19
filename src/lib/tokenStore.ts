/**
 * Module-level in-memory access token store.
 * AuthProvider is the only writer; api.ts reads from here via interceptor.
 * No localStorage/sessionStorage — token lives only in JS memory.
 */

let _accessToken: string | null = null;

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
}

export function clearMemoryToken(): void {
  purgePersistedAccessToken();
  _accessToken = null;
}
