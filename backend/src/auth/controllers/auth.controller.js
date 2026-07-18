import bcrypt from "bcrypt";
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
} from "../utils/cookies.js";
import {
  generateAccessToken,
  generateRefreshToken,
  getAccessTokenExpiryDate,
  hashAccessToken,
} from "../utils/tokens.js";
import { rotateSession } from "../services/session.service.js";
import prisma from "../../db/index.js";

// ─── Session lookup helper ────────────────────────────────────────────────────

async function findSessionByToken(refreshToken, { onlyActive = true } = {}) {
  const where = onlyActive
    ? { revoked: false, expiresAt: { gt: new Date() } }
    : { revoked: false };

  const sessions = await prisma.session.findMany({ where });

  for (const s of sessions) {
    if (await bcrypt.compare(refreshToken, s.refreshTokenHash)) {
      return s;
    }
  }
  return null;
}

function getIp(req) {
  return (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "")
    .toString()
    .split(",")[0]
    .trim();
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

export const me = asyncHandler(async (req, res) => {
  const refreshToken = getRefreshTokenFromRequest(req);
  if (!refreshToken) throw new ApiError(401, "Not authenticated.");

  const session = await findSessionByToken(refreshToken);
  if (!session) throw new ApiError(401, "Session expired. Please log in.");

  const result = await getMe({ sessionId: session.id });

  setAuthCookies(res, { accessToken: result.accessToken });

  return res.status(200).json({
    message: "Authenticated.",
    data: result.user,
    accessToken: result.accessToken,
    accountType: result.accountType,
  });
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

  // Redirect to /oauth-success WITHOUT any token in the URL.
  // The frontend page will call GET /api/v1/auth/me with the cookie.
  const normalizeOrigin = (v) => v.replace(/\/+$/, "");
  const frontendBase = normalizeOrigin(process.env.FRONTEND_URL || "http://localhost:3000");

  // Allow candidate-supplied redirect if it's in allowed origins
  const allowedOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "http://localhost:3000")
    .split(",")
    .map((s) => normalizeOrigin(s.trim()))
    .filter(Boolean);

  let redirectBase = frontendBase;
  const candidate = req.query.redirect || req.query.redirect_uri;
  if (candidate) {
    try {
      const { origin } = new URL(candidate);
      if (allowedOrigins.includes(normalizeOrigin(origin))) {
        redirectBase = normalizeOrigin(origin);
      }
    } catch { /* ignore */ }
  }

  return res.redirect(`${redirectBase}/oauth-success`);
};
