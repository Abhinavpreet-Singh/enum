/** Normalize a full URL or pathname to a canonical path. */
export function normalizePagePath(input: string): string {
  const raw = input.trim();
  if (!raw) return "";

  let path = raw;
  try {
    if (/^https?:\/\//i.test(raw)) {
      path = new URL(raw).pathname;
    }
  } catch {
    // pathname input
  }

  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path;
}
