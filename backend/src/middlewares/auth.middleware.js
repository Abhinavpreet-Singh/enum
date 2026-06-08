import prisma from "../db/index.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

const getAccessTokenFromRequest = (req) =>
  req?.cookies?.accessToken ||
  req.header("Authorization")?.replace("Bearer ", "");

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

export const verifyJWT = asyncHandler(async (req, res, next) => {
  const token = getAccessTokenFromRequest(req);

  if (!token) {
    throw new ApiError(401, "Unauthorized request");
  }

  let decodedToken;
  try {
    decodedToken = verifyAccessToken(token);
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(401, "Invalid access token");
  }

  const id = decodedToken?._id || decodedToken?.userId || decodedToken?.id;
  if (!id) {
    throw new ApiError(401, "Invalid access token");
  }

  const accountType = decodedToken?.accountType || "user";

  // ── Company token ──────────────────────────────────────────────────────────
  if (accountType === "company") {
    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) throw new ApiError(401, "Invalid access token");
    const { password, refreshToken, ...safe } = company;
    req.company = safe;
    req.user = null;
    req.college = null;
    req.accountType = "company";
    return next();
  }

  // ── College token ──────────────────────────────────────────────────────────
  if (accountType === "college") {
    const college = await prisma.college.findUnique({ where: { id } });
    if (!college) throw new ApiError(401, "Invalid access token");
    const { password, refreshToken, ...safe } = college;
    req.college = safe;
    req.user = null;
    req.company = null;
    req.accountType = "college";
    return next();
  }

  // ── User token (default) ───────────────────────────────────────────────────
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(401, "Invalid access token");
  const { password, refreshToken, ...safeUser } = user;
  req.user = safeUser;
  req.company = null;
  req.college = null;
  req.accountType = "user";
  next();
});

// ── Role gate ────────────────────────────────────────────────────────────────
// Usage: requireRole("company")  or  requireRole("company", "college")
export const requireRole = (...roles) => {
  return (req, _res, next) => {
    if (!roles.includes(req.accountType)) {
      throw new ApiError(403, "Access denied. Insufficient role.");
    }
    next();
  };
};

// ── Approval gate (company / college must be approved) ───────────────────────
export const requireApproved = (req, _res, next) => {
  if (req.accountType === "company") {
    if (req.company?.approvalStatus !== "approved") {
      throw new ApiError(403, "Your company account is pending approval.");
    }
  }
  if (req.accountType === "college") {
    if (req.college?.approvalStatus !== "approved") {
      throw new ApiError(403, "Your college account is pending approval.");
    }
  }
  next();
};

// Optional authentication - doesn't require valid token
export const optionalAuth = asyncHandler(async (req, res, next) => {
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

    if (accountType === "company") {
      const company = await prisma.company.findUnique({ where: { id } });
      if (company) {
        const { password, refreshToken, ...safe } = company;
        req.company = safe;
        req.accountType = "company";
      } else {
        req.user = null;
      }
      return next();
    }

    if (accountType === "college") {
      const college = await prisma.college.findUnique({ where: { id } });
      if (college) {
        const { password, refreshToken, ...safe } = college;
        req.college = safe;
        req.accountType = "college";
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
    req.accountType = "user";
    next();
  } catch (error) {
    req.user = null;
    req.accountType = null;
    next();
  }
});
