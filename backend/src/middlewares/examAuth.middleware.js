import prisma from "../db/index.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

const verifyAccessToken = (token) => {
  const secrets = [process.env.ACCESS_TOKEN_SECRET, process.env.JWT_SECRET].filter(Boolean);
  if (secrets.length === 0) throw new ApiError(500, "JWT secret not configured");

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

const getExamTokenFromRequest = (req) => {
  const bearer = req.header("Authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (bearer && bearer !== "undefined" && bearer !== "null") return bearer;
  const cookie = req?.cookies?.examToken;
  if (cookie && cookie !== "undefined" && cookie !== "null") return cookie;
  return "";
};

/** Desktop exam routes — only accepts exam-session JWTs, never web/org cookies. */
export const verifyExamJWT = asyncHandler(async (req, _res, next) => {
  const token = getExamTokenFromRequest(req);
  if (!token) {
    throw new ApiError(401, "Exam session token required. Please log in again.");
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    throw new ApiError(401, "Invalid or expired exam session. Please log in again.");
  }

  if (!decoded?.examSession) {
    throw new ApiError(401, "Invalid exam session token. Please log in again.");
  }

  const userId = decoded._id || decoded.userId || decoded.id;
  if (!userId || !OBJECT_ID_RE.test(String(userId))) {
    throw new ApiError(401, "Invalid exam session token.");
  }

  const user = await prisma.user.findUnique({
    where: { id: String(userId) },
    select: { id: true, email: true, username: true, displayName: true },
  });
  if (!user) throw new ApiError(401, "Candidate account not found.");

  req.user = user;
  req.examAssessmentId = decoded.assessmentId || null;
  req.accountType = "user";
  next();
});
