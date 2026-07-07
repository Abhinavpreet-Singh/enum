import { ApiError } from "../../utils/apiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { verifyAccessToken, extractIdFromToken } from "../utils/tokens.js";
import { assertAccessTokenSession } from "../services/access-token.service.js";
import prisma from "../../db/index.js";
import { isValidId } from "../../utils/isValidId.js";

function getAccessToken(req) {
  const header = req.header("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (match) return { token: match[1].trim(), source: "bearer" };
  // Allow exam desktop app to pass via examToken cookie only
  return req.cookies?.examToken
    ? { token: req.cookies.examToken, source: "exam" }
    : { token: null, source: null };
}

function getUserAccountType(user) {
  return String(user?.role || "Student").toLowerCase() === "admin" ? "admin" : "student";
}

/**
 * Verifies an in-memory (Bearer) access token.
 * Attaches req.user, req.organization, req.accountType.
 * Named "verifyAccessToken" internally but exported for route use.
 */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const { token, source } = getAccessToken(req);
  if (!token) throw new ApiError(401, "Unauthorized request");

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    throw new ApiError(401, "Invalid or expired access token");
  }

  const id = extractIdFromToken(decoded);
  if (!isValidId(id)) {
    throw new ApiError(401, "Invalid access token");
  }

  const accountType = decoded?.accountType || "student";

  if (source === "bearer") {
    await assertAccessTokenSession({ token, decoded });
  }

  if (accountType === "organization") {
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) throw new ApiError(401, "Invalid access token");
    const { password, refreshToken, ...safe } = org;
    req.organization = safe;
    req.user = null;
    req.accountType = "organization";
    return next();
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(401, "Invalid access token");
  const { password, refreshToken, ...safeUser } = user;
  const resolvedType = getUserAccountType(user);
  req.user = safeUser;
  req.organization = null;
  req.accountType = resolvedType;
  req.adminEmail = resolvedType === "admin" ? safeUser.email : null;
  req.admin = resolvedType === "admin"
    ? { id: safeUser.id, email: safeUser.email, name: safeUser.displayName || safeUser.username || "Admin" }
    : null;
  next();
});

export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const { token, source } = getAccessToken(req);
  if (!token) {
    req.user = null;
    req.accountType = null;
    return next();
  }
  try {
    const decoded = verifyAccessToken(token);
    const id = extractIdFromToken(decoded);
    if (!id) { req.user = null; return next(); }

    const accountType = decoded?.accountType || "student";

    if (source === "bearer") {
      await assertAccessTokenSession({ token, decoded });
    }

    if (accountType === "organization") {
      const org = await prisma.organization.findUnique({ where: { id } });
      if (org) {
        const { password, refreshToken, ...safe } = org;
        req.organization = safe;
        req.accountType = "organization";
      } else {
        req.user = null;
      }
      return next();
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) { req.user = null; return next(); }
    const { password, refreshToken, ...safeUser } = user;
    req.user = safeUser;
    req.accountType = getUserAccountType(user);
    next();
  } catch {
    req.user = null;
    req.accountType = null;
    next();
  }
});
