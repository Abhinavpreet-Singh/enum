import axios from "axios";

/**
 * Global Axios request interceptor.
 *
 * Modern browsers (Chrome 2024+) block third-party cookies by default.
 * Because our frontend (enum.live) and backend (enum-backend.onrender.com)
 * are on different domains, cookies set by the backend are treated as
 * third-party and silently dropped.
 *
 * To work around this, we always attach the JWT from localStorage as an
 * Authorization header.  The backend already accepts both cookies and
 * Bearer tokens (see auth.middleware.js → getAccessTokenFromRequest),
 * so this is a drop-in fix.
 *
 * This file should be imported once at the app root (e.g. via AxiosProvider)
 * to ensure the interceptor is registered before any API call fires.
 */

let interceptorRegistered = false;

export function setupAxiosInterceptors() {
  if (interceptorRegistered) return;
  interceptorRegistered = true;

  // ── Request interceptor: attach Bearer token + withCredentials ─────────
  axios.interceptors.request.use(
    (config) => {
      // Always send cookies (still useful for localhost / same-site deploys)
      config.withCredentials = true;

      // Attach token from localStorage if not already set
      if (typeof window !== "undefined" && !config.headers.Authorization) {
        const token = localStorage.getItem("accessToken");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }

      return config;
    },
    (error) => Promise.reject(error),
  );

  // ── Response interceptor: handle 401 gracefully ────────────────────────
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      // If the server says our token is invalid/expired and we're not
      // already on the login page, clear stale state so the UI reacts.
      if (
        error?.response?.status === 401 &&
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/login") &&
        !window.location.pathname.startsWith("/oauth-success")
      ) {
        // Don't redirect automatically — let each page decide.
        // But do clean up a clearly-invalid token.
        const token = localStorage.getItem("accessToken");
        if (token) {
          // Token exists but server rejected it → stale
          localStorage.removeItem("accessToken");
        }
      }
      return Promise.reject(error);
    },
  );
}
