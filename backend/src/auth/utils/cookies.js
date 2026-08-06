const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const ACCESS_TOKEN_MS = 10 * 60 * 1000; // matches ACCESS_TOKEN_EXPIRY_SECONDS in tokens.js
const REFRESH_COOKIE_NAME = "refreshToken";
const ACCESS_COOKIE_NAME = "accessToken";
/** Legacy name — still accepted on read / cleared on logout. */
const LEGACY_REFRESH_COOKIE_NAME = "rt";

function parseHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function getRegistrableDomain(hostname) {
  if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") {
    return null;
  }
  const parts = hostname.split(".");
  if (parts.length < 2) return hostname;
  return parts.slice(-2).join(".");
}

function hostBelongsToRegistrableDomain(hostname, registrableDomain) {
  if (!hostname || !registrableDomain) return false;
  return (
    hostname === registrableDomain ||
    hostname.endsWith(`.${registrableDomain}`)
  );
}

function getDeploymentUrls() {
  return [
    process.env.BACKEND_URL,
    process.env.FRONTEND_URL,
    ...(process.env.FRONTEND_URLS || "").split(","),
  ]
    .map((value) => value?.trim())
    .filter(Boolean);
}

function sharesRegistrableDomain(urlA, urlB) {
  const hostA = parseHostname(urlA);
  const hostB = parseHostname(urlB);
  if (!hostA || !hostB) return false;
  const regA = getRegistrableDomain(hostA);
  const regB = getRegistrableDomain(hostB);
  return Boolean(regA && regB && regA === regB);
}

/**
 * True when the API and frontend are on different registrable domains
 * (e.g. enum.live + onrender.com). Subdomains of the same domain
 * (api.enum.live + www.enum.live) are same-site and should use lax cookies.
 */
const isCrossSiteDeployment = () => {
  if (process.env.COOKIE_CROSS_SITE === "true") return true;
  if (process.env.COOKIE_CROSS_SITE === "false") return false;

  const backendUrl = process.env.BACKEND_URL?.trim();
  if (!backendUrl) {
    if ((process.env.NODE_ENV || "").toLowerCase() === "production") return true;
    if (process.env.RENDER === "true") return true;

    return getDeploymentUrls().some((url) => {
      const host = parseHostname(url);
      return host && host !== "localhost" && host !== "127.0.0.1";
    });
  }

  const frontendUrls = getDeploymentUrls().filter((url) => url !== backendUrl);
  for (const frontendUrl of frontendUrls) {
    if (!sharesRegistrableDomain(backendUrl, frontendUrl)) {
      return true;
    }
  }

  return false;
};

function inferCookieDomain(backendHostname) {
  const explicit = process.env.COOKIE_DOMAIN?.trim();
  if (explicit) {
    const registrable = explicit.replace(/^\./, "");
    if (
      backendHostname &&
      !hostBelongsToRegistrableDomain(backendHostname, registrable)
    ) {
      return undefined;
    }
    return explicit.startsWith(".") ? explicit : `.${explicit}`;
  }

  if (isCrossSiteDeployment()) {
    return undefined;
  }

  if (!backendHostname) return undefined;

  const registrableDomain = getRegistrableDomain(backendHostname);
  if (!registrableDomain || registrableDomain === "localhost") {
    return undefined;
  }

  if (
    hostBelongsToRegistrableDomain(backendHostname, registrableDomain) &&
    backendHostname !== registrableDomain
  ) {
    return `.${registrableDomain}`;
  }

  return undefined;
}

function getBaseCookieOptions() {
  const crossSite = isCrossSiteDeployment();
  const backendHostname =
    parseHostname(process.env.BACKEND_URL) || parseHostname(process.env.FRONTEND_URL);
  const cookieDomain = inferCookieDomain(backendHostname);
  const isProduction = (process.env.NODE_ENV || "").toLowerCase() === "production";

  return {
    httpOnly: true,
    secure: isProduction || crossSite,
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

export function getAccessTokenFromRequest(req) {
  const header = req.header("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (match) return match[1].trim();
  return req.cookies?.[ACCESS_COOKIE_NAME] || null;
}
