/**
 * auth.middleware.js
 *
 * Re-exports from the new verifyAccessToken module while preserving all
 * existing named exports so every protected route continues to work unchanged.
 */
import prisma from "../db/index.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verifyAccessToken as verifyJwtToken, extractIdFromToken } from "../auth/utils/tokens.js";
import { assertAccessTokenSession } from "../auth/services/access-token.service.js";

// ─── Token extraction ─────────────────────────────────────────────────────────

const getAccessTokenFromRequest = (req) => {
  const bearer = req.header("Authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (bearer) return { token: bearer, source: "bearer" };
  // Desktop exam client uses examToken cookie — preserve that path.
  // The old accessToken cookie is no longer issued but accept it for a grace period.
  if (req?.cookies?.examToken) return { token: req.cookies.examToken, source: "exam" };
  if (req?.cookies?.accessToken) return { token: req.cookies.accessToken, source: "access-cookie" };
  return { token: "", source: null };
};

// ─── Internal verify helper ───────────────────────────────────────────────────

const _verifyToken = (token) => {
  try {
    return verifyJwtToken(token);
  } catch (err) {
    throw err;
  }
};

const getUserAccountType = (user) => {
  const role = String(user?.role || "Student").toLowerCase();
  return role === "admin" ? "admin" : "student";
};

// ─── verifyJWT ────────────────────────────────────────────────────────────────

export const verifyJWT = asyncHandler(async (req, res, next) => {
  const { token, source } = getAccessTokenFromRequest(req);

  if (!token) {
    throw new ApiError(401, "Unauthorized request");
  }

  let decodedToken;
  try {
    decodedToken = _verifyToken(token);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, "Invalid access token");
  }

  const accountType = decodedToken?.accountType || "user";
  const id = extractIdFromToken(decodedToken);

  if (!id || !/^[a-f\d]{24}$/i.test(String(id))) {
    throw new ApiError(401, "Invalid access token");
  }

  if (source === "bearer" || source === "access-cookie") {
    await assertAccessTokenSession({ token, decoded: decodedToken });
  }

  // ── Organization token ─────────────────────────────────────────────────────
  if (accountType === "organization") {
    const organization = await prisma.organization.findUnique({ where: { id } });
    if (!organization) throw new ApiError(401, "Invalid access token");
    const { password, refreshToken, ...safe } = organization;
    req.organization = safe;
    req.user = null;
    req.accountType = "organization";
    return next();
  }

  // ── User token (default) ───────────────────────────────────────────────────
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(401, "Invalid access token");
  const { password, refreshToken, ...safeUser } = user;
  const userAccountType = getUserAccountType(user);
  req.user = safeUser;
  req.organization = null;
  req.accountType = userAccountType;
  req.adminEmail = userAccountType === "admin" ? safeUser.email : null;
  req.admin =
    userAccountType === "admin"
      ? {
          id: safeUser.id,
          email: safeUser.email,
          name: safeUser.displayName || safeUser.username || "Admin",
        }
      : null;
  next();
});

// ── Candidate / user gate (desktop exam routes) ──────────────────────────────
export const requireUser = (req, _res, next) => {
  if (!req.user?.id) {
    throw new ApiError(401, "Candidate authentication required.");
  }
  next();
};

// ── Role gate ─────────────────────────────────────────────────────────────────
export const requireRole = (...roles) => {
  return (req, _res, next) => {
    if (!roles.includes(req.accountType)) {
      throw new ApiError(403, "Access denied. Insufficient role.");
    }
    next();
  };
};

// ── Approval gate ─────────────────────────────────────────────────────────────
export const requireApproved = (req, _res, next) => {
  if (req.accountType === "organization") {
    if (req.organization?.approvalStatus !== "approved") {
      throw new ApiError(403, "Your organization account is awaiting approval.");
    }
  }
  next();
};

export const optionalAuth = asyncHandler(async (req, _res, next) => {
  try {
    const token = getAccessTokenFromRequest(req);
    if (!token.token) {
      req.user = null;
      req.accountType = null;
      return next();
    }

    const decodedToken = _verifyToken(token.token);
    const id = extractIdFromToken(decodedToken);
    if (!id) {
      req.user = null;
      return next();
    }

    const accountType = decodedToken?.accountType || "user";

    if (token.source === "bearer" || token.source === "access-cookie") {
      await assertAccessTokenSession({ token: token.token, decoded: decodedToken });
    }

    if (accountType === "organization") {
      const organization = await prisma.organization.findUnique({ where: { id } });
      if (organization) {
        const { password, refreshToken, ...safe } = organization;
        req.organization = safe;
        req.accountType = "organization";
      } else {
        req.user = null;
      }
      return next();
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      req.user = null;
      return next();
    }

    const { password, refreshToken, ...safeUser } = user;
    req.user = safeUser;
    req.accountType = getUserAccountType(user);
    next();
  } catch (error) {
    req.user = null;
    req.accountType = null;
    next();
  }
});
