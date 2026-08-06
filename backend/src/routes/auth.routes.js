import { Router } from "express";
import passport from "passport";

import "../auth/passport.js";
import { requireEnv, env } from "../config/env.js";
import { oauthSignupGate } from "../middlewares/feature-gate.middleware.js";
import { handleOAuthSuccess } from "../auth/controllers/auth.controller.js";

const router = Router();

const normalizeOrigin = (value) => value.replace(/\/+$/, "");

const allowedFrontendOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://enum.live",
  "https://www.enum.live",
  "https://enum0.vercel.app",
  env.FRONTEND_URL,
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

// Determine the frontend root URL for success and failure redirects.
// FRONTEND_URL is preferred, with FRONTEND_URLS as a fallback list.
const getDefaultFrontendUrl = () => {
  return new URL(env.FRONTEND_URL || env.FRONTEND_URL_FALLBACK || "http://localhost:3000");
};

const buildFrontendUrl = (pathname, params = {}) => {
  const url = new URL(pathname, getDefaultFrontendUrl());
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });
  return url;
};

const getFrontendRedirectUrl = (req, fallbackPath, fallbackParams = {}) => {
  const fallback = buildFrontendUrl(fallbackPath, fallbackParams);
  const candidates = [
    req.query.redirect,
    req.query.redirect_uri,
    req.query.successRedirect,
    req.query.failureRedirect,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    if (!isAllowedFrontendUrl(candidate)) continue;
    try {
      return new URL(candidate);
    } catch {
      continue;
    }
  }

  return fallback;
};

// On OAuth failure, redirect to the frontend login page with a clear error code.
const buildFailureRedirectUrl = (req, provider) => {
  return getFrontendRedirectUrl(req, "/login", {
    error: provider === "github" ? "github_auth_failed" : "google_auth_failed",
  }).toString();
};

function encodeOAuthState(req) {
  const redirectTarget = [
    req.query.successRedirect,
    req.query.redirect,
    req.query.redirect_uri,
  ].find((value) => typeof value === "string");

  if (!redirectTarget) return undefined;

  return Buffer.from(JSON.stringify({ redirect: redirectTarget })).toString(
    "base64url",
  );
}

function decodeOAuthState(state) {
  if (!state || typeof state !== "string") return null;
  try {
    return JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

// On successful OAuth login, create a session (refresh cookie) and redirect
// to /oauth-success without putting any token in the URL.
const respondWithOAuthSuccess = (req, res, userId) => {
  return handleOAuthSuccess(req, res, userId);
};

const ensureGoogleConfigured = (_req, res, next) => {
  if (
    !process.env.GOOGLE_CLIENT_ID ||
    !process.env.GOOGLE_CLIENT_SECRET ||
    !process.env.GOOGLE_CALLBACK_URL
  ) {
    return res.status(500).json({
      success: false,
      message:
        "Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL.",
    });
  }

  if (!passport._strategy("google")) {
    return res.status(500).json({
      success: false,
      message:
        "Google OAuth is not ready (missing strategy registration or callback URL mismatch)",
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
  oauthSignupGate,
  ensureGoogleConfigured,
  (req, res, next) => {
    console.log("[AUTH] Google login route hit", {
      path: req.path,
      fullUrl: req.originalUrl,
    });
    next();
  },
  (req, res, next) => {
    const state = encodeOAuthState(req);
    passport.authenticate("google", {
      session: false,
      scope: ["profile", "email"],
      ...(state ? { state } : {}),
    })(req, res, next);
  },
);

router.get("/google/callback", oauthSignupGate, (req, res, next) => {
  console.log("[AUTH] Google callback route hit", {
    path: req.path,
    fullUrl: req.originalUrl,
    query: req.query,
  });

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error("[AUTH] Google OAuth missing credentials");
    return res
      .status(500)
      .json({ success: false, message: "Google OAuth is not configured" });
  }
  if (!passport._strategy("google")) {
    console.error("[AUTH] Google strategy not registered");
    return res.status(500).json({
      success: false,
      message:
        "Google OAuth is not ready (missing BACKEND_URL or service public URL)",
    });
  }

  console.log("[AUTH] Passport authenticating with Google strategy");
  passport.authenticate("google", { session: false }, (err, user) => {
    if (err) {
      console.error("[AUTH] Google auth error:", err);
    }
    if (err || !user) {
      console.log("[AUTH] Google auth failed or no user, redirecting to failure");
      return res.redirect(buildFailureRedirectUrl(req, "google"));
    }

    console.log("[AUTH] Google auth successful, user:", { userId: user.id, email: user.email });
    return respondWithOAuthSuccess(req, res, user.id);
  })(req, res, next);
});

router.get(
  "/github",
  oauthSignupGate,
  ensureGithubConfigured,
  (req, res, next) => {
    const state = encodeOAuthState(req);
    passport.authenticate("github", {
      session: false,
      scope: ["user:email"],
      ...(state ? { state } : {}),
    })(req, res, next);
  },
);

router.get("/github/callback", oauthSignupGate, (req, res, next) => {
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
      return res.redirect(buildFailureRedirectUrl(req, "github"));
    }

    return respondWithOAuthSuccess(req, res, user.id);
  })(req, res, next);
});

export default router;
