const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const ACCESS_TOKEN_MS = 10 * 60 * 1000; // matches ACCESS_TOKEN_EXPIRY_SECONDS in tokens.js
const REFRESH_COOKIE_NAME = "refreshToken";
const ACCESS_COOKIE_NAME = "accessToken";
/** Legacy name — still accepted on read / cleared on logout. */
const LEGACY_REFRESH_COOKIE_NAME = "rt";

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

function getBaseCookieOptions() {
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
  };
}

export function getRefreshCookieOptions() {
  return {
    ...getBaseCookieOptions(),
    maxAge: THIRTY_DAYS_MS,
  };
}

export function getAccessCookieOptions() {
  return {
    ...getBaseCookieOptions(),
    maxAge: ACCESS_TOKEN_MS,
  };
}

/** Set refresh cookie only (legacy helper — prefer setAuthCookies). */
export function setRefreshCookie(res, token) {
  const options = getRefreshCookieOptions();
  res.cookie(REFRESH_COOKIE_NAME, token, options);
  // Keep writing `rt` briefly so older clients still work during rollout.
  res.cookie(LEGACY_REFRESH_COOKIE_NAME, token, options);
}

/** Set access + refresh cookies after login / refresh / OAuth. */
export function setAuthCookies(res, { accessToken, refreshToken }) {
  if (refreshToken) {
    setRefreshCookie(res, refreshToken);
  }
  if (accessToken) {
    res.cookie(ACCESS_COOKIE_NAME, accessToken, getAccessCookieOptions());
  }
}

export function clearRefreshCookie(res) {
  const refreshOptions = { ...getRefreshCookieOptions(), maxAge: 0 };
  const accessOptions = { ...getAccessCookieOptions(), maxAge: 0 };
  res.clearCookie(REFRESH_COOKIE_NAME, refreshOptions);
  res.clearCookie(LEGACY_REFRESH_COOKIE_NAME, refreshOptions);
  res.clearCookie(ACCESS_COOKIE_NAME, accessOptions);
}

export function getRefreshTokenFromRequest(req) {
  return (
    req.cookies?.[REFRESH_COOKIE_NAME] ||
    req.cookies?.[LEGACY_REFRESH_COOKIE_NAME] ||
    null
  );
}
