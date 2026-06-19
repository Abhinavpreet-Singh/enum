import bcrypt from "bcrypt";
import prisma from "../../db/index.js";

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
 * Find an active, non-revoked session by comparing the provided plaintext
 * refresh token against stored hashes. Scoped by userId or organizationId
 * for performance (avoids full-collection hash compare).
 */
export async function findSession(refreshToken, { userId = null, organizationId = null } = {}) {
  if (!userId && !organizationId) return null;

  const where = {
    revoked: false,
    expiresAt: { gt: new Date() },
    ...(userId ? { userId } : { organizationId }),
  };

  const sessions = await prisma.session.findMany({ where });

  for (const session of sessions) {
    const match = await bcrypt.compare(refreshToken, session.refreshTokenHash);
    if (match) return session;
  }
  return null;
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
