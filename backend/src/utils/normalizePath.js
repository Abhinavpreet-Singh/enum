/**
 * Normalize a page URL or pathname to a canonical path (leading slash, no trailing slash).
 * @param {string} input - Full URL or pathname
 * @returns {string}
 */
export function normalizePagePath(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";

  let path = raw;
  try {
    if (/^https?:\/\//i.test(raw)) {
      path = new URL(raw).pathname;
    }
  } catch {
    // Treat as pathname
  }

  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path;
}
