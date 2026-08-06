import bcrypt from "bcrypt";
import prisma from "../../db/index.js";
import { hashRefreshTokenLookup } from "../utils/tokens.js";

const BCRYPT_ROUNDS = 10;
const SESSION_EXPIRY_DAYS = 30;

function sessionExpiresAt() {
  const d = new Date();
  d.setDate(d.getDate() + SESSION_EXPIRY_DAYS);
  return d;
}

/**
 * Create a new session row, storing only the bcrypt hash of the refresh token.
 * Exactly one of userId or organizationId must be provided.
 */
export async function createSession({
  userId = null,
  organizationId = null,
  accountType,
  refreshToken,
  accessTokenHash = null,
  accessTokenExpiresAt = null,
  userAgent = "",
  ipAddress = "",
}) {
  if (!userId && !organizationId) {
    throw new Error("Session requires userId or organizationId");
  }
  const refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);

  return prisma.session.create({
    data: {
      ...(userId ? { userId } : {}),
      ...(organizationId ? { organizationId } : {}),
      accountType,
      refreshTokenHash,
      refreshTokenLookup: hashRefreshTokenLookup(refreshToken),
      accessTokenHash,
      accessTokenExpiresAt,
      userAgent: userAgent.slice(0, 512),
      ipAddress: ipAddress.slice(0, 64),
      expiresAt: sessionExpiresAt(),
      lastUsed: new Date(),
    },
  });
}

/**
 * Locate a session from a plaintext refresh token using the indexed lookup hash,
 * then confirm it with bcrypt. `scope` optionally restricts the match to one
 * account, and `onlyActive` controls whether expired sessions are considered.
 *
 * Sessions created before `refreshTokenLookup` existed have no lookup value, so a
 * bounded legacy scan over only those rows is used as a fallback. That set drains
 * to empty as sessions rotate, and never matches once it is empty.
 */
async function locateSessionByRefreshToken(
  refreshToken,
  { userId = null, organizationId = null, onlyActive = true } = {},
) {
  if (!refreshToken) return null;

  const activeFilter = onlyActive
    ? { revoked: false, expiresAt: { gt: new Date() } }
    : { revoked: false };
  const scope = userId ? { userId } : organizationId ? { organizationId } : {};

  const candidate = await prisma.session.findUnique({
    where: { refreshTokenLookup: hashRefreshTokenLookup(refreshToken) },
  });

  if (candidate) {
    const inScope =
      (!userId || candidate.userId === userId) &&
      (!organizationId || candidate.organizationId === organizationId);
    const isActive =
      !candidate.revoked && (!onlyActive || candidate.expiresAt > new Date());

    if (
      inScope &&
      isActive &&
      (await bcrypt.compare(refreshToken, candidate.refreshTokenHash))
    ) {
      return candidate;
    }
    return null;
  }

  const legacySessions = await prisma.session.findMany({
    where: { ...activeFilter, ...scope, refreshTokenLookup: null },
  });

  for (const session of legacySessions) {
    if (await bcrypt.compare(refreshToken, session.refreshTokenHash)) {
      return session;
    }
  }
  return null;
}

/**
 * Find an active, non-revoked session for a specific account.
 */
export async function findSession(refreshToken, { userId = null, organizationId = null } = {}) {
  if (!userId && !organizationId) return null;
  return locateSessionByRefreshToken(refreshToken, { userId, organizationId });
}

/**
 * Find a session from a refresh token without knowing the account up front.
 */
export async function findSessionByRefreshToken(refreshToken, { onlyActive = true } = {}) {
  return locateSessionByRefreshToken(refreshToken, { onlyActive });
}

/**
 * Rotate: replace the stored hash with a new one and update lastUsed.
 */
export async function rotateSession(sessionId, newRefreshToken, accessTokenData = {}) {
  const newHash = await bcrypt.hash(newRefreshToken, BCRYPT_ROUNDS);
  return prisma.session.update({
    where: { id: sessionId },
    data: {
      refreshTokenHash: newHash,
      refreshTokenLookup: hashRefreshTokenLookup(newRefreshToken),
      ...(accessTokenData.accessTokenHash
        ? { accessTokenHash: accessTokenData.accessTokenHash }
        : {}),
      ...(accessTokenData.accessTokenExpiresAt
        ? { accessTokenExpiresAt: accessTokenData.accessTokenExpiresAt }
        : {}),
      lastUsed: new Date(),
      expiresAt: sessionExpiresAt(),
    },
  });
}

export async function storeAccessToken(sessionId, { accessTokenHash, accessTokenExpiresAt }) {
  return prisma.session.update({
    where: { id: sessionId },
    data: {
      accessTokenHash,
      accessTokenExpiresAt,
      lastUsed: new Date(),
    },
  });
}

export async function revokeSession(sessionId) {
  return prisma.session.update({
    where: { id: sessionId },
    data: { revoked: true, revokedAt: new Date() },
  });
}

export async function revokeAllSessions({ userId = null, organizationId = null }) {
  if (!userId && !organizationId) return;
  const where = userId ? { userId } : { organizationId };
  await prisma.session.updateMany({
    where: { ...where, revoked: false },
    data: { revoked: true, revokedAt: new Date() },
  });
}

export async function listActiveSessions({ userId = null, organizationId = null }) {
  if (!userId && !organizationId) return [];
  const where = userId ? { userId } : { organizationId };
  return prisma.session.findMany({
    where: { ...where, revoked: false, expiresAt: { gt: new Date() } },
    orderBy: { lastUsed: "desc" },
    select: {
      id: true,
      userAgent: true,
      ipAddress: true,
      createdAt: true,
      lastUsed: true,
      accountType: true,
    },
  });
}

/** Prune sessions that have expired — call periodically or on login. */
export async function cleanExpiredSessions() {
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
