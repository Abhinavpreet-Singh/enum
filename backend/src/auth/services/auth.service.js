import bcrypt from "bcrypt";
import prisma from "../../db/index.js";
import { ApiError } from "../../utils/apiError.js";
import { assertOrganizationApproved } from "../../utils/organizationApproval.js";
import {
  generateAccessToken,
  generateRefreshToken,
  getAccessTokenExpiryDate,
  hashAccessToken,
} from "../utils/tokens.js";
import {
  createSession,
  findSession,
  rotateSession,
  storeAccessToken,
  revokeSession,
  revokeAllSessions,
  listActiveSessions,
} from "./session.service.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getUserAccountType(user) {
  return String(user?.role || "Student").toLowerCase() === "admin"
    ? "admin"
    : "student";
}

function safeUser(user) {
  const { password, refreshToken, ...safe } = user;
  return safe;
}

function safeOrg(org) {
  const { password, refreshToken, ...safe } = org;
  return safe;
}

function normalizeAccountType(accountType) {
  const normalized = String(accountType || "").toLowerCase();
  if (normalized === "user") return "student";
  if (["student", "admin", "organization"].includes(normalized)) return normalized;
  return null;
}

function buildAccessPayloadForUser(user) {
  const accountType = getUserAccountType(user);
  return {
    userId: user.id,
    email: user.email,
    username: user.username,
    role: user.role ?? "Student",
    accountType,
  };
}

function buildAccessPayloadForOrg(org) {
  return {
    userId: org.id,
    email: org.email,
    username: org.name,
    role: "Organization",
    accountType: "organization",
  };
}

async function issueTokens({ userId = null, organizationId = null, accountType, payload, userAgent, ipAddress }) {
  const refreshToken = generateRefreshToken();
  const session = await createSession({ userId, organizationId, accountType, refreshToken, userAgent, ipAddress });
  const accessToken = generateAccessToken({ ...payload, sessionId: session.id });
  await storeAccessToken(session.id, {
    accessTokenHash: hashAccessToken(accessToken),
    accessTokenExpiresAt: getAccessTokenExpiryDate(),
  });
  return { accessToken, refreshToken };
}

async function loginUserAccount(user, { password, userAgent, ipAddress }) {
  if (!user.password) throw new ApiError(401, "Please log in with Google or GitHub.");
  if (!(await bcrypt.compare(password, user.password))) throw new ApiError(401, "Invalid password.");
  const accountType = getUserAccountType(user);
  const { accessToken, refreshToken } = await issueTokens({
    userId: user.id,
    accountType,
    payload: buildAccessPayloadForUser(user),
    userAgent,
    ipAddress,
  });
  return { user: safeUser(user), accessToken, refreshToken, accountType };
}

async function loginOrganizationAccount(org, { password, userAgent, ipAddress }) {
  if (!(await bcrypt.compare(password, org.password))) throw new ApiError(401, "Invalid password.");
  assertOrganizationApproved(org);
  const { accessToken, refreshToken } = await issueTokens({
    organizationId: org.id,
    accountType: "organization",
    payload: buildAccessPayloadForOrg(org),
    userAgent,
    ipAddress,
  });
  return { user: safeOrg(org), accessToken, refreshToken, accountType: "organization" };
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function loginWithCredentials({ email, username, password, accountType, userAgent, ipAddress }) {
  if (!email && !username) throw new ApiError(400, "Email or username is required.");
  if (!password) throw new ApiError(400, "Password is required.");

  const requestedAccountType = normalizeAccountType(accountType);

  if (username && !email) {
    const user = await prisma.user.findFirst({ where: { username: username.toLowerCase() } });
    const org = await prisma.organization.findFirst({ where: { name: username } });

    if (requestedAccountType === "organization") {
      if (!org) throw new ApiError(404, "No organization account found with that username.");
      return loginOrganizationAccount(org, { password, userAgent, ipAddress });
    }

    if (requestedAccountType === "student" || requestedAccountType === "admin") {
      if (!user) throw new ApiError(404, "No user account found with that username.");
      const userAccountType = getUserAccountType(user);
      if (requestedAccountType !== userAccountType) {
        throw new ApiError(404, "No account found for the selected role.");
      }
      return loginUserAccount(user, { password, userAgent, ipAddress });
    }

    const userPasswordMatches =
      Boolean(user?.password) && (await bcrypt.compare(password, user.password));
    const orgPasswordMatches =
      Boolean(org?.password) && (await bcrypt.compare(password, org.password));

    if (userPasswordMatches && orgPasswordMatches) {
      return {
        requiresAccountSelection: true,
        accountTypes: [getUserAccountType(user), "organization"],
      };
    }

    if (userPasswordMatches) {
      return loginUserAccount(user, { password, userAgent, ipAddress });
    }

    if (orgPasswordMatches) {
      return loginOrganizationAccount(org, { password, userAgent, ipAddress });
    }

    if (user && !user.password) throw new ApiError(401, "Please log in with Google or GitHub.");
    if (user || org) throw new ApiError(401, "Invalid password.");
    if (!user) throw new ApiError(404, "No account found with that username.");
  }

  // Email can belong to a student/admin account, an organization account, or both.
  const user = await prisma.user.findUnique({ where: { email } });
  const org = await prisma.organization.findUnique({ where: { email } });

  if (requestedAccountType === "organization") {
    if (!org) throw new ApiError(404, "No organization account found with that email.");
    return loginOrganizationAccount(org, { password, userAgent, ipAddress });
  }

  if (requestedAccountType === "student" || requestedAccountType === "admin") {
    if (!user) throw new ApiError(404, "No user account found with that email.");
    const userAccountType = getUserAccountType(user);
    if (requestedAccountType !== userAccountType) {
      throw new ApiError(404, "No account found for the selected role.");
    }
    return loginUserAccount(user, { password, userAgent, ipAddress });
  }

  const userPasswordMatches =
    Boolean(user?.password) && (await bcrypt.compare(password, user.password));
  const orgPasswordMatches =
    Boolean(org?.password) && (await bcrypt.compare(password, org.password));

  if (userPasswordMatches && orgPasswordMatches) {
    return {
      requiresAccountSelection: true,
      accountTypes: [getUserAccountType(user), "organization"],
    };
  }

  if (userPasswordMatches) {
    return loginUserAccount(user, { password, userAgent, ipAddress });
  }

  if (orgPasswordMatches) {
    return loginOrganizationAccount(org, { password, userAgent, ipAddress });
  }

  if (user && !user.password) throw new ApiError(401, "Please log in with Google or GitHub.");
  if (user || org) throw new ApiError(401, "Invalid password.");
  throw new ApiError(404, "No account found. Please check your credentials or register first.");
}

// ─── OAuth session creation ───────────────────────────────────────────────────

export async function loginWithOAuth({ userId, userAgent, ipAddress }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "User not found.");
  const accountType = getUserAccountType(user);
  const { accessToken, refreshToken } = await issueTokens({
    userId: user.id,
    accountType,
    payload: buildAccessPayloadForUser(user),
    userAgent,
    ipAddress,
  });
  return { user: safeUser(user), accessToken, refreshToken, accountType };
}

// ─── Refresh ──────────────────────────────────────────────────────────────────

/**
 * Validate the refresh token, rotate session, issue a new access token.
 * The old refresh token must never work again.
 */
export async function refreshSession({ refreshToken, accountId, accountType, userAgent, ipAddress }) {
  if (!refreshToken) throw new ApiError(401, "Refresh token missing.");

  const isOrg = accountType === "organization";
  const session = await findSession(refreshToken, isOrg ? { organizationId: accountId } : { userId: accountId });

  if (!session) throw new ApiError(401, "Session expired or invalid.");

  const newRefreshToken = generateRefreshToken();
  await rotateSession(session.id, newRefreshToken);

  let accessToken;
  if (isOrg) {
    const org = await prisma.organization.findUnique({ where: { id: accountId } });
    if (!org) throw new ApiError(401, "Organization not found.");
    accessToken = generateAccessToken({ ...buildAccessPayloadForOrg(org), sessionId: session.id });
    await storeAccessToken(session.id, {
      accessTokenHash: hashAccessToken(accessToken),
      accessTokenExpiresAt: getAccessTokenExpiryDate(),
    });
    return { accessToken, refreshToken: newRefreshToken, user: safeOrg(org), accountType: "organization" };
  }

  const user = await prisma.user.findUnique({ where: { id: accountId } });
  if (!user) throw new ApiError(401, "User not found.");
  const type = getUserAccountType(user);
  accessToken = generateAccessToken({ ...buildAccessPayloadForUser(user), sessionId: session.id });
  await storeAccessToken(session.id, {
    accessTokenHash: hashAccessToken(accessToken),
    accessTokenExpiresAt: getAccessTokenExpiryDate(),
  });
  return { accessToken, refreshToken: newRefreshToken, user: safeUser(user), accountType: type };
}

// ─── Me (app initialization) ──────────────────────────────────────────────────

/**
 * Validates the session stored in the refresh cookie, issues a fresh access
 * token, and returns the user/org object. Called on every page load.
 */
export async function getMe({ sessionId }) {
  // Session was already validated in the controller via verifyRefreshCookie.
  // Just return the fresh access token + user data.
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session || session.revoked || session.expiresAt < new Date()) {
    throw new ApiError(401, "Session expired.");
  }

  if (session.accountType === "organization") {
    const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
    if (!org) throw new ApiError(401, "Organization not found.");
    const accessToken = generateAccessToken({ ...buildAccessPayloadForOrg(org), sessionId });
    await storeAccessToken(sessionId, {
      accessTokenHash: hashAccessToken(accessToken),
      accessTokenExpiresAt: getAccessTokenExpiryDate(),
    });
    return { user: safeOrg(org), accessToken, accountType: "organization" };
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) throw new ApiError(401, "User not found.");
  const accountType = getUserAccountType(user);
  const accessToken = generateAccessToken({ ...buildAccessPayloadForUser(user), sessionId });
  await storeAccessToken(sessionId, {
    accessTokenHash: hashAccessToken(accessToken),
    accessTokenExpiresAt: getAccessTokenExpiryDate(),
  });
  return { user: safeUser(user), accessToken, accountType };
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logoutSession({ sessionId }) {
  if (!sessionId) return;
  try {
    await revokeSession(sessionId);
  } catch {
    // Ignore if session is already gone.
  }
}

export async function logoutAllSessions({ userId = null, organizationId = null }) {
  await revokeAllSessions({ userId, organizationId });
}

// ─── Session listing ──────────────────────────────────────────────────────────

export async function getUserSessions({ userId = null, organizationId = null }) {
  return listActiveSessions({ userId, organizationId });
}

export async function revokeSpecificSession({ sessionId, currentSessionId }) {
  if (sessionId === currentSessionId) throw new ApiError(400, "Cannot revoke current session this way — use logout.");
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new ApiError(404, "Session not found.");
  await revokeSession(sessionId);
}
