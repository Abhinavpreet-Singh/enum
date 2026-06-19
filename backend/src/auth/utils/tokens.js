import crypto from "crypto";
import jwt from "jsonwebtoken";

const ACCESS_TOKEN_EXPIRY_SECONDS = 10 * 60; // 10 minutes
const REFRESH_TOKEN_BYTES = 48; // 384-bit entropy

export function getAccessTokenExpiryDate() {
  return new Date(Date.now() + ACCESS_TOKEN_EXPIRY_SECONDS * 1000);
}

export function hashAccessToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateAccessToken(payload) {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) throw new Error("ACCESS_TOKEN_SECRET is not set");

  return jwt.sign(
    {
      // Standard claim
      sub: payload.userId,
      // Legacy fields kept so existing verifyJWT callers still work
      _id: payload.userId,
      userId: payload.userId,
      email: payload.email,
      username: payload.username ?? "",
      role: payload.role ?? "Student",
      accountType: payload.accountType,
      accountRole: payload.role ?? "Student",
      sid: payload.sessionId ?? payload.sid,
    },
    secret,
    { expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS },
  );
}

/** Generates a cryptographically random opaque refresh token (not a JWT). */
export function generateRefreshToken() {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
}

/** Verifies an access JWT against both ACCESS_TOKEN_SECRET and JWT_SECRET for compatibility. */
export function verifyAccessToken(token) {
  const secrets = [
    process.env.ACCESS_TOKEN_SECRET,
    process.env.JWT_SECRET,
  ].filter(Boolean);

  if (secrets.length === 0) throw new Error("No JWT secret configured");

  let lastError;
  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

export function extractIdFromToken(decoded) {
  return decoded?.sub || decoded?._id || decoded?.userId || decoded?.id || null;
}
