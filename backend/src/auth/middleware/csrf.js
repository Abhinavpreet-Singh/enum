/**
 * Origin / Referer allowlist check for cookie-authenticated state-changing
 * routes (login, refresh, logout).
 *
 * This guards against CSRF on endpoints that use the HttpOnly refresh cookie,
 * since SameSite alone is not always reliable across all browsers/setups.
 */
export function verifyCsrfOrigin(req, res, next) {
  const allowedOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "http://localhost:3000")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);

  // Always allow same-origin requests (backend-to-backend / server actions)
  const backendUrl = (process.env.BACKEND_URL || "http://localhost:8000").replace(/\/$/, "");
  allowedOrigins.push(backendUrl);

  const origin = req.get("Origin") || "";
  const referer = req.get("Referer") || "";

  if (!origin && !referer) {
    // Server-side rendered requests (no browser) — allow
    return next();
  }

  const check = (url) => {
    if (!url) return false;
    try {
      const { origin: o } = new URL(url);
      return allowedOrigins.some((a) => a === o || url.startsWith(a));
    } catch {
      return false;
    }
  };

  if (check(origin) || check(referer)) {
    return next();
  }

  return res.status(403).json({ message: "CSRF validation failed." });
}
