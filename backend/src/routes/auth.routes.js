import { Router } from "express";
import passport from "passport";

import "../auth/passport.js";
import { requireEnv, env } from "../config/env.js";
import { generateToken } from "../utils/generateToken.js";
import { getAuthCookieOptions } from "../utils/cookieOptions.js";

const router = Router();

const normalizeOrigin = (value) => value.replace(/\/+$/, "");

const allowedFrontendOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://enum.live",
  "https://www.enum.live",
  "https://enum0.vercel.app",
  ...(env.FRONTEND_URLS || []),
]
  .filter(Boolean)
  .map(normalizeOrigin);

const isAllowedFrontendUrl = (value) => {
  try {
    const parsed = new URL(value);
    return allowedFrontendOrigins.includes(normalizeOrigin(parsed.origin));
  } catch {
    return false;
  }
};

const getFrontendRedirectUrl = (req, fallbackPath) => {
  const fallbackUrl = new URL(env.FRONTEND_URL_FALLBACK || "http://localhost:3000");
  const fallback = new URL(fallbackPath, fallbackUrl);
  const candidates = [
    req.query.redirect,
    req.query.redirect_uri,
    req.query.successRedirect,
    req.query.failureRedirect,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    if (!isAllowedFrontendUrl(candidate)) continue;
    return new URL(candidate);
  }

  return fallback;
};

const buildFailureRedirectUrl = (req) => {
  const redirectUrl = getFrontendRedirectUrl(req, "/login?oauthError=1");
  redirectUrl.searchParams.set("oauthError", "1");
  return redirectUrl.toString();
};

const respondWithOAuthSuccess = (req, res, token) => {
  const options = getAuthCookieOptions();
  const encodedToken = encodeURIComponent(token);
  const redirectUrl = getFrontendRedirectUrl(req, "/oauth-success");

  redirectUrl.searchParams.set("token", token);
  redirectUrl.searchParams.set("accessToken", token);
  redirectUrl.hash = `token=${encodedToken}`;

  return res
    .cookie("accessToken", token, options)
    .redirect(redirectUrl.toString());
};

const ensureGoogleConfigured = (_req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res
      .status(500)
      .json({ success: false, message: "Google OAuth is not configured" });
  }
  if (!passport._strategy("google")) {
    return res.status(500).json({
      success: false,
      message:
        "Google OAuth is not ready (missing BACKEND_URL or service public URL)",
    });
  }
  return next();
};

const ensureGithubConfigured = (_req, res, next) => {
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return res
      .status(500)
      .json({ success: false, message: "GitHub OAuth is not configured" });
  }
  if (!passport._strategy("github")) {
    return res.status(500).json({
      success: false,
      message:
        "GitHub OAuth is not ready (missing BACKEND_URL or service public URL)",
    });
  }
  return next();
};

router.get(
  "/google",
  ensureGoogleConfigured,
  passport.authenticate("google", {
    session: false,
    scope: ["profile", "email"],
  }),
);

router.get("/google/callback", (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res
      .status(500)
      .json({ success: false, message: "Google OAuth is not configured" });
  }
  if (!passport._strategy("google")) {
    return res.status(500).json({
      success: false,
      message:
        "Google OAuth is not ready (missing BACKEND_URL or service public URL)",
    });
  }

  passport.authenticate("google", { session: false }, (err, user) => {
    if (err || !user) {
      return res.redirect(buildFailureRedirectUrl(req));
    }

    const token = generateToken({ userId: user.id, email: user.email });
    return respondWithOAuthSuccess(req, res, token);
  })(req, res, next);
});

router.get(
  "/github",
  ensureGithubConfigured,
  passport.authenticate("github", {
    session: false,
    scope: ["user:email"],
  }),
);

router.get("/github/callback", (req, res, next) => {
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return res
      .status(500)
      .json({ success: false, message: "GitHub OAuth is not configured" });
  }
  if (!passport._strategy("github")) {
    return res.status(500).json({
      success: false,
      message:
        "GitHub OAuth is not ready (missing BACKEND_URL or service public URL)",
    });
  }

  passport.authenticate("github", { session: false }, (err, user) => {
    if (err || !user) {
      return res.redirect(buildFailureRedirectUrl(req));
    }

    const token = generateToken({ userId: user.id, email: user.email });
    return respondWithOAuthSuccess(req, res, token);
  })(req, res, next);
});

export default router;
