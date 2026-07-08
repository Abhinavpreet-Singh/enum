const LOCAL_DEV_API = "http://localhost:8000";

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Backend API origin. NEXT_PUBLIC_* is inlined at build time — set it in the
 * Docker build stage (or .env.local for dev), not only at container runtime.
 */
export const API_BASE_URL = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_API_BASE_URL ||
    (process.env.NODE_ENV === "production" ? "" : LOCAL_DEV_API),
);

/** Socket.IO server origin (defaults to API origin in dev). */
export const SOCKET_URL = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_SOCKET_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    (process.env.NODE_ENV === "production" ? "" : LOCAL_DEV_API),
);

if (process.env.NODE_ENV === "production" && !API_BASE_URL) {
  console.warn(
    "NEXT_PUBLIC_API_BASE_URL is not set at build time; API requests will fail.",
  );
}

/** Build an absolute backend URL for fetch() and OAuth redirects. */
export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
