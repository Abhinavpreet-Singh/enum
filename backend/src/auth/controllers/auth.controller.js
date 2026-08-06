import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/apiError.js";
import {
  loginWithCredentials,
  loginWithOAuth,
  getMe,
  logoutSession,
  logoutAllSessions,
  getUserSessions,
  revokeSpecificSession,
} from "../services/auth.service.js";
import {
  setAuthCookies,
  clearRefreshCookie,
  getRefreshTokenFromRequest,
  getAccessTokenFromRequest,
} from "../utils/cookies.js";
import {
  generateAccessToken,
  generateRefreshToken,
  getAccessTokenExpiryDate,
  hashAccessToken,
  verifyAccessToken,
} from "../utils/tokens.js";
import { assertAccessTokenSession } from "../services/access-token.service.js";
import { rotateSession, findSessionByRefreshToken } from "../services/session.service.js";
import prisma from "../../db/index.js";

// ─── Session lookup helper ────────────────────────────────────────────────────

async function findSessionByToken(refreshToken, { onlyActive = true } = {}) {
  return findSessionByRefreshToken(refreshToken, { onlyActive });
}

function getIp(req) {
  return (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "")
    .toString()
    .split(",")[0]
    .trim();
}

function decodeOAuthState(state) {
  if (!state || typeof state !== "string") return null;
  try {
    return JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

// ─── POST /api/v1/auth/login ──────────────────────────────────────────────────

export const login = asyncHandler(async (req, res) => {
  const { email, username, password, accountType } = req.body;
  const userAgent = req.get("User-Agent") || "";
  const ipAddress = getIp(req);

  const result = await loginWithCredentials({
    email, username, password, accountType, userAgent, ipAddress,
  });

  if (result.requiresAccountSelection) {
    return res.status(200).json({
      message: "Multiple accounts match these credentials. Choose how you want to log in.",
      requiresAccountSelection: true,
      accountTypes: result.accountTypes,
    });
  }

  const { user, accessToken, refreshToken, accountType: resolvedAccountType } = result;

  setAuthCookies(res, { accessToken, refreshToken });

  return res.status(200).json({
    message: resolvedAccountType === "admin" ? "Admin logged in." : "Logged in.",
    data: user,
    accessToken,
    accountType: resolvedAccountType,
  });
});

// ─── POST /api/v1/auth/refresh ────────────────────────────────────────────────

export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = getRefreshTokenFromRequest(req);
  if (!refreshToken) throw new ApiError(401, "Refresh token missing.");

  const session = await findSessionByToken(refreshToken);
  if (!session) throw new ApiError(401, "Session expired or invalid. Please log in again.");

  const accountId = session.userId || session.organizationId;
  const accountType = session.accountType;

  const newRefreshToken = generateRefreshToken();
  let accessToken;
  if (accountType === "organization") {
    const org = await prisma.organization.findUnique({ where: { id: accountId } });
    if (!org) throw new ApiError(401, "Organization not found.");
    accessToken = generateAccessToken({
      userId: org.id, email: org.email, username: org.name,
      role: "Organization", accountType: "organization", sessionId: session.id,
    });
    await rotateSession(session.id, newRefreshToken, {
      accessTokenHash: hashAccessToken(accessToken),
      accessTokenExpiresAt: getAccessTokenExpiryDate(),
    });
    setAuthCookies(res, { accessToken, refreshToken: newRefreshToken });
    return res.status(200).json({ message: "Token refreshed.", accessToken, accountType: "organization" });
  }

  const dbUser = await prisma.user.findUnique({ where: { id: accountId } });
  if (!dbUser) throw new ApiError(401, "User not found.");
  const type = String(dbUser.role || "Student").toLowerCase() === "admin" ? "admin" : "student";
  accessToken = generateAccessToken({
    userId: dbUser.id, email: dbUser.email, username: dbUser.username,
    role: dbUser.role ?? "Student", accountType: type, sessionId: session.id,
  });
  await rotateSession(session.id, newRefreshToken, {
    accessTokenHash: hashAccessToken(accessToken),
    accessTokenExpiresAt: getAccessTokenExpiryDate(),
  });

  setAuthCookies(res, { accessToken, refreshToken: newRefreshToken });
  return res.status(200).json({ message: "Token refreshed.", accessToken, accountType: type });
});

// ─── GET /api/v1/auth/me ──────────────────────────────────────────────────────

async function respondWithMe(req, res, sessionId) {
  const result = await getMe({ sessionId });
  setAuthCookies(res, { accessToken: result.accessToken });
  return res.status(200).json({
    message: "Authenticated.",
    data: result.user,
    accessToken: result.accessToken,
    accountType: result.accountType,
  });
}

export const me = asyncHandler(async (req, res) => {
  const refreshToken = getRefreshTokenFromRequest(req);
  if (refreshToken) {
    const session = await findSessionByToken(refreshToken);
    if (!session) throw new ApiError(401, "Session expired. Please log in.");
    return respondWithMe(req, res, session.id);
  }

  const accessToken = getAccessTokenFromRequest(req);
  if (accessToken) {
    let decoded;
    try {
      decoded = verifyAccessToken(accessToken);
    } catch {
      throw new ApiError(401, "Not authenticated.");
    }

    await assertAccessTokenSession({ token: accessToken, decoded });
    const sessionId = decoded?.sid || decoded?.sessionId;
    if (!sessionId) throw new ApiError(401, "Not authenticated.");
    return respondWithMe(req, res, sessionId);
  }

  throw new ApiError(401, "Not authenticated.");
});

// ─── POST /api/v1/auth/logout ─────────────────────────────────────────────────

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = getRefreshTokenFromRequest(req);

  if (refreshToken) {
    const session = await findSessionByToken(refreshToken, { onlyActive: false });
    if (session) {
      await logoutSession({ sessionId: session.id });
    }
  }

  clearRefreshCookie(res);
  return res.status(200).json({ message: "Logged out." });
});

// ─── POST /api/v1/auth/logout-all ────────────────────────────────────────────

export const logoutAll = asyncHandler(async (req, res) => {
  if (req.accountType === "organization" && req.organization) {
    await logoutAllSessions({ organizationId: req.organization.id });
  } else if (req.user) {
    await logoutAllSessions({ userId: req.user.id });
  }

  clearRefreshCookie(res);
  return res.status(200).json({ message: "Logged out of all devices." });
});

// ─── GET /api/v1/auth/sessions ────────────────────────────────────────────────

export const listSessions = asyncHandler(async (req, res) => {
  let sessions;
  if (req.accountType === "organization" && req.organization) {
    sessions = await getUserSessions({ organizationId: req.organization.id });
  } else if (req.user) {
    sessions = await getUserSessions({ userId: req.user.id });
  } else {
    sessions = [];
  }

  return res.status(200).json({ message: "Sessions fetched.", data: sessions });
});

// ─── DELETE /api/v1/auth/sessions/:sessionId ─────────────────────────────────

export const deleteSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const refreshToken = getRefreshTokenFromRequest(req);
  let currentSessionId = null;

  if (refreshToken) {
    const session = await findSessionByToken(refreshToken, { onlyActive: false });
    if (session) currentSessionId = session.id;
  }

  await revokeSpecificSession({ sessionId, currentSessionId });
  return res.status(200).json({ message: "Session revoked." });
});

// ─── OAuth callback helper (used by auth.routes.js) ──────────────────────────

export const handleOAuthSuccess = async (req, res, userId) => {
  const userAgent = req.get("User-Agent") || "";
  const ipAddress = getIp(req);

  const { accessToken, refreshToken } = await loginWithOAuth({ userId, userAgent, ipAddress });

  setAuthCookies(res, { accessToken, refreshToken });

  // Redirect to /oauth-success/; access token is passed in the URL hash as a
  // fallback when cross-subdomain cookies are not yet available in the browser.
  const normalizeOrigin = (v) => v.replace(/\/+$/, "");
  const frontendBase = normalizeOrigin(process.env.FRONTEND_URL || "http://localhost:3000");

  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://enum.live",
    "https://www.enum.live",
    "https://exam.enum.live",
    "https://enum0.vercel.app",
    frontendBase,
    ...(process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "http://localhost:3000")
      .split(",")
      .map((s) => normalizeOrigin(s.trim()))
      .filter(Boolean),
  ]
    .filter(Boolean)
    .map(normalizeOrigin);

  const isAllowedFrontendUrl = (value) => {
    try {
      return allowedOrigins.includes(normalizeOrigin(new URL(value).origin));
    } catch {
      return false;
    }
  };

  const candidates = [
    decodeOAuthState(req.query.state)?.redirect,
    req.query.redirect,
    req.query.redirect_uri,
    req.query.successRedirect,
  ];

  const appendAccessTokenHash = (targetUrl) => {
    const url = new URL(targetUrl);
    url.hash = `accessToken=${encodeURIComponent(accessToken)}`;
    return url.toString();
  };

  for (const candidate of candidates) {
    if (typeof candidate !== "string" || !isAllowedFrontendUrl(candidate)) continue;
    try {
      return res.redirect(appendAccessTokenHash(new URL(candidate).toString()));
    } catch { /* ignore */ }
  }

  return res.redirect(appendAccessTokenHash(`${frontendBase}/oauth-success/`));
};
