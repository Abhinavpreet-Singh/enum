const normalize = (value = "") => value.trim().toLowerCase();

const isLocalUrl = (value = "") => {
  try {
    const { hostname } = new URL(value);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
};

const isCrossSiteDeployment = () => {
  // Explicit opt-in via env var
  if (process.env.COOKIE_CROSS_SITE === "true") {
    return true;
  }

  const nodeEnv = normalize(process.env.NODE_ENV);
  if (nodeEnv === "production") {
    return true;
  }

  // Render.com sets RENDER=true on all services
  if (process.env.RENDER === "true") {
    return true;
  }

  // If any configured frontend URL is non-local, we are cross-site
  const frontendUrls = (process.env.FRONTEND_URLS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return frontendUrls.some((url) => !isLocalUrl(url));
};

export const getAuthCookieOptions = () => {
  const crossSite = isCrossSiteDeployment();

  return {
    httpOnly: true,
    secure: crossSite,
    sameSite: crossSite ? "none" : "lax",
    path: "/",
    // Persist cookies across browser sessions (match the JWT expiry)
    maxAge: 24 * 60 * 60 * 1000, // 1 day (matches ACCESS_TOKEN_EXPIRY)
  };
};
