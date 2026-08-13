const required = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const parseList = (key) =>
  (process.env[key] || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/** Strip trailing slashes: https://api.enum.live/ → https://api.enum.live */
const stripTrailingSlashes = (value = "") => String(value).trim().replace(/\/+$/, "");

/**
 * Normalize absolute URLs used for OAuth callbacks / public origins.
 * Fixes https://api.enum.live//auth/... from BACKEND_URL ending with /.
 */
const normalizeAbsoluteUrl = (value) => {
  if (!value) return undefined;
  try {
    const url = new URL(String(value).trim());
    url.pathname = url.pathname.replace(/\/{2,}/g, "/");
    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString();
  } catch {
    return stripTrailingSlashes(value);
  }
};

const backendUrl = stripTrailingSlashes(
  process.env.BACKEND_URL || "http://localhost:8000",
);

const googleCallbackUrl =
  normalizeAbsoluteUrl(process.env.GOOGLE_CALLBACK_URL) ||
  `${backendUrl}/auth/google/callback`;

const githubCallbackUrl =
  normalizeAbsoluteUrl(process.env.GITHUB_CALLBACK_URL) ||
  `${backendUrl}/auth/github/callback`;

// Keep process.env in sync so passport + route guards see the same values.
process.env.BACKEND_URL = backendUrl;
process.env.GOOGLE_CALLBACK_URL = googleCallbackUrl;
process.env.GITHUB_CALLBACK_URL = githubCallbackUrl;
if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL = stripTrailingSlashes(process.env.FRONTEND_URL);
}

export const env = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: googleCallbackUrl,
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
  GITHUB_CALLBACK_URL: githubCallbackUrl,
  JWT_SECRET: process.env.JWT_SECRET,
  BACKEND_URL: backendUrl,
  FRONTEND_URL: process.env.FRONTEND_URL,
  FRONTEND_URLS: parseList("FRONTEND_URLS").map(stripTrailingSlashes),
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
  FRONTEND_URL_FALLBACK:
    process.env.FRONTEND_URL ||
    parseList("FRONTEND_URLS").map(stripTrailingSlashes)[0] ||
    "http://localhost:3000",
};

export const requireEnv = required;
