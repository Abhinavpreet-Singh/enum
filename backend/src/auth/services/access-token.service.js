import { ApiError } from "../../utils/apiError.js";
import prisma from "../../db/index.js";
import { hashAccessToken } from "../utils/tokens.js";
import { isValidId } from "../../utils/isValidId.js";

export async function assertAccessTokenSession({ token, decoded }) {
  const sessionId = decoded?.sid || decoded?.sessionId;

  if (!isValidId(sessionId)) {
    throw new ApiError(401, "Access token session is missing.");
  }

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  const now = new Date();

  if (
    !session ||
    session.revoked ||
    session.expiresAt <= now ||
    !session.accessTokenHash ||
    !session.accessTokenExpiresAt ||
    session.accessTokenExpiresAt <= now
  ) {
    throw new ApiError(401, "Access token session expired.");
  }

  if (session.accessTokenHash !== hashAccessToken(token)) {
    throw new ApiError(401, "Access token does not match active session.");
  }

  const tokenAccountType = decoded?.accountType || "student";
  const tokenAccountId = decoded?.sub || decoded?._id || decoded?.userId || decoded?.id;

  if (tokenAccountType === "organization") {
    if (session.organizationId !== tokenAccountId) {
      throw new ApiError(401, "Access token session account mismatch.");
    }
  } else if (session.userId !== tokenAccountId) {
    throw new ApiError(401, "Access token session account mismatch.");
  }

  return session;
}
