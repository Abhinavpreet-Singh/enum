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

  const userId = decodedToken?._id || decodedToken?.userId || decodedToken?.id;
  if (!userId) {
    throw new ApiError(401, "Invalid access token");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(401, "Invalid access token");
  }

  const { password, refreshToken, ...safeUser } = user;
  req.user = safeUser;
  next();
});

// Optional authentication - doesn't require valid token
export const optionalAuth = asyncHandler(async (req, res, next) => {
  try {
    const token = getAccessTokenFromRequest(req);

    if (!token) {
      req.user = null;
      return next();
    }

    const decodedToken = verifyAccessToken(token);
    const userId = decodedToken?._id || decodedToken?.userId || decodedToken?.id;
    if (!userId) {
      req.user = null;
      return next();
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      req.user = null;
      return next();
    }

    const { password, refreshToken, ...safeUser } = user;
    req.user = safeUser;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
});
