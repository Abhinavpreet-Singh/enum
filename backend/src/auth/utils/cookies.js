const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const REFRESH_COOKIE_NAME = "rt";

const isCrossSiteDeployment = () => {
  if (process.env.COOKIE_CROSS_SITE === "true") return true;
  if ((process.env.NODE_ENV || "").toLowerCase() === "production") return true;
  if (process.env.RENDER === "true") return true;

  const frontendUrls = (process.env.FRONTEND_URLS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  return frontendUrls.some((url) => {
    try {
      const h = new URL(url).hostname;
      return h !== "localhost" && h !== "127.0.0.1";
    } catch {
      return false;
    }
  });
};

export function getRefreshCookieOptions() {
  const crossSite = isCrossSiteDeployment();
  const cookieDomain = process.env.COOKIE_DOMAIN?.trim();

  return {
    httpOnly: true,
    secure: crossSite,
    // "none" required for cross-subdomain (api.enum.live → www.enum.live);
    // "lax" safe for same-site localhost dev.
    sameSite: crossSite ? "none" : "lax",
    ...(cookieDomain ? { domain: cookieDomain } : {}),
    path: "/",
    maxAge: THIRTY_DAYS_MS,
  };
}

export function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE_NAME, token, getRefreshCookieOptions());
}

export function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    ...getRefreshCookieOptions(),
    maxAge: 0,
  });
}

export function getRefreshTokenFromRequest(req) {
  return req.cookies?.[REFRESH_COOKIE_NAME] || null;
}
