import prisma from "../db/index.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

const getAccessTokenFromRequest = (req) => {
  const bearer = req.header("Authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (bearer) return bearer;
  // Desktop exam client sets examToken; web app uses accessToken.
  return req?.cookies?.examToken || req?.cookies?.accessToken || "";
};

const verifyAccessToken = (token) => {
  const secrets = [process.env.ACCESS_TOKEN_SECRET, process.env.JWT_SECRET].filter(
    Boolean
  );

  if (secrets.length === 0) {
    throw new ApiError(500, "JWT secret not configured");
  }

  let lastError;
  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError;
};

const getUserAccountType = (user) => {
  const role = String(user?.role || "Student").toLowerCase();
  return role === "admin" ? "admin" : "student";
};

export const verifyJWT = asyncHandler(async (req, res, next) => {
  const token = getAccessTokenFromRequest(req);

  if (!token) {
    throw new ApiError(401, "Unauthorized request");
  }

  let decodedToken;
  try {
    decodedToken = verifyAccessToken(token);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, "Invalid access token");
  }

  const accountType = decodedToken?.accountType || "user";

  const id = decodedToken?._id || decodedToken?.userId || decodedToken?.id;
  if (!id || !/^[a-f\d]{24}$/i.test(String(id))) {
    throw new ApiError(401, "Invalid access token");
  }

  // ── Organization token ──────────────────────────────────────────────────────────
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

// ── Candidate / user gate (desktop exam routes) ─────────────────────────────
export const requireUser = (req, _res, next) => {
  if (!req.user?.id) {
    throw new ApiError(401, "Candidate authentication required.");
  }
  next();
};

// ── Role gate ────────────────────────────────────────────────────────────────
// Usage: requireRole("organization")
export const requireRole = (...roles) => {
  return (req, _res, next) => {
    if (!roles.includes(req.accountType)) {
      throw new ApiError(403, "Access denied. Insufficient role.");
    }
    next();
  };
};

// ── Approval gate (organization must be approved) ─────────────────────────────────
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
    if (!token) {
      req.user = null;
      req.accountType = null;
      return next();
    }

    const decodedToken = verifyAccessToken(token);
    const id = decodedToken?._id || decodedToken?.userId || decodedToken?.id;
    if (!id) {
      req.user = null;
      return next();
    }

    const accountType = decodedToken?.accountType || "user";

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
